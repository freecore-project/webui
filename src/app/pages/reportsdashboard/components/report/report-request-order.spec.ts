import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CoreEvent, CoreService } from '../../../../core/services/core.service';
import { CoreServiceInjector } from '../../../../core/services/coreserviceinjector';
import { ThemeService } from '../../../../services/theme/theme.service';
import { ReportsService } from '../../reports.service';
import { configureReportingFixtures, reportData, settleReports } from '../../reportsdashboard-testing';
import { ReportComponent, ReportData } from './report.component';

// #440: real report/template and Core dispatch with independently deferred
// server time and export completion. The companion service spec uses the real worker.
describe('Reporting latest period intent (#440)', () => {
  let fixture: ComponentFixture<ReportComponent>;
  let core: CoreService;
  let requests: CoreEvent[];
  let times: Subject<Date>[];
  let deferTime: boolean;
  let deferResults: boolean;
  let timeCalls: number;
  let backend: Awaited<ReturnType<typeof configureReportingFixtures>>;
  const now = new Date('2026-09-20T12:00:00Z');
  const theme = { fg2: '#97a6ae', accentColors: ['blue'], blue: '#408aca' };
  const serverTime = () => new Date(now.getTime());

  function complete(request: CoreEvent, result?: any): void {
    const range = request.data.timeFrame;
    const samples: ReportData = {
      ...reportData(1), name: request.data.params.name,
      start: range.start, end: range.end,
      legend: [`period-${request.data.requestId}`],
    };
    core.emit({ name: 'ReportData-' + request.sender.chartId, data: {
      requestId: request.data.requestId, result: result || samples,
    } });
  }

  function click(label: string): void {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[aria-label="${label}"]`).click();
    fixture.detectChanges();
  }

  function resolveTime(index: number): void {
    times[index].next(serverTime());
    times[index].complete();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    const originalInjector = CoreServiceInjector.get.bind(CoreServiceInjector);
    backend = await configureReportingFixtures();
    core = new CoreService();
    TestBed.overrideProvider(CoreService, { useValue: core });
    (CoreServiceInjector.get as jasmine.Spy).and.callFake((token: any) => {
      if (token === CoreService) { return core; }
      if (token === ThemeService) { return { currentTheme: () => theme }; }
      return originalInjector(token);
    });
    requests = [];
    times = [];
    deferTime = false;
    deferResults = false;
    timeCalls = 0;
    TestBed.overrideProvider(ReportsService, { useValue: {
      getServerTime: () => {
        timeCalls++;
        if (!deferTime) { return of(serverTime()); }
        const time = new Subject<Date>();
        times.push(time);
        return time;
      },
    } });
    const transport = {};
    core.register({ observerClass: transport, eventName: 'ThemeDataRequest' }).subscribe(() => {
      core.emit({ name: 'ThemeData', data: theme });
    });
    core.register({ observerClass: transport, eventName: 'ReportDataRequest' }).subscribe((request) => {
      requests.push(request);
      if (!deferResults) { complete(request); }
    });
    fixture = TestBed.createComponent(ReportComponent);
    fixture.nativeElement.classList.add('fc-ui');
    fixture.nativeElement.style.cssText = 'position:fixed;top:0;left:0;width:1100px;height:344px';
    (fixture.componentInstance as any).delay = 0;
    fixture.componentRef.setInput('report', { name: 'cpu', title: 'CPU usage', vertical_label: '% CPU', identifiers: [] });
    fixture.detectChanges();
    await settleReports();
    await settle();
    requests.length = 0;
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('does not dispatch an obsolete period when its server-time lookup finishes last', async () => {
    deferTime = true;
    const zoomOut = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Zoom out"]');
    zoomOut.click(); // 24 hours
    fixture.detectChanges();
    zoomOut.click(); // seven days
    fixture.detectChanges();
    expect(times.length).toBe(2);
    expect(fixture.componentInstance.timeZoomIndex).toBe(2);

    const now = serverTime();
    times[1].next(now);
    times[1].complete();
    await settle();
    expect(requests.length).toBe(1);
    const latestRequest = requests[0];
    const latestRange = [fixture.componentInstance.currentStartDate, fixture.componentInstance.currentEndDate];

    times[0].next(now);
    times[0].complete();
    await settle();
    expect(requests).withContext('the superseded 24-hour intent must never reach reporting.get_data').toEqual([latestRequest]);
    expect([fixture.componentInstance.currentStartDate, fixture.componentInstance.currentEndDate])
      .withContext('a late time response must not restore the old period labels').toEqual(latestRange);
    expect(fixture.componentInstance.timeZoomIndex).toBe(2);
  });

  it('uses one initial time lookup for both its range and sample request', () => {
    expect(timeCalls).toBe(1);
    expect(fixture.componentInstance.currentEndDate).toBe(now.getTime());
    expect(fixture.componentInstance.data.end).toBe(now.getTime() / 1000);
    expect(fixture.nativeElement.querySelector('.report-range').textContent)
      .toContain(fixture.componentInstance.endTime);
  });

  it('keeps only the latest period visible when exports complete in reverse order', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    const older = requests[0];
    click('Zoom out');
    await settle();
    const latest = requests[1];
    const range = [fixture.componentInstance.currentStartDate, fixture.componentInstance.currentEndDate];
    complete(latest);
    await settle();
    const data = fixture.componentInstance.data;
    complete(older);
    await settle();
    expect(fixture.componentInstance.data).toBe(data);
    expect([fixture.componentInstance.currentStartDate, fixture.componentInstance.currentEndDate]).toEqual(range);
    expect(fixture.nativeElement.querySelector('.legend-table').textContent).toContain(`period-${latest.data.requestId}`);
    expect(fixture.nativeElement.querySelector('.legend-table').textContent).not.toContain(`period-${older.data.requestId}`);
    expect(fixture.nativeElement.querySelector('.report-range').textContent).toContain(fixture.componentInstance.startTime);
    expect(fixture.componentInstance.data.start * 1000).toBe(range[0]);
  });

  it('does not let an old success or failure settle a newer unresolved time lookup', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    const older = requests[0];
    deferTime = true;
    click('Zoom out');
    const previous = fixture.componentInstance.data;
    complete(older);
    complete(older, { name: 'FetchingError', data: { error: 206, reason: 'Old database error' } });
    await settle();
    expect(fixture.componentInstance.data).toBe(previous);
    expect(fixture.componentInstance.requestLoading).toBeTrue();
    expect(fixture.componentInstance.reportError).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.report-state').textContent).toContain('Loading report');
    expect(fixture.nativeElement.querySelector('.report-range')).toBeNull();
    resolveTime(0);
    await settle();
    complete(requests[1]);
    await settle();
    expect(fixture.componentInstance.requestLoading).toBeFalse();
  });

  it('ignores obsolete export and database-repair errors after a newer success', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    const older = requests[0];
    click('Zoom out');
    await settle();
    complete(requests[1]);
    await settle();
    const data = fixture.componentInstance.data;
    for (const error of [22, 206]) {
      complete(older, { name: 'FetchingError', data: { error, reason: 'Superseded export' } });
      await settle();
      expect(fixture.componentInstance.data).toBe(data);
      expect(fixture.componentInstance.reportError).toBeUndefined();
      expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
      expect(fixture.nativeElement.querySelector('.report-state button')).toBeNull();
    }
    expect(backend.dialog.confirm).not.toHaveBeenCalled();
    expect(backend.ws.call).not.toHaveBeenCalledWith('reporting.clear');
  });

  it('hides old samples, range and hover while pending without changing the report slot', async () => {
    deferResults = true;
    for (const [layout, width, height] of [['wide', 1100, 344], ['compact', 358, 600]] as const) {
      fixture.componentRef.setInput('layout', layout);
      fixture.nativeElement.style.width = `${width}px`;
      fixture.nativeElement.style.height = `${height}px`;
      core.emit({ name: 'LegendEvent-' + fixture.componentInstance.chartId, data: {
        xHTML: '2026-09-20 10:00:00', series: [{ yHTML: 'old hover' }],
      } });
      click('Zoom out');
      await settle();
      expect(fixture.nativeElement.querySelector('.report-state').textContent).toContain('Loading report');
      expect(fixture.nativeElement.querySelector('linechart')).toBeNull();
      expect(fixture.nativeElement.querySelector('.report-range')).toBeNull();
      expect(fixture.nativeElement.querySelector('.legend-time')).toBeNull();
      expect(fixture.nativeElement.querySelector('.report').getBoundingClientRect().height).toBe(height);
      complete(requests[requests.length - 1]);
      await settle();
      expect(fixture.nativeElement.querySelector('linechart')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.report-range')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('old hover');
    }
  });

  it('shows a current export error and recovers on a subsequent successful period', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    complete(requests[0], { name: 'FetchingError', data: { error: 22, reason: 'Current export failed' } });
    await settle();
    expect(fixture.componentInstance.requestLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).not.toBeNull();
    click('Zoom out');
    await settle();
    complete(requests[1]);
    await settle();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('linechart')).not.toBeNull();
  });

  it('settles failed, empty and invalid time lookups without requests or stale period captions', async () => {
    deferTime = true;
    click('Zoom out');
    times[0].error(new Error('Time unavailable'));
    await settle();
    expect(requests.length).toBe(0);
    expect(fixture.componentInstance.requestLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.report-range')).toBeNull();
    click('Zoom out');
    times[1].complete();
    await settle();
    expect(requests.length).toBe(0);
    expect(fixture.componentInstance.requestLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.report-range')).toBeNull();
    click('Zoom out');
    times[2].next(new Date(NaN));
    await settle();
    expect(requests.length).toBe(0);
    expect(fixture.componentInstance.requestLoading).toBeFalse();
    click('Zoom out');
    resolveTime(3);
    await settle();
    expect(requests.length).toBe(1);
    expect(fixture.nativeElement.querySelector('linechart')).not.toBeNull();
  });

  it('locks relative controls only until their intended cursor resolves, then steps from that cursor', async () => {
    deferTime = true;
    deferResults = true;
    const originalStart = fixture.componentInstance.currentStartDate;
    click('Previous period');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Previous period"]').disabled).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Next period"]').disabled).toBeTrue();
    click('Previous period');
    expect(times.length).toBe(1);
    resolveTime(0);
    await settle();
    expect(fixture.componentInstance.currentEndDate).toBe(originalStart);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Previous period"]').disabled).toBeFalse();
    expect(fixture.componentInstance.requestLoading).toBeTrue();
    click('Previous period');
    resolveTime(1);
    await settle();
    expect(fixture.componentInstance.currentEndDate).toBe(originalStart - 3_600_000);
    complete(requests[1]);
    complete(requests[0]);
    await settle();
    expect(fixture.componentInstance.data.end * 1000).toBe(originalStart - 3_600_000);
  });

  it('invalidates unresolved time and in-flight exports when the view is destroyed', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    const request = requests[0];
    deferTime = true;
    click('Zoom out');
    const component = fixture.componentInstance;
    const data = component.data;
    const range = [component.currentStartDate, component.currentEndDate];
    fixture.destroy();
    resolveTime(0);
    complete(request, { name: 'FetchingError', data: { error: 206 } });
    await Promise.resolve();
    await Promise.resolve();
    expect(requests.length).toBe(1);
    expect(component.data).toBe(data);
    expect(component.reportError).toBeUndefined();
    expect([component.currentStartDate, component.currentEndDate]).toEqual(range);
  });

  it('ignores an old time lookup failure after the latest intent succeeds', async () => {
    deferTime = true;
    click('Zoom out');
    click('Zoom out');
    resolveTime(1);
    await settle();
    const data = fixture.componentInstance.data;
    times[0].error(new Error('Obsolete time failure'));
    await settle();
    expect(requests.length).toBe(1);
    expect(fixture.componentInstance.data).toBe(data);
    expect(fixture.componentInstance.requestLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
  });

  it('does not erase report-provided unavailable metadata when a request settles', async () => {
    deferResults = true;
    click('Zoom out');
    await settle();
    const externalError = {
      title: 'Report is unavailable', message: 'External report metadata',
      button: { text: 'Inspect', click: jasmine.createSpy('inspect') },
    };
    fixture.componentInstance.report.error = externalError;
    complete(requests[0]);
    await settle();
    expect(fixture.componentInstance.report.error).toBe(externalError);
    expect(fixture.componentInstance.reportError).toBe(externalError);
    expect(fixture.nativeElement.querySelector('.report-state').textContent).toContain(externalError.title);
  });

  it('does not start the delayed initial request after destruction', fakeAsync(() => {
    fixture.destroy();
    const before = timeCalls;
    fixture = TestBed.createComponent(ReportComponent);
    fixture.componentRef.setInput('report', { name: 'cpu', title: 'CPU usage', vertical_label: '% CPU', identifiers: [] });
    fixture.detectChanges();
    fixture.destroy();
    tick(1100);
    expect(timeCalls).toBe(before);
    expect(requests.length).toBe(0);
  }));
});
