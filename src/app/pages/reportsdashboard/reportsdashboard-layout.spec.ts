import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { ReportsPageScrollDirective } from './reports-page-scroll.directive';
import { ReportComponent } from './components/report/report.component';
import { ReportsDashboardComponent } from './reportsdashboard.component';
import { configureReportingFixtures, reportData, settleReports } from './reportsdashboard-testing';

describe('Reporting virtual reports in normal page flow (#436)', () => {
  let fixture: ComponentFixture<ReportsDashboardComponent>;
  let shell: HTMLElement;
  let hold: HTMLElement;
  let backend: Awaited<ReturnType<typeof configureReportingFixtures>>;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await settleReports();
    fixture.detectChanges();
  }
  async function resize(width: number): Promise<void> {
    shell.style.width = `${width}px`;
    await settle();
    await settle();
  }
  const viewport = (): HTMLElement => fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
  function assertSlots(): void {
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.report-container'));
    // A short viewport at the list end can contain only the final tall report.
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, i) => {
      expect(row.getBoundingClientRect().height).toBe(fixture.componentInstance.reportItemSize);
      expect(row.querySelector('report').getBoundingClientRect().height).toBe(fixture.componentInstance.reportItemSize);
      if (i) { expect(Math.abs(row.getBoundingClientRect().top - rows[i - 1].getBoundingClientRect().bottom)).toBeLessThanOrEqual(1); }
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
    });
    expect(viewport().scrollWidth).toBeLessThanOrEqual(viewport().clientWidth + 1);
    expect(viewport().scrollTop).toBe(0);
    expect(viewport().scrollHeight).toBeLessThanOrEqual(viewport().clientHeight + 1);
    expect(hold.scrollHeight).toBeGreaterThan(hold.clientHeight);
    expect(rows.length).toBeLessThan(10); // all 24 reports must not become mounted chart views
  }

  beforeEach(async () => {
    backend = await configureReportingFixtures();
    shell = document.createElement('div');
    shell.className = 'fc-ui';
    const height = Math.min(window.innerHeight, 700);
    shell.style.cssText = `position:fixed; inset:0 auto auto 0; width:1200px; height:${height}px`;
    hold = document.createElement('div');
    hold.className = 'rightside-content-hold';
    hold.style.cssText = `position:relative; top:0; height:${height}px; width:100%; box-sizing:border-box; overflow:auto; overflow-anchor:auto!important`;
    document.body.appendChild(shell);
    shell.appendChild(hold);
    fixture = TestBed.createComponent(ReportsDashboardComponent);
    hold.appendChild(fixture.nativeElement);
    const footer = document.createElement('footer');
    footer.className = 'fc-project-footer';
    footer.textContent = 'Documentation';
    hold.appendChild(footer);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.activeTabVerified = true;
    page.activeReports = Array.from({ length: 24 }, (_, i) => ({ name: 'cpu', title: `CPU ${i}`, vertical_label: '% CPU', identifiers: [`fixture-${i}`] }));
    page.visibleReports = page.activeReports.map((_, i) => i);
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    shell.remove();
    TestBed.resetTestingModule();
  });

  it('keeps real report slots, last-row reachability and scroll position coherent across continuous width changes', async () => {
    await settleReports(1050);
    await settle();
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(viewport().getAttribute('role')).toBe('region');
    expect(viewport().getAttribute('aria-label')).toBe('Reports');
    expect(viewport().tabIndex).toBe(0);
    viewport().focus();
    expect(document.activeElement).toBe(viewport());
    const page = fixture.componentInstance;
    hold.scrollTop = page.viewport.measureViewportOffset() + 12 * page.reportItemSize;
    await settle();
    const index = page.viewport.measureScrollOffset() / page.reportItemSize;
    for (const width of [700, 620, 390, 520, 899, 900, 1000, 1400, 1200]) {
      await resize(width);
      assertSlots();
      expect(Math.abs(page.viewport.measureScrollOffset() / page.reportItemSize - index)).toBeLessThan(0.1);
    }
    await resize(390);
    // A compact report can be taller than the viewport; index alignment alone is not the end.
    hold.scrollTop = hold.scrollHeight;
    await settle();
    await settleReports(1050);
    await settle();
    const last = Array.from(fixture.nativeElement.querySelectorAll('.report-container') as NodeListOf<HTMLElement>).pop();
    expect(last.textContent).toContain('CPU 23');
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(hold.getBoundingClientRect().bottom + 1);
    assertSlots();
  });

  it('keeps Y-axis titles inside the plot and separated from long tick labels at every layout width', async () => {
    await settleReports(1050);
    await settle();
    for (const width of [900, 1000, 1400, 700, 390, 1000]) {
      await resize(width);
      for (const unit of ['Operations/s', 'Bits/s']) {
        const report = fixture.debugElement.query(By.directive(ReportComponent)).componentInstance as ReportComponent;
        report.report.vertical_label = unit;
        // A real incoming data event redraws with the report's unit metadata.
        const samples = reportData();
        samples.data = samples.data.map(() => [0, 25000000, 50000000, 75000000, 100000000]) as any;
        backend.reply(report, samples);
        await settle();
        // Redraw after Dygraph establishes the unit prefix from the first range.
        backend.reply(report, samples);
        await settle();
        const linechart = fixture.nativeElement.querySelector('linechart') as HTMLElement;
        const label = linechart.querySelector('.dygraph-ylabel') as HTMLElement;
        expect(label.textContent.toLowerCase()).toContain(unit.toLowerCase());
        const range = document.createRange();
        range.selectNodeContents(label);
        const textRects = Array.from(range.getClientRects()).filter((box) => box.width && box.height);
        expect(textRects.length).toBeGreaterThan(0);
        const ticks = Array.from(linechart.querySelectorAll('.dygraph-axis-label-y'));
        if (unit === 'Bits/s') {
          expect(ticks.some((tick) => tick.textContent.trim().length >= 5)).toBeTrue();
        }
        const tickRects = ticks.flatMap((tick) => {
          const tickRange = document.createRange();
          tickRange.selectNodeContents(tick);
          return Array.from(tickRange.getClientRects()).filter((box) => box.width && box.height);
        });
        for (const titleGlyph of textRects) {
          for (const tickGlyph of tickRects) {
            if (titleGlyph.top < tickGlyph.bottom && titleGlyph.bottom > tickGlyph.top) {
              expect(tickGlyph.left - titleGlyph.right).withContext(`${width}px ${unit} title/tick gap`).toBeGreaterThanOrEqual(4);
            }
          }
        }
        const plotBounds = linechart.getBoundingClientRect();
        const viewportBounds = viewport().getBoundingClientRect();
        for (const glyph of textRects) {
          const context = `${width}px ${unit}`;
          expect(glyph.left).withContext(context).toBeGreaterThanOrEqual(plotBounds.left - 0.5);
          expect(glyph.right).withContext(context).toBeLessThanOrEqual(plotBounds.right + 0.5);
          expect(glyph.top).withContext(context).toBeGreaterThanOrEqual(plotBounds.top - 0.5);
          expect(glyph.bottom).withContext(context).toBeLessThanOrEqual(plotBounds.bottom + 0.5);
          expect(glyph.left).withContext(context).toBeGreaterThanOrEqual(viewportBounds.left - 0.5);
          expect(glyph.right).withContext(context).toBeLessThanOrEqual(viewportBounds.right + 0.5);
        }
      }
    }
  });

  it('keeps page top and partially visible controls in place through layout changes', async () => {
    const page = fixture.componentInstance;
    expect(getComputedStyle(hold).overflowY).toBe('auto');
    expect(page.viewport.scrollable.getElementRef().nativeElement).toBe(hold);
    expect(page.viewport.getViewportSize()).toBe(hold.clientHeight);
    expect(viewport().classList.contains('cdk-virtual-scrollable')).toBeFalse();
    for (const width of [700, 390, 1000, 900, 1400]) {
      await resize(width);
      expect(hold.scrollTop).withContext(`${width}px page top`).toBe(0);
    }
    const partial = Math.min(40, page.viewport.measureViewportOffset() / 2);
    hold.scrollTop = partial;
    await settle();
    for (const width of [390, 700, 1000]) {
      await resize(width);
      expect(hold.scrollTop).withContext(`${width}px partially visible heading`).toBeCloseTo(partial, 0);
    }
    // Equality belongs to the first report, not the partly visible toolbar.
    // Preserve that report's alignment if controls grow without changing item size.
    hold.scrollTop = page.viewport.measureViewportOffset();
    await settle();
    const first = fixture.debugElement.query(By.directive(ReportComponent)).componentInstance;
    const toolbar = fixture.nativeElement.querySelector('.reports-toolbar') as HTMLElement;
    toolbar.style.paddingBottom = '48px';
    await settle();
    await settle();
    expect(hold.scrollTop).toBeCloseTo(page.viewport.measureViewportOffset(), 0);
    expect(page.viewport.measureScrollOffset()).toBe(0);
    expect(fixture.debugElement.query(By.directive(ReportComponent)).componentInstance).toBe(first);
  });

  it('moves the heading and footer with the page, remaps toolbar changes and restores adapter state on teardown', async () => {
    await resize(700);
    const page = fixture.componentInstance;
    const toolbar = fixture.nativeElement.querySelector('.reports-toolbar') as HTMLElement;
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    const initialHeadingTop = heading.getBoundingClientRect().top;
    const initialToolbarTop = toolbar.getBoundingClientRect().top;
    hold.scrollTop = page.viewport.measureViewportOffset() + 3 * page.reportItemSize;
    await settle();
    expect(initialHeadingTop - heading.getBoundingClientRect().top).toBeCloseTo(hold.scrollTop, 0);
    expect(initialToolbarTop - toolbar.getBoundingClientRect().top).toBeCloseTo(hold.scrollTop, 0);
    expect(page.viewport.getRenderedRange().start).toBeGreaterThan(0);
    const logical = page.viewport.measureScrollOffset() / page.reportItemSize;
    const shellOffset = hold.scrollTop;
    toolbar.style.paddingBottom = '48px';
    await settle();
    await settle();
    expect(hold.scrollTop).toBeCloseTo(shellOffset + 48, 0);
    expect(page.viewport.measureScrollOffset() / page.reportItemSize).toBeCloseTo(logical, 2);
    const consoleBar = document.createElement('div');
    consoleBar.className = 'footer-console-bar';
    consoleBar.style.cssText = 'position:absolute; bottom:0; height:45px; width:100%';
    shell.appendChild(consoleBar);
    const shellHeight = hold.style.height;
    hold.style.height = `${parseFloat(shellHeight) - 45}px`; // real shell has-footer sizing
    hold.classList.add('has-footer');
    await settle();
    expect(page.viewport.getViewportSize()).toBe(hold.clientHeight);
    hold.scrollTop = hold.scrollHeight;
    await settle();
    const footer = hold.querySelector('.fc-project-footer');
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(consoleBar.getBoundingClientRect().top);
    expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(hold.getBoundingClientRect().top);
    expect(viewport().scrollTop).toBe(0);
    consoleBar.remove();
    hold.style.height = shellHeight;
    hold.classList.remove('has-footer');
    await settle();
    const adapter = fixture.debugElement.query(By.directive(ReportsPageScrollDirective)).injector.get(ReportsPageScrollDirective);
    const dispatcher = TestBed.inject(ScrollDispatcher);
    expect(dispatcher.scrollContainers.has(adapter)).toBeTrue();
    expect(hold.style.overflowAnchor).toBe('none');
    const attributes = { classes: hold.className, tabindex: hold.getAttribute('tabindex'), label: hold.getAttribute('aria-label') };
    fixture.destroy();
    expect(dispatcher.scrollContainers.has(adapter)).toBeFalse();
    expect(hold.style.overflow).toBe('auto');
    expect(hold.style.overflowAnchor).toBe('auto');
    expect(hold.style.getPropertyPriority('overflow-anchor')).toBe('important');
    expect({ classes: hold.className, tabindex: hold.getAttribute('tabindex'), label: hold.getAttribute('aria-label') }).toEqual(attributes);
  });

  it('retains Disk selection guidance, unavailable-temperature reason/action and conditional UPS', async () => {
    const page = fixture.componentInstance;
    page.activeTab = 'Disk';
    page.visibleReports = [];
    await settle();
    const empty = fixture.nativeElement.querySelector('.reports-empty') as HTMLElement;
    expect(empty.textContent).toContain('Select devices and metrics');
    expect(getComputedStyle(empty).position).not.toBe('absolute');
    expect(empty.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(hold.querySelector('.fc-project-footer').getBoundingClientRect().top).toBeGreaterThanOrEqual(empty.getBoundingClientRect().bottom);
    expect(fixture.nativeElement.querySelectorAll('report').length).toBe(0);
    expect(viewport().getBoundingClientRect().height).toBeLessThanOrEqual(1);
    expect(viewport().tabIndex).toBe(-1);
    expect(fixture.nativeElement.querySelector('entity-toolbar')).not.toBeNull();
    page.otherReports = [{ name: 'cpu', title: 'CPU' }];
    page.allTabs = [];
    page.generateTabs();
    expect(page.allTabs.some((tab) => tab.value === 'ups')).toBeFalse();
    page.otherReports.push({ name: 'upscharge', title: 'UPS charge' });
    page.allTabs = [];
    page.generateTabs();
    expect(page.allTabs.some((tab) => tab.value === 'ups')).toBeTrue();
    backend.ws.call.and.callFake((method) => method === 'disk.query'
      ? { subscribe: (next) => next([{ name: 'da0', devname: 'da0', identifier: 'disk-id', hddstandby: '10', hddstandby_force: false }]) }
      : { subscribe: (next) => next([]) });
    page.diskQueries();
    const unavailable = page.disksWithNoTempGraphs.da0;
    expect(unavailable.empty.message).toContain('Force HDD Standby');
    unavailable.empty.button.click();
    expect(backend.router.navigate).toHaveBeenCalledWith(['/', 'storage', 'disks', 'edit', 'disk-id']);
  });

  it('clamps a bottom-scrolled long collection to empty and one report, then restores bounded virtual rendering', async () => {
    await resize(700);
    const page = fixture.componentInstance;
    const allKeys = [...page.visibleReports];
    hold.scrollTop = hold.scrollHeight;
    await settle();
    expect(hold.scrollTop).toBeGreaterThan(0);
    const removed = fixture.debugElement.query(By.directive(ReportComponent)).componentInstance;
    page.visibleReports = [];
    await settle();
    await settle();
    expect(hold.scrollTop).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('report').length).toBe(0);
    expect(viewport().getBoundingClientRect().height).toBeLessThanOrEqual(1);
    expect(viewport().tabIndex).toBe(-1);
    expect(backend.core.unregister).toHaveBeenCalledWith({ observerClass: removed });
    const empty = fixture.nativeElement.querySelector('.reports-empty') as HTMLElement;
    const footer = hold.querySelector('.fc-project-footer');
    expect(empty.textContent).toContain('No reports available');
    expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(empty.getBoundingClientRect().bottom);

    page.visibleReports = [23];
    await settle();
    await settle();
    expect(fixture.nativeElement.querySelector('.reports-empty')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('report').length).toBe(1);
    expect(viewport().tabIndex).toBe(0);
    expect(fixture.nativeElement.querySelector('report').textContent).toContain('CPU 23');
    expect(footer.getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(fixture.nativeElement.querySelector('.report-container').getBoundingClientRect().bottom);
    hold.scrollTop = hold.scrollHeight;
    await settle();
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(hold.getBoundingClientRect().bottom + 1);

    page.visibleReports = allKeys;
    await settle();
    await settle();
    expect(fixture.nativeElement.querySelectorAll('report').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('report').length).toBeLessThan(10);
    expect(page.viewport.getDataLength()).toBe(24);
    expect(viewport().scrollTop).toBe(0);
    expect(hold.style.overflow).toBe('auto');
    assertSlots();
  });
});
