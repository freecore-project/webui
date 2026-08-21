import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CoreEvent, CoreService } from '../../core/services/core.service';
import { CoreServiceInjector } from '../../core/services/coreserviceinjector';
import { ThemeService } from '../../services/theme/theme.service';
import { Report, ReportComponent, ReportData } from './components/report/report.component';
import { ReportsDashboardComponent } from './reportsdashboard.component';
import { configureReportingFixtures, reportData, settleReports } from './reportsdashboard-testing';

// Real page/CDK/Report/Dygraph views and the real CoreService dispatch table.
// Only request completion is controlled, including responses after a view leaves.
describe('Reporting virtual report identity isolation (#430)', () => {
  let fixture: ComponentFixture<ReportsDashboardComponent>;
  let shell: HTMLElement;
  let core: CoreService;
  let unregister: jasmine.Spy;
  let requests: CoreEvent[];
  let pending: Set<string>;

  const theme = { fg2: '#97a6ae', accentColors: ['blue'], blue: '#408aca' };
  const reports = (): ReportComponent[] => fixture.debugElement.queryAll(By.directive(ReportComponent))
    .map((element) => element.componentInstance as ReportComponent);
  const reportFor = (identifier: string): ReportComponent => reports().find((report) => report.identifier === identifier);

  function sample(name: string, identifier: string): ReportData {
    const value = identifier.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return {
      ...reportData(1), name, identifier, legend: [`${identifier} sample`],
      data: [[value], [value + 1]] as any,
      aggregations: { min: [value], mean: [value + 0.5], max: [value + 1] },
    };
  }

  function responseFor(request: CoreEvent): ReportData {
    const { name, identifier } = request.data.params;
    if (identifier === 'demand_metadata') {
      return { name: 'FetchingError', data: { error: 22, reason: 'Cannot export demand_metadata' } } as any;
    }
    return sample(name, identifier);
  }

  function complete(request: CoreEvent, data = responseFor(request)): void {
    // Match ReportsService's response envelope, retaining the originating intent.
    core.emit({ name: 'ReportData-' + request.sender.chartId, data: { requestId: request.data.requestId, result: data } });
  }

  async function settle(delay = 80): Promise<void> {
    fixture.detectChanges();
    await settleReports(delay);
    fixture.detectChanges();
  }

  async function renderReady(): Promise<void> {
    await settle(1100); // production delayed render, not a replaced lifecycle
    await settle();
  }

  function assertOwnData(): void {
    expect(reports().length).toBeGreaterThan(0);
    for (const component of reports()) {
      expect(component.ready).withContext(component.identifier).toBeTrue();
      if (component.identifier === 'demand_metadata') {
        expect(component.plotDataError).toBeTrue();
        expect((component.data.data as any).reason).toContain('demand_metadata');
      } else {
        expect(component.plotDataError).withContext(component.identifier).toBeFalse();
        expect(component.data?.identifier).withContext(component.identifier).toBe(component.identifier);
        expect(component.data?.legend).toEqual([`${component.identifier} sample`]);
        expect(component.data?.data).toEqual(sample(component.report.name, component.identifier).data);
      }
    }
  }

  beforeEach(async () => {
    const originalInjector = CoreServiceInjector.get.bind(CoreServiceInjector);
    await configureReportingFixtures();
    core = new CoreService();
    unregister = spyOn(core, 'unregister').and.callThrough();
    TestBed.overrideProvider(CoreService, { useValue: core });
    (CoreServiceInjector.get as jasmine.Spy).and.callFake((token: any) => {
      if (token === CoreService) { return core; }
      if (token === ThemeService) { return { currentTheme: () => theme }; }
      return originalInjector(token);
    });
    requests = [];
    pending = new Set();
    const backend = {};
    core.register({ observerClass: backend, eventName: 'ThemeDataRequest' }).subscribe(() => {
      core.emit({ name: 'ThemeData', data: theme });
    });
    core.register({ observerClass: backend, eventName: 'ReportDataRequest' }).subscribe((request) => {
      requests.push(request);
      if (!pending.has(request.data.params.identifier)) { complete(request); }
    });
    shell = document.createElement('div');
    shell.className = 'fc-ui rightside-content-hold';
    shell.style.cssText = 'position:fixed; top:0; left:0; width:1200px; height:420px; overflow:auto';
    document.body.appendChild(shell);
    fixture = TestBed.createComponent(ReportsDashboardComponent);
    shell.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    fixture.componentInstance.activeTabVerified = true;
  });

  afterEach(() => {
    fixture.destroy();
    shell.remove();
    TestBed.resetTestingModule();
  });

  it('keeps same-title identifier samples and export errors separate through CDK scrolling and width changes', async () => {
    const page = fixture.componentInstance;
    const identifiers = ['demand_data', 'demand_metadata', 'prefetch_data', 'prefetch_metadata',
      ...Array.from({ length: 10 }, (_, i) => `extra_${i}`)];
    page.activeReports = identifiers.map((identifier): Report => ({
      name: 'arcresult', title: 'ARC cache result', vertical_label: 'Requests', identifiers: [identifier],
    }));
    page.visibleReports = page.activeReports.map((_, index) => index);
    await renderReady();
    assertOwnData();
    const first = reports()[0];
    const firstId = first.chartId;

    // A default CDK cache can reuse the ready demand_metadata view for a
    // different identifier here. All reports intentionally share one title.
    for (const index of [3, 8, 0, 3]) {
      shell.scrollTop = page.viewport.measureViewportOffset() + index * page.reportItemSize;
      await settle();
      await renderReady();
      assertOwnData();
    }
    expect(unregister).toHaveBeenCalledWith({ observerClass: first });
    const current = reportFor('prefetch_metadata');
    expect(current).toBeDefined();
    expect(current.chartId).not.toBe(firstId);
    const currentId = current.chartId;
    const currentRequests = requests.filter((request) => request.sender === current).length;
    current.timeZoomIndex = 2;
    const currentData = current.data;
    const currentRange = [current.currentStartDate, current.currentEndDate];

    // Relayout retains the same report, data and requested time range.
    // Dygraph may clear its transient hover highlight when it redraws.
    const logicalOffset = page.viewport.measureScrollOffset() / page.reportItemSize;
    for (const width of [700, 390, 1000, 900, 700, 1000]) {
      shell.style.width = `${width}px`;
      await settle();
      await settle();
      expect(reportFor('prefetch_metadata')).withContext(`${width}px`).toBe(current);
      expect(current.chartId).toBe(currentId);
      expect(current.timeZoomIndex).toBe(2);
      expect(current.data).toBe(currentData);
      expect([current.currentStartDate, current.currentEndDate]).toEqual(currentRange);
      expect(requests.filter((request) => request.sender === current).length).toBe(currentRequests);
      expect(Math.abs(page.viewport.measureScrollOffset() / page.reportItemSize - logicalOffset)).toBeLessThan(0.1);
    }

    // The next slot size can require an offset beyond the old total height.
    // Browser clamping must not briefly recycle the last visible report either.
    shell.scrollTop = shell.scrollHeight;
    await settle();
    await renderReady();
    const lastIdentifier = identifiers[identifiers.length - 1];
    const last = reportFor(lastIdentifier);
    expect(last).toBeDefined();
    last.timeZoomIndex = 1;
    const lastData = last.data;
    const lastId = last.chartId;
    const lastRange = [last.currentStartDate, last.currentEndDate];
    const lastRequests = requests.filter((request) => request.sender === last).length;
    for (const width of [700, 390, 1000, 390, 700, 1000]) {
      const oldLogicalOffset = page.viewport.measureScrollOffset() / page.reportItemSize;
      shell.style.width = `${width}px`;
      await settle();
      await settle();
      expect(reportFor(lastIdentifier)).withContext(`last report ${width}px`).toBe(last);
      expect(last.chartId).toBe(lastId);
      expect(last.timeZoomIndex).toBe(1);
      expect(last.data).toBe(lastData);
      expect([last.currentStartDate, last.currentEndDate]).toEqual(lastRange);
      expect(requests.filter((request) => request.sender === last).length).toBe(lastRequests);
      const maximumOffset = Math.max(0, shell.scrollHeight - shell.clientHeight - page.viewport.measureViewportOffset());
      expect(Math.abs(page.viewport.measureScrollOffset() - Math.min(oldLogicalOffset * page.reportItemSize, maximumOffset)))
        .withContext(`clamped logical offset ${width}px`).toBeLessThanOrEqual(1);
      shell.scrollTop = shell.scrollHeight;
      await settle();
      const lastRow = fixture.nativeElement.querySelector('.report-container:last-child') as HTMLElement;
      expect(lastRow.textContent).toContain(lastIdentifier);
      expect(lastRow.getBoundingClientRect().bottom)
        .toBeLessThanOrEqual(shell.getBoundingClientRect().bottom + 1);
    }
  }, 15000); // This exercises five real one-second render delays.

  it('retains the last-report anchor when responsive shell padding clamps scrolling before the resize callback', async () => {
    const page = fixture.componentInstance;
    // Match the production shell/footer and the max-width:700px padding/title
    // transition. Changing only the fixture width cannot exercise that media rule.
    const frame = document.createElement('div');
    frame.className = 'fc-ui';
    document.body.appendChild(frame);
    frame.appendChild(shell);
    shell.classList.remove('fc-ui');
    shell.style.width = '1064px'; // 1000px content + desktop horizontal padding
    shell.style.height = '810px';
    shell.style.boxSizing = 'border-box';
    shell.style.setProperty('padding', '18px 32px 20px', 'important');
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    heading.style.fontSize = '27px';
    heading.style.marginBottom = '30px';
    const footer = document.createElement('footer');
    footer.className = 'fc-project-footer';
    footer.textContent = 'Documentation';
    shell.appendChild(footer);
    try {
      page.activeReports = Array.from({ length: 6 }, (_, index): Report => ({
        name: 'cpu', title: `CPU ${index}`, vertical_label: '% CPU', identifiers: [`anchor-${index}`],
      }));
      page.visibleReports = page.activeReports.map((_, index) => index);
      await renderReady();
      shell.scrollTop = shell.scrollHeight;
      await settle();
      await renderReady();
      const last = reportFor('anchor-5');
      expect(last).toBeDefined();
      const data = last.data;
      const channel = last.chartId;
      const requestCount = requests.filter((request) => request.sender === last).length;
      const oldOffset = shell.scrollTop;
      const oldOrigin = page.viewport.measureViewportOffset();
      const oldSize = page.reportItemSize;
      expect(oldSize).toBe(344);
      expect(oldOffset).toBe(shell.scrollHeight - shell.clientHeight);

      shell.style.width = '700px';
      shell.style.setProperty('padding', '12px 16px 18px', 'important');
      heading.style.fontSize = '24px';
      heading.style.marginBottom = '22px';
      // Force native reflow before the observer/rAF. The old spacer is still
      // 6*344px and the shorter shell chrome clamps the real browser scrollTop.
      expect(page.reportItemSize).toBe(oldSize);
      expect(oldOffset - shell.scrollTop).toBeGreaterThanOrEqual(18);
      await settle();
      await settle();
      const expected = page.viewport.measureViewportOffset() + (oldOffset - oldOrigin) / oldSize * 484;
      expect(page.reportItemSize).toBe(484);
      expect(expected).toBeLessThan(shell.scrollHeight - shell.clientHeight);
      expect(Math.abs(shell.scrollTop - expected)).withContext('use the pre-clamp anchor').toBeLessThanOrEqual(1);
      expect(reportFor('anchor-5')).toBe(last);
      expect(last.chartId).toBe(channel);
      expect(last.data).toBe(data);
      expect(requests.filter((request) => request.sender === last).length).toBe(requestCount);
      expect(unregister).not.toHaveBeenCalledWith({ observerClass: last });
    } finally {
      document.body.appendChild(shell);
      frame.remove();
    }
  });

  it('replaces a Disk device at the same visible position and ignores the removed view’s delayed response', async () => {
    const page = fixture.componentInstance;
    page.activeTab = 'Disk';
    page.disksWithNoTempGraphs = {};
    page.activeReports = ['ada0', 'ada1'].map((identifier): Report => ({
      name: 'disk', title: 'Disk operations', vertical_label: 'Operations/s', identifiers: [identifier],
    }));
    pending.add('ada0');
    page.buildDiskReport('ada0', 'disk');
    await renderReady();
    const oldView = reportFor('ada0');
    expect(oldView).toBeDefined();
    const oldRequest = requests.find((request) => request.sender === oldView);
    expect(oldRequest).toBeDefined();

    page.buildDiskReport('ada1', 'disk');
    await renderReady();
    expect(reports().length).toBe(1);
    const newView = reportFor('ada1');
    expect(newView).toBeDefined();
    expect(newView).not.toBe(oldView);
    expect(newView.chartId).not.toBe(oldView.chartId);
    expect(unregister).toHaveBeenCalledWith({ observerClass: oldView });
    assertOwnData();
    const newData = newView.data;
    complete(oldRequest, { name: 'FetchingError', data: { error: 22, reason: 'Late ada0 error' } } as any);
    await settle();
    expect(newView.data).toBe(newData);
    expect(newView.plotDataError).toBeFalse();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
    complete(oldRequest, sample('disk', 'ada0'));
    await settle();
    expect(newView.data).toBe(newData);
    expect(newView.data.identifier).toBe('ada1');
  });

  it('replaces the report behind an unchanged numeric key instead of retaining its old response channel', async () => {
    const page = fixture.componentInstance;
    page.activeTab = 'Disk';
    page.activeReports = [{ name: 'disk', title: 'Disk operations', vertical_label: 'Operations/s', identifiers: ['ada0'] }];
    page.visibleReports = [0];
    pending.add('ada0');
    await renderReady();
    const oldView = reportFor('ada0');
    const oldRequest = requests.find((request) => request.sender === oldView);
    expect(oldRequest).toBeDefined();
    const oldId = oldView.chartId;
    const numericKeys = [...page.visibleReports];

    // A refreshed report inventory can put another device behind the same
    // numeric key. Publish the refreshed list as activateTab/buildDiskReport
    // do, but keep every numeric item unchanged. With cache0 plus default
    // item/index tracking, CDK retains this view instead of destroying it.
    page.activeReports[0] = { name: 'disk', title: 'Disk operations', vertical_label: 'Operations/s', identifiers: ['ada1'] };
    page.visibleReports = [...page.visibleReports];
    expect(page.visibleReports).toEqual(numericKeys);
    await renderReady();
    const newView = reportFor('ada1');
    expect(reports().length).toBe(1);
    expect(newView).not.toBe(oldView);
    expect(newView.chartId).not.toBe(oldId);
    expect(unregister).toHaveBeenCalledWith({ observerClass: oldView });
    assertOwnData();
    const newData = newView.data;
    complete(oldRequest, { name: 'FetchingError', data: { error: 22, reason: 'Late response from replaced key0/ada0' } } as any);
    await settle();
    expect(newView.data).toBe(newData);
    expect(newView.plotDataError).toBeFalse();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
    complete(oldRequest, sample('disk', 'ada0'));
    await settle();
    expect(newView.data).toBe(newData);
    expect(newView.data.identifier).toBe('ada1');
  }, 8000); // Two production render delays plus real CDK/layout settling.

});
