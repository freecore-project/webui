import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By, DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { NEVER, of } from 'rxjs';
import { ReportComponent, REPORT_SLOT_HEIGHTS, ReportLayout } from './report.component';
import { LineChartComponent } from '../lineChart/lineChart.component';
import { ReportingDatabaseError } from '../../reports.service';
import { configureReportingFixtures, reportData, settleReports } from '../../reportsdashboard-testing';
import { ThemeService } from '../../../../services/theme/theme.service';

describe('Reporting real report section (#430)', () => {
  let fixture: ComponentFixture<ReportComponent>;
  let backend: Awaited<ReturnType<typeof configureReportingFixtures>>;

  async function draw(layout: ReportLayout, width: number): Promise<void> {
    fixture.componentInstance.layout = layout;
    fixture.nativeElement.style.width = `${width}px`;
    fixture.nativeElement.style.height = `${REPORT_SLOT_HEIGHTS[layout]}px`;
    fixture.detectChanges();
    await settleReports();
    fixture.detectChanges();
  }
  beforeEach(async () => {
    backend = await configureReportingFixtures();
    fixture = TestBed.createComponent(ReportComponent);
    fixture.nativeElement.classList.add('fc-ui');
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:1100px';
    (fixture.componentInstance as any).delay = 0;
    fixture.componentRef.setInput('report', { name: 'cpu', title: 'CPU usage', vertical_label: '% CPU', identifiers: [] });
    await draw('wide', 1100);
  });
  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('keeps the real chart usable and legend reachable across wide, stacked and compact slots', async () => {
    fixture.componentInstance.data = reportData(40);
    for (const [layout, width] of [['wide', 1100], ['stacked', 668], ['compact', 358], ['wide', 1100]] as [ReportLayout, number][]) {
      await draw(layout, width);
      const section = fixture.nativeElement.querySelector('.report') as HTMLElement;
      const plot = fixture.nativeElement.querySelector('.chart-wrapper') as HTMLElement;
      const legend = fixture.nativeElement.querySelector('.legend-scroll') as HTMLElement;
      const chart = fixture.debugElement.query(By.directive(LineChartComponent)).componentInstance as LineChartComponent;
      expect(section.getBoundingClientRect().height).toBe(REPORT_SLOT_HEIGHTS[layout]);
      expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth + 1);
      expect(section.scrollHeight).toBeLessThanOrEqual(section.clientHeight + 1);
      expect(plot.clientWidth).toBeGreaterThan(300);
      expect(plot.clientHeight).toBe(200);
      expect(Math.abs(chart.chart.width_ - plot.clientWidth)).toBeLessThanOrEqual(1);
      expect(legend.scrollWidth).toBeLessThanOrEqual(legend.clientWidth + 1);
      expect(legend.scrollHeight).toBeGreaterThan(legend.clientHeight);
      legend.focus();
      expect(document.activeElement).toBe(legend);
      legend.scrollTop = legend.scrollHeight;
      const last = legend.querySelector('tbody tr:last-child');
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(legend.getBoundingClientRect().bottom + 1);
      if (layout !== 'wide') {
        expect(legend.getBoundingClientRect().top).toBeGreaterThan(plot.getBoundingClientRect().bottom);
      }
    }
  });

  it('preserves zero, missing values, hover values, appliance-timezone captions and semantic headers', async () => {
    const component = fixture.componentInstance;
    component.currentStartDate = 1790000000000;
    component.currentEndDate = 1790000600000;
    await draw('compact', 358);
    // Layout redraw clears Dygraph selection; a real hover arrives after the resize settles.
    backend.events('LegendEvent-' + component.chartId).next({
      data: { xHTML: '2026-09-21 08:33:20', series: [{ yHTML: 0 }, { yHTML: null }] },
    });
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(Array.from(row.querySelectorAll('td')).map((cell: HTMLElement) => cell.textContent.trim())).toEqual(['0', '0', '0.25', '—']);
    expect(row.querySelector('th').getAttribute('scope')).toBe('row');
    expect(row.querySelector('.tooltip-number').textContent.trim()).toBe('0');
    expect(fixture.nativeElement.querySelectorAll('thead th[scope=col]').length).toBe(5);
    expect(fixture.nativeElement.querySelector('.report-timezone').textContent).toContain('America/Los_Angeles');
    expect(fixture.nativeElement.querySelector('.report-range').textContent).toContain(component.startTime);
    expect(fixture.nativeElement.querySelector('.report-range').textContent).toContain(component.endTime);
    expect(fixture.nativeElement.querySelector('.legend-time').textContent).toContain(component.legendData.xHTML);
  });

  it('shows all five ordinary series without local scrolling, and only exposes current values during a hover', async () => {
    const component = fixture.componentInstance;
    component.data = reportData(5);
    component.data.legend = ['Interrupt', 'System', 'User', 'Nice', 'Idle'];
    for (const [layout, width] of [['wide', 900], ['wide', 1000], ['wide', 1400], ['stacked', 668]] as [ReportLayout, number][]) {
      await draw(layout, width);
      const legend = fixture.nativeElement.querySelector('.legend-scroll') as HTMLElement;
      const rows = (): HTMLElement[] => Array.from(legend.querySelectorAll('tbody tr'));
      const hoverEvent = (xHTML?: string) => {
        // Dygraph sends series metadata even when no point is selected.
        backend.events('LegendEvent-' + component.chartId).next({
          data: { xHTML, series: component.data.legend.map(() => ({ yHTML: xHTML ? 0 : undefined })) },
        });
        fixture.detectChanges();
      };
      const expectAllRowsVisible = () => {
        expect(rows().length).toBe(5);
        expect(legend.scrollHeight).withContext(layout).toBeLessThanOrEqual(legend.clientHeight + 1);
        expect(legend.scrollWidth).withContext(layout).toBeLessThanOrEqual(legend.clientWidth + 1);
        expect(rows()[4].getBoundingClientRect().bottom).withContext(layout)
          .toBeLessThanOrEqual(legend.getBoundingClientRect().bottom + 1);
      };
      hoverEvent();
      expect(fixture.nativeElement.querySelector('.legend-time')).toBeNull();
      expect(fixture.nativeElement.querySelector('.legend-value-heading')).toBeNull();
      expect(legend.querySelectorAll('.tooltip-value').length).toBe(0);
      expect(legend.querySelectorAll('thead th').length).toBe(4);
      expectAllRowsVisible();
      const heights = rows().map((row) => row.getBoundingClientRect().height);

      hoverEvent('2026-09-20 10:00:00');
      expect(fixture.nativeElement.querySelector('.legend-time').textContent).toContain(component.legendData.xHTML);
      expect(legend.querySelector('.legend-value-heading').textContent.trim()).toBe('Value');
      expect(legend.querySelectorAll('.tooltip-value').length).toBe(5);
      expect(rows().map((row) => row.getBoundingClientRect().height)).toEqual(heights);
      expectAllRowsVisible();

      hoverEvent();
      expect(fixture.nativeElement.querySelector('.legend-time')).toBeNull();
      expect(legend.querySelector('.legend-value-heading')).toBeNull();
      expect(legend.querySelectorAll('.tooltip-value').length).toBe(0);
      expectAllRowsVisible();
    }
  });

  it('restores desktop plot proportions while keeping narrow plots full width and range glyphs inside a compact slot', async () => {
    const component = fixture.componentInstance;
    component.data = reportData(5);
    component.data.legend = ['Interrupt', 'System', 'User', 'Nice', 'Idle'];
    component.report.title = 'Interface traffic for a long descriptive network interface identifier with redundant uplink information and appliance details';
    component.timezone = 'America/Argentina/ComodRivadavia';
    for (const [layout, width, plotWidth] of [
      ['wide', 900, 336], ['wide', 1000, 436], ['wide', 1400, 836],
      ['stacked', 668, 668], ['compact', 358, 358], ['wide', 1000, 436],
    ] as [ReportLayout, number, number][]) {
      await draw(layout, width);
      const context = `${layout} ${width}px`;
      const section = fixture.nativeElement.querySelector('.report') as HTMLElement;
      const plot = fixture.nativeElement.querySelector('.chart-wrapper') as HTMLElement;
      const range = fixture.nativeElement.querySelector('.report-range') as HTMLElement;
      const legend = fixture.nativeElement.querySelector('.report-legend') as HTMLElement;
      const chart = fixture.debugElement.query(By.directive(LineChartComponent)).componentInstance as LineChartComponent;
      const sectionBox = section.getBoundingClientRect();
      expect(plot.clientWidth).withContext(context).toBe(plotWidth);
      expect(plot.clientHeight).withContext(context).toBe(200);
      expect(Math.abs(chart.chart.width_ - plotWidth)).withContext(context).toBeLessThanOrEqual(1);
      expect(legend.clientWidth).withContext(context).toBe(layout === 'wide' ? 420 : width);
      expect(section.scrollWidth).withContext(context).toBeLessThanOrEqual(section.clientWidth + 1);
      expect(section.scrollHeight).withContext(context).toBeLessThanOrEqual(section.clientHeight + 1);
      expect(range.getBoundingClientRect().top).withContext(context).toBeGreaterThanOrEqual(plot.getBoundingClientRect().bottom);
      const walker = document.createTreeWalker(range, NodeFilter.SHOW_TEXT);
      let text: Node;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) { continue; }
        const glyphRange = document.createRange();
        glyphRange.selectNodeContents(text);
        for (const glyph of Array.from(glyphRange.getClientRects())) {
          expect(glyph.left).withContext(context).toBeGreaterThanOrEqual(plot.getBoundingClientRect().left - 0.5);
          expect(glyph.right).withContext(context).toBeLessThanOrEqual(plot.getBoundingClientRect().right + 0.5);
          expect(glyph.bottom).withContext(context).toBeLessThanOrEqual(sectionBox.bottom - 8);
          if (layout !== 'wide') {
            expect(glyph.bottom).withContext(context).toBeLessThanOrEqual(legend.getBoundingClientRect().top);
          }
        }
      }
      if (layout === 'wide' && width === 900) {
        expect(fixture.nativeElement.querySelector('h2').getBoundingClientRect().height).toBeGreaterThan(24);
        expect(range.getBoundingClientRect().height).toBeGreaterThan(16);
      }
    }
  });

  it('labels all four ghost controls and emits the existing time requests once per enabled action', async () => {
    const component = fixture.componentInstance;
    const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.report-time-controls button'));
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual(['Zoom in', 'Zoom out', 'Previous period', 'Next period']);
    expect(buttons().every((button) => button.getBoundingClientRect().height === 32)).toBeTrue();
    expect(buttons()[0].disabled).toBeTrue();
    expect(buttons()[3].disabled).toBeTrue();
    backend.core.emit.calls.reset();
    buttons()[1].click();
    await draw('wide', 1100);
    expect(component.timeZoomIndex).toBe(3);
    expect(backend.core.emit.calls.allArgs().filter(([evt]) => evt.name === 'ReportDataRequest').length).toBe(1);
    expect(backend.core.emit.calls.allArgs().find(([evt]) => evt.name === 'ReportDataRequest')[0].data.params).toEqual({ name: 'cpu' });
    backend.core.emit.calls.reset();
    buttons()[0].click();
    await draw('wide', 1100);
    expect(component.timeZoomIndex).toBe(4);
    expect(backend.core.emit.calls.allArgs().filter(([evt]) => evt.name === 'ReportDataRequest').length).toBe(1);
    backend.core.emit.calls.reset();
    buttons()[2].click();
    await draw('wide', 1100);
    expect(component.stepForwardDisabled).toBeFalse();
    expect(backend.core.emit.calls.allArgs().filter(([evt]) => evt.name === 'ReportDataRequest').length).toBe(1);
    backend.core.emit.calls.reset();
    buttons()[3].click();
    await draw('wide', 1100);
    expect(component.stepForwardDisabled).toBeTrue();
    expect(backend.core.emit.calls.allArgs().filter(([evt]) => evt.name === 'ReportDataRequest').length).toBe(1);
  });

  it('keeps loading, unavailable and repair states in the same slot, with confirmation before clearing data', async () => {
    const component = fixture.componentInstance;
    component.ready = false;
    await draw('compact', 358);
    expect(fixture.nativeElement.querySelector('hlm-spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-card')).toBeNull();
    const edit = jasmine.createSpy('edit');
    component.ready = true;
    component.report.empty = { title: 'Disk Temperatures Not Available', message: 'Enable Force HDD Standby or set HDD Standby to Never.', button: { text: 'Edit Disk', click: edit } };
    await draw('compact', 358);
    expect(fixture.nativeElement.textContent).toContain('Force HDD Standby');
    fixture.nativeElement.querySelector('.report-state button').click();
    expect(edit).toHaveBeenCalledTimes(1);
    delete component.report.empty;
    component.handleError({ name: 'ReportData', data: { name: 'FetchingError', data: { error: ReportingDatabaseError.InvalidTimestamp } } });
    await draw('compact', 358);
    fixture.nativeElement.querySelector('.report-state button').click();
    expect(backend.dialog.confirm).toHaveBeenCalledTimes(1);
    expect(backend.ws.call).not.toHaveBeenCalledWith('reporting.clear');
    backend.dialog.confirm.and.returnValue(of(true));
    // Resolve only the confirmation. A never-completing fake clear prevents the production reload.
    backend.ws.call.and.returnValue(NEVER);
    fixture.nativeElement.querySelector('.report-state button').click();
    expect(backend.ws.call).toHaveBeenCalledWith('reporting.clear');
    expect(fixture.nativeElement.querySelector('.report').getBoundingClientRect().height).toBe(600);
    expect(fixture.nativeElement.querySelector('.report-time-controls')).toBeNull();
  });

  it('shows empty or all-null histories without constructing an empty Dygraph, and tolerates short hover series', async () => {
    const component = fixture.componentInstance;
    for (const rows of [[], [[null, null], [null, null]]]) {
      component.data = { ...reportData(), data: rows as any };
      await draw('compact', 358);
      expect(fixture.nativeElement.querySelector('linechart')).toBeNull();
      expect(fixture.nativeElement.querySelector('.plot-no-data').textContent).toContain('No data available');
      expect(fixture.nativeElement.querySelectorAll('.report-time-controls button').length).toBe(4);
    }
    component.data = reportData();
    await draw('compact', 358);
    backend.events('LegendEvent-' + component.chartId).next({ data: { xHTML: '2026-09-20 10:00:00', series: [{ yHTML: 0 }] } });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelectorAll('.tooltip-value').length).toBe(component.data.legend.length);
    expect(fixture.nativeElement.querySelectorAll('.tooltip-number')[1].textContent.trim()).toBe('—');
    expect(fixture.nativeElement.querySelector('.tooltip-number').textContent.trim()).toBe('0');
  });

  it('distinguishes Core failed-fetch and malformed responses from valid empty samples without throwing', async () => {
    const component = fixture.componentInstance;
    for (const data of [
      { name: 'FetchingError', data: { error: ReportingDatabaseError.FailedExport, reason: 'Missing memory-laundry.rrd' } },
      { name: 'memory', data: {} },
      { name: 'memory', data: [null, 1] },
    ]) {
      backend.reply(component, data);
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(() => component.hasPlotData).not.toThrow();
      expect(component.hasPlotData).toBeFalse();
      expect(fixture.nativeElement.querySelector('.plot-load-error').textContent).toContain('Report data could not be loaded.');
      expect(fixture.nativeElement.querySelector('.plot-no-data')).toBeNull();
      expect(fixture.nativeElement.querySelector('linechart')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.report-time-controls button').length).toBe(4);
      expect(fixture.nativeElement.querySelector('.report-range')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.report-state button')).toBeNull();
    }
    backend.reply(component, { ...reportData(), data: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.plot-no-data').textContent).toContain('No data available for this period.');

    backend.reply(component, { name: 'FetchingError', data: { error: ReportingDatabaseError.InvalidTimestamp } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.plot-load-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.report-state').textContent).toContain('The reporting database is broken');
    fixture.nativeElement.querySelector('.report-state button').click();
    expect(backend.dialog.confirm).toHaveBeenCalledTimes(1);
    expect(backend.ws.call).not.toHaveBeenCalledWith('reporting.clear');
  });

  it('wraps long report and series names without losing the plot or widening the slot', async () => {
    const component = fixture.componentInstance;
    component.report.title = 'Interface traffic for a long descriptive network interface identifier';
    component.data.legend[0] = 'An unusually long translated series label with useful detail';
    for (const [layout, width] of [['wide', 930], ['stacked', 668], ['compact', 358]] as [ReportLayout, number][]) {
      await draw(layout, width);
      const report = fixture.nativeElement.querySelector('.report') as HTMLElement;
      expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth + 1);
      expect(report.scrollHeight).toBeLessThanOrEqual(report.clientHeight + 1);
      expect(fixture.nativeElement.querySelector('h2').textContent).toContain('descriptive network interface');
      expect(fixture.nativeElement.querySelector('.legend-scroll').clientHeight).toBeGreaterThan(50);
    }
  });

  it('disconnects its local plot resize observation and cancels queued work on destruction', async () => {
    const chart = fixture.debugElement.query(By.directive(LineChartComponent)).componentInstance as LineChartComponent;
    const disconnect = spyOn((chart as any).resizeObserver, 'disconnect').and.callThrough();
    const destroy = spyOn(chart.chart, 'destroy').and.callThrough();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('exposes the multipath identity and keeps keyboard focus visible in every registered theme', async () => {
    TestBed.inject(MatIconRegistry).addSvgIconLiteral('multipath',
      TestBed.inject(DomSanitizer).bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg>'));
    fixture.componentInstance.multipathTitle = 'Disk group';
    await draw('wide', 1100);
    const icon = fixture.nativeElement.querySelector('.multipath-icon');
    expect(icon.getAttribute('aria-hidden')).toBe('false');
    expect(icon.getAttribute('aria-label')).toBe('Multipath');

    const root = document.documentElement;
    const previousStyle = root.style.cssText;
    const previousDark = root.classList.contains('dark');
    const themes = new ThemeService({} as any, backend.ws as any, backend.core as any, {} as any, backend.router as any);
    const legend = fixture.nativeElement.querySelector('.legend-scroll') as HTMLElement;
    const surface = document.createElement('div');
    surface.style.backgroundColor = 'var(--bg0)';
    fixture.nativeElement.appendChild(surface);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const luminance = (color: string): number => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const channels = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    try {
      legend.focus();
      expect(legend.matches(':focus-visible')).toBeTrue();
      for (const theme of themes.freenasThemes) {
        themes.setCssVars(theme);
        const outline = getComputedStyle(legend);
        expect(outline.outlineWidth).withContext(theme.name).toBe('2px');
        const foreground = luminance(outline.outlineColor);
        const background = luminance(getComputedStyle(surface).backgroundColor);
        expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05))
          .withContext(theme.name).toBeGreaterThanOrEqual(3);
      }
    } finally {
      root.style.cssText = previousStyle;
      root.classList.toggle('dark', previousDark);
      surface.remove();
    }
  });
});
