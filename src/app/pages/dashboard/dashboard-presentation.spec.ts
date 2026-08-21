import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { WidgetControllerComponent } from 'app/core/components/widgets/widgetcontroller/widgetcontroller.component';
import { WidgetCpuComponent } from 'app/core/components/widgets/widgetcpu/widgetcpu.component';
import { WidgetMemoryComponent } from 'app/core/components/widgets/widgetmemory/widgetmemory.component';
import { WidgetSysInfoComponent } from 'app/core/components/widgets/widgetsysinfo/widgetsysinfo.component';
import { CoreService } from 'app/core/services/core.service';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { DialogService, SystemGeneralService, WebSocketService } from 'app/services';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { LocaleService } from 'app/services/locale.service';
import { ThemeService } from 'app/services/theme/theme.service';
import { DashboardComponent } from './dashboard.component';

// These are the real Dashboard and widget templates, Material card structure,
// Helm controls and scoped styles. Only the data sources are inert test doubles.
describe('Dashboard compact presentation and mobile navigation', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let media: BehaviorSubject<any[]>;
  let width: jasmine.Spy;
  let router: jasmine.SpyObj<Router>;
  let observerCallbacks: ResizeObserverCallback[];
  let observerDisconnects: jasmine.Spy[];

  beforeEach(waitForAsync(() => {
    media = new BehaviorSubject([{ mqAlias: 'md' }]);
    width = spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    router = jasmine.createSpyObj('Router', ['navigate']);
    const core = { register: () => NEVER, unregister: jasmine.createSpy('unregister'), emit: jasmine.createSpy('emit') };
    spyOn<any>(CoreServiceInjector, 'get').and.callFake((token: unknown) => token === ThemeService
      ? { currentTheme: () => ({ accentColors: [] }), isDefaultTheme: true }
      : core);
    observerCallbacks = [];
    observerDisconnects = [];
    spyOn(window, 'ResizeObserver').and.callFake(function (callback: ResizeObserverCallback) {
      observerCallbacks.push(callback);
      const disconnect = jasmine.createSpy('disconnect');
      observerDisconnects.push(disconnect);
      return { observe: () => undefined, unobserve: () => undefined, disconnect };
    });
    TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [CoreComponents, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: CoreService, useValue: core },
        { provide: WebSocketService, useValue: { call: () => NEVER, sub: () => NEVER } },
        { provide: LayoutMediaObserver, useValue: { asObservable: () => media } },
        { provide: SystemGeneralService, useValue: { updateRunning: of('false') } },
        { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: { confirm: jasmine.createSpy('confirm').and.returnValue(of(false)) } },
      ],
    }).compileComponents();
  }));

  function render(names = ['Network'], hostWidth = 1000, prepare?: (dashboard: DashboardComponent) => void): DashboardComponent {
    fixture = TestBed.createComponent(DashboardComponent);
    const dashboard = fixture.componentInstance;
    spyOn(dashboard, 'ngOnInit');
    Object.assign(dashboard, {
      pools: [], nics: [], volumeData: {}, sysinfoReady: true,
      systemInformation: { model: 'A long CPU model without a temperature sensor', ecc_memory: false },
      dashState: names.map((name) => ({ name, rendered: true })),
    });
    prepare?.(dashboard);
    fixture.nativeElement.style.width = `${hostWidth}px`;
    fixture.nativeElement.classList.add('fc-ui');
    fixture.detectChanges();
    return dashboard;
  }

  afterEach(() => fixture?.destroy());

  // One visual row: every child overlaps every other vertically. The children are
  // baseline-aligned and need not share a top -- a >=80% capacity mark makes the
  // used value the tallest of them.
  function expectOneRow(line: HTMLElement): void {
    const rects = Array.from(line.children).map((child) => child.getBoundingClientRect());
    for (const rect of rects) {
      for (const other of rects) {
        expect(rect.top).withContext(`${line.textContent} stacked`).toBeLessThan(other.bottom);
      }
    }
  }

  function expectPlainCount(element: HTMLElement, value: string): void {
    expect(element.textContent.replace(/\s+/g, ' ').trim()).toBe(value);
    const style = getComputedStyle(element);
    expect(style.borderTopWidth).toBe('0px');
    expect(style.borderRightWidth).toBe('0px');
    expect(style.borderBottomWidth).toBe('0px');
    expect(style.borderLeftWidth).toBe('0px');
    expect(style.borderRadius).toBe('0px');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.padding).toBe('0px');
  }

  it('restores 540px minimum tracks and uniformly sized 400px cards across responsive columns', () => {
    render(['Network', 'Network', 'Network']);
    const grid: HTMLElement = fixture.nativeElement.querySelector('.widgets-wrapper');
    for (const [hostWidth, columns] of [[1000, 1], [668, 1], [1400, 2], [1800, 3], [500, 1]]) {
      fixture.nativeElement.style.width = `${hostWidth}px`;
      fixture.detectChanges();
      const cards = Array.from(grid.children).map((child) => child.getBoundingClientRect());
      expect(new Set(cards.map((rect) => Math.round(rect.left))).size).toBe(columns);
      expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth + 1);
      for (const card of fixture.nativeElement.querySelectorAll('.fc-card.front') as NodeListOf<HTMLElement>) {
        expect(card.getBoundingClientRect().height).withContext(`sparse card at ${hostWidth}px`).toBeCloseTo(400, 0);
      }
    }
    const card: HTMLElement = fixture.nativeElement.querySelector('.fc-card.front');
    expect(card.getBoundingClientRect().height).toBeCloseTo(400, 0);
    expect(fixture.nativeElement.textContent).toContain('No network interfaces');
  });

  it('keeps narrow Network rows keyboard actions with full names and unchanged routes', () => {
    const dashboard = render(['Network'], 360);
    dashboard.nics = [{ name: 'an-interface-name-longer-than-twelve-characters', type: 'PHYSICAL', state: {
      link_state: 'LINK_STATE_UP', aliases: [{ type: 'INET6', address: '2001:db8:1234:5678:90ab:cdef:1234:5678', netmask: 64 }, { type: 'INET', address: '192.0.2.1', netmask: 24 }], vlans: ['vlan10', 'vlan20'],
    } }];
    fixture.detectChanges();
    dashboard.statsDataEvents.next({ name: `NetTraffic_${dashboard.nics[0].name}`, data: { received_bytes_rate: 12345678, sent_bytes_rate: 9876543 } });
    fixture.detectChanges();
    const row: HTMLButtonElement = fixture.nativeElement.querySelector('button.net-row');
    expect(row.textContent).toContain(dashboard.nics[0].name);
    expect(row.textContent).toContain('2001:db8:1234:5678:90ab:cdef:1234:5678/64');
    expectPlainCount(row.querySelector('.vlan-count'), '2 VLANs');
    expectPlainCount(row.querySelector('.address-count'), '+1');
    for (const count of row.querySelectorAll('.widget-count') as NodeListOf<HTMLElement>) {
      expect(count.scrollWidth).toBeLessThanOrEqual(count.clientWidth + 1);
    }
    expect(row.querySelector('.if-meta .vlan-count')).not.toBeNull();
    expect(row.querySelector('.row-tail .vlan-count')).toBeNull();
    expect(row.querySelectorAll('.traffic-direction').length).toBe(2);
    expect(row.querySelector('.widget-chip')).toBeNull();
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
    row.focus();
    expect(document.activeElement).toBe(row);
    row.click();
    expect(router.navigate).toHaveBeenCalledWith([`network/interfaces/edit/${dashboard.nics[0].name}`]);
    (fixture.nativeElement.querySelector('[aria-label="Network Reports"]') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['reportsdashboard/network']);
  });

  it('aligns plain facts with real section spacing while retaining System detail', () => {
    render(['System Information', 'CPU', 'Memory'], 1400);
    const system = fixture.debugElement.query(By.directive(WidgetSysInfoComponent)).componentInstance as WidgetSysInfoComponent;
    Object.assign(system, { ready: true, uptimeString: '2 days', dateTime: '2026-09-20 12:00', train: 'FreeCORE-15.2', memory: '64 GiB', manufacturer: 'ixsystems',
      data: { version: 'FreeCORE-15.2', hostname: 'qa.local', system_product: 'Test appliance', timezone: 'Europe/Stockholm', system_serial: 'serial-1', license: { contract_type: 'SILVER', contract_end: { $value: '2027-09-20' } } },
    });
    const cpu = fixture.debugElement.query(By.directive(WidgetCpuComponent)).componentInstance as WidgetCpuComponent;
    Object.assign(cpu, { avgUsage: 4, coreCount: 4, threadUsage: [1, 2, 3, 10], usageMax: 10, usageMaxThreads: [3] });
    const memory = fixture.debugElement.query(By.directive(WidgetMemoryComponent)).componentInstance as WidgetMemoryComponent;
    memory.memData = { max: '64.0', data: [['Free', '32.0'], ['ZFS Cache', '16.0'], ['Services', '16.0']] };
    memory.colorPattern = ['var(--blue)', 'var(--green)', 'var(--yellow)'];
    memory.arcHitPct = 99;
    fixture.detectChanges();
    const text = (selector: string): string => fixture.nativeElement.querySelector(selector).textContent.replace(/\s+/g, ' ').trim();
    expect(text('.uptime-value')).toBe('2 days');
    expect(text('.uptime-as-of')).toBe('as of 2026-09-20 12:00');
    for (const value of ['Test appliance', 'qa.local', 'FreeCORE-15.2', '64 GiB', 'Europe/Stockholm', 'serial-1', 'silver', '2027-09-20']) {
      expect(text('.sysinfo-meta')).toContain(value);
    }
    expect(text('.mem-facts')).toContain('99%');
    for (const hostWidth of [1400, 668, 360]) {
      fixture.nativeElement.style.width = `${hostWidth}px`;
      fixture.detectChanges();
      for (const facts of fixture.nativeElement.querySelectorAll('dl.facts-dl') as NodeListOf<HTMLElement>) {
        const dt = facts.querySelector('dt').getBoundingClientRect();
        const dd = facts.querySelector('dd').getBoundingClientRect();
        expect(dd.left - dt.left).withContext(`${hostWidth}px aligned facts`).toBeCloseTo(112, 0);
        expect(facts.scrollWidth).toBeLessThanOrEqual(facts.clientWidth + 1);
      }
      const memBar = fixture.nativeElement.querySelector('.mem-bar').getBoundingClientRect();
      const memFacts = fixture.nativeElement.querySelector('.mem-facts').getBoundingClientRect();
      expect(memFacts.top - memBar.bottom).toBeGreaterThanOrEqual(15);
      const cpuFacts = fixture.nativeElement.querySelector('.cpu-facts').getBoundingClientRect();
      const threads = fixture.nativeElement.querySelector('.thread-strip').getBoundingClientRect();
      expect(threads.top - cpuFacts.bottom).toBeGreaterThanOrEqual(15);
      for (const card of fixture.nativeElement.querySelectorAll('.fc-card.front') as NodeListOf<HTMLElement>) {
        expect(card.getBoundingClientRect().height).toBeGreaterThanOrEqual(399);
      }
    }
    const translate = TestBed.inject(TranslateService);
    const longLabel = 'AnExceptionallyLongTranslatedSingleWordLabel';
    translate.setTranslation('fact-fixture', { 'Time Zone': longLabel });
    translate.use('fact-fixture');
    fixture.detectChanges();
    const translatedLabel = Array.from(fixture.nativeElement.querySelectorAll('.sysinfo-meta dt') as NodeListOf<HTMLElement>)
      .find((dt) => dt.textContent === longLabel);
    expect(translatedLabel).toBeDefined();
    expect(translatedLabel.scrollWidth).toBeLessThanOrEqual(translatedLabel.clientWidth + 1);
    expect(translatedLabel.getBoundingClientRect().right).toBeLessThanOrEqual(translatedLabel.nextElementSibling.getBoundingClientRect().left);

  });

  it('stacks all pools inside one 400px frame with inline capacity/errors and readable long names', () => {
    const longName = 'a-pool-name-that-remains-readable-even-on-a-very-narrow-dashboard-card';
    const dashboard = render(['Pools'], 700, (component) => {
      component.pools = Array.from({ length: 8 }, (_, index) => ({
        name: index === 0 ? longName : `pool-${index}`, status: index === 1 ? 'DEGRADED' : 'ONLINE',
        healthy: index !== 1, is_decrypted: index !== 2,
        ...(index === 0 ? { scan: { errors: 4, function: 'RESILVER' } } : {}),
        topology: { data: [{ type: 'DISK', stats: { read_errors: index === 1 ? 2 : 0, write_errors: 0, checksum_errors: 0 } }] },
      }));
      component.volumeData = Object.fromEntries(component.pools.map((pool) => [pool.name, { used: 82 * 1024 ** 3, avail: 18 * 1024 ** 3 }]));
    });
    const card = fixture.nativeElement.querySelector('widget-pool .fc-card') as HTMLElement;
    const body = fixture.nativeElement.querySelector('.pool-body') as HTMLElement;
    const rows = fixture.nativeElement.querySelectorAll('.pool-row') as NodeListOf<HTMLElement>;
    expect(fixture.nativeElement.querySelectorAll('widget-pool').length).toBe(1);
    expect(rows.length).toBe(8);
    expect(card.getBoundingClientRect().height).toBeCloseTo(400, 0);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(getComputedStyle(body).overflowY).toBe('auto');
    expect(rows[0].querySelector('.pool-name').textContent).toBe(longName);
    const inline = rows[0].querySelector('.pool-usage-line') as HTMLElement;
    expect(inline.textContent).toContain('82%');
    expect(inline.textContent).toContain('18 GiB');
    expect(inline.textContent).toContain('No I/O errors');
    expect(inline.textContent).not.toContain('No errors');
    const scan = inline.querySelector('.pool-scan-errors') as HTMLElement;
    expect(scan.textContent.replace(/\s+/g, ' ').trim()).toBe('· 4 scan errors');
    expect(scan.classList).toContain('has-errors');
    expect(fixture.nativeElement.querySelectorAll('.pool-scan-errors').length).toBe(1);
    expectOneRow(inline);
    expect(rows[1].querySelector('.pool-status').classList).toContain('bad');
    expect(rows[1].querySelector('.pool-errors').textContent.replace(/\s+/g, ' ').trim()).toBe('2 I/O errors');
    expect(rows[2].textContent).toContain('Locked');
    expect(rows[2].textContent).toContain('Capacity unavailable');
    expect(rows[2].querySelector('.pool-bar-fill')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pool-meta, .pool-bar-note')).toBeNull();
    fixture.nativeElement.style.width = '360px';
    fixture.detectChanges();
    for (const row of rows) { expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1); }
    expect(card.getBoundingClientRect().height).toBeCloseTo(400, 0);
    (fixture.nativeElement.querySelector('[aria-label="Pools"]') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['storage/pools']);

    // Input replacement updates the same card and drops removed pools.
    dashboard.pools = [dashboard.pools[1]];
    dashboard.volumeData = { 'pool-1': { used: 0, avail: 1024 ** 3 } };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.pool-row').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.pool-used').textContent).toContain('0%');
    dashboard.pools = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pool-empty').textContent).toContain('No pools');
  });

  it('marks a pool at or above 80% on the used value itself instead of repeating it underneath', () => {
    const capacity = (percent: number) => ({ used: percent * 1024 ** 3, avail: (100 - percent) * 1024 ** 3 });
    render(['Pools'], 700, (component) => {
      component.pools = [79, 80, 90].map((percent) => ({
        name: `pool-${percent}`, status: 'ONLINE', healthy: true, is_decrypted: true, topology: null,
      }));
      component.volumeData = Object.fromEntries([79, 80, 90].map((percent) => [`pool-${percent}`, capacity(percent)]));
    });
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.pool-row')) as HTMLElement[];
    expect(rows[0].querySelector('.label-icon')).toBeNull();
    for (const [row, state, value] of [[rows[1], 'warn', '80%'], [rows[2], 'danger', '90%']] as [HTMLElement, string, string][]) {
      const line = row.querySelector('.pool-usage-line') as HTMLElement;
      const marks = Array.from(line.querySelectorAll('.label-icon')) as HTMLElement[];
      expect(marks.length).withContext(`${value} marks`).toBe(1);
      expect(marks[0].classList).toContain(state);
      expect(marks[0].parentElement.classList).toContain('pool-used');
      expect(marks[0].textContent.trim()).toBe('warning');
      // Size comes from the shared .label-icon law; the card contributes placement only.
      expect(getComputedStyle(marks[0]).fontSize).toBe('16px');
      // The percentage is stated once, on the line the mark qualifies.
      expect(row.textContent.match(new RegExp(value, 'g')).length).withContext(`${value} occurrences`).toBe(1);
      expect(row.querySelector('.pool-bar-fill').classList).toContain(state);
      expectOneRow(line);
    }
    expect(fixture.nativeElement.querySelector('.pool-bar-note')).toBeNull();
  });

  it('keeps one Pools mobile launcher, normal detail flow, and return focus', fakeAsync(() => {
    width.and.returnValue(599);
    media.next([{ mqAlias: 'xs' }]);
    const dashboard = render(['Pools'], 360, (component) => {
      component.pools = [{ name: 'tank', status: 'ONLINE', healthy: true, topology: null }];
    });
    const launcher = fixture.nativeElement.querySelector('.widget-launcher-button') as HTMLButtonElement;
    expect(launcher.textContent).toContain('Pools');
    expect(fixture.nativeElement.querySelectorAll('.widget-launcher-button').length).toBe(1);
    launcher.focus();
    launcher.click();
    fixture.detectChanges();
    tick();
    const back = fixture.nativeElement.querySelector('[data-dashboard-back]') as HTMLButtonElement;
    expect(document.activeElement).toBe(back);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.pool-body')).maxHeight).toBe('none');
    expect(fixture.nativeElement.querySelector('.pool-usage-line').textContent).toContain('I/O errors unavailable');
    expect(fixture.nativeElement.querySelector('.pool-usage-line').textContent).toContain('Capacity unavailable');
    back.click();
    fixture.detectChanges();
    tick();
    expect(dashboard.activeMobileWidget).toEqual([]);
    expect(document.activeElement).toBe(launcher);
  }));

  it('moves focus into mobile detail, hides the launcher, and returns to the same action across 599/600', fakeAsync(() => {
    width.and.returnValue(599);
    media.next([{ mqAlias: 'xs' }]);
    const dashboard = render(['Network'], 567);
    const launcher: HTMLButtonElement = fixture.nativeElement.querySelector('.widget-launcher-button');
    launcher.focus();
    launcher.click();
    fixture.detectChanges();
    tick();
    const back: HTMLButtonElement = fixture.nativeElement.querySelector('[data-dashboard-back]');
    expect(document.activeElement).toBe(back);
    const controller: HTMLElement = fixture.nativeElement.querySelector('widget-controller');
    expect(controller.hidden).toBeTrue();
    expect(controller.hasAttribute('inert')).toBeTrue();
    expect(getComputedStyle(controller).display).toBe('none');
    back.click();
    fixture.detectChanges();
    tick();
    expect(document.activeElement).toBe(launcher);
    expect(fixture.nativeElement.querySelector('.mobile-widget-container').hidden).toBeTrue();
    launcher.click();
    fixture.detectChanges();
    tick();
    width.and.returnValue(600);
    media.next([{ mqAlias: 'sm' }]);
    fixture.detectChanges(); // The media observer may remove Back before the window event.
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    tick();
    expect(dashboard.activeMobileWidget).toEqual([]);
    expect(fixture.nativeElement.querySelector('.mobile-viewport')).toBeNull();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.widgets-wrapper'));
    width.and.returnValue(599);
    media.next([{ mqAlias: 'xs' }]);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    tick();
    expect((document.activeElement as HTMLElement).classList.contains('widget-launcher-button')).toBeTrue();
    expect(getComputedStyle(fixture.nativeElement.querySelector('.mobile-viewport')).position).toBe('static');
  }));

  it('keeps CPU sensor absence explicit and wraps every thread instead of overflowing a narrow card', () => {
    render(['CPU'], 360);
    const cpu = fixture.debugElement.query(By.directive(WidgetCpuComponent)).componentInstance as WidgetCpuComponent;
    Object.assign(cpu, { avgUsage: 4, coreCount: 128, threadUsage: Array(128).fill(4), usageMax: 4, usageMaxThreads: [0] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No temperature sensor');
    const bars: HTMLElement = fixture.nativeElement.querySelector('.thread-bars');
    expect(bars.children.length).toBe(128);
    expect(bars.scrollWidth).toBeLessThanOrEqual(bars.clientWidth + 1);
    expect(new Set(Array.from(bars.children).map((bar) => Math.round(bar.getBoundingClientRect().top))).size).toBeGreaterThan(1);
    expect(bars.children[0].getAttribute('aria-label')).toContain('Thread 0');
  });

  it('uses the compact CPU body on mobile with real lowest/coolest data and explicit sensor absence, preserving desktop facts', fakeAsync(() => {
    width.and.returnValue(390);
    media.next([{ mqAlias: 'xs' }]);
    const model = 'A complete CPU model identifier with enough detail to wrap inside a narrow mobile card';
    const dashboard = render(['CPU'], 358, (page) => { page.systemInformation.model = model; });
    (fixture.nativeElement.querySelector('.widget-launcher-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    tick();
    const sample = {
      average: { usage: 26.25 }, temperature: [], temperature_celsius: { 0: 60, 1: 71, 2: 52, 3: 71 },
      0: { usage: 0 }, 1: { usage: 70 }, 2: { usage: 20 }, 3: { usage: 15 },
    };
    dashboard.statsDataEvents.next({ name: 'CpuStats', data: sample });
    fixture.detectChanges();
    const cpu = fixture.debugElement.query(By.directive(WidgetCpuComponent)).componentInstance as WidgetCpuComponent;
    expect(cpu.screenType).toBe('Mobile');
    expect(cpu.coreCount).toBe(4);
    const body = fixture.nativeElement.querySelector('.cpu-body') as HTMLElement;
    const subtitle = body.querySelector('.cpu-subtitle') as HTMLElement;
    const average = body.querySelector('.cpu-hero') as HTMLElement;
    const facts = body.querySelector('dl.cpu-facts') as HTMLElement;
    const strip = body.querySelector('.thread-strip') as HTMLElement;
    const text = (element: Element): string => element.textContent.replace(/\s+/g, ' ').trim();
    const factValues = (): Record<string, string> => Object.fromEntries(
      Array.from(fixture.nativeElement.querySelectorAll('.cpu-facts dt') as NodeListOf<HTMLElement>)
        .map((term) => [text(term), text(term.nextElementSibling)]),
    );
    expect(text(subtitle)).toContain(model);
    expect(text(subtitle)).toContain('4 threads');
    expect(text(average)).toContain('26% avg');
    expect(Object.keys(factValues())).toEqual(['Highest', 'Lowest Usage', 'Hottest', 'Coolest']);
    expect(factValues().Highest).toContain('70% · thread 1');
    expect(factValues()['Lowest Usage']).toBe('0% · thread 0');
    expect(factValues().Hottest).toContain('71°C · 2 cores');
    expect(factValues().Coolest).toBe('52°C · core 2');
    expect(body.querySelectorAll('mat-list, mat-list-item, .mobile-list, .list-subheader').length).toBe(0);
    expect(body.querySelectorAll('.thread-bar').length).toBe(4);
    expect(body.querySelectorAll('.thread-bar')[2].getAttribute('aria-label')).toBe('Thread 2 · 20% · 52°C');
    const checkCompactBounds = (): void => {
      const ordered = [subtitle, average, facts, strip];
      ordered.forEach((element, index) => {
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
        expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(body.getBoundingClientRect().right + 1);
        if (index > 0) {
          expect(element.getBoundingClientRect().top).toBeGreaterThanOrEqual(ordered[index - 1].getBoundingClientRect().bottom - 1);
        }
      });
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
      expect(body.closest('.fc-card').scrollWidth).toBeLessThanOrEqual(body.closest('.fc-card').clientWidth + 1);
    };
    checkCompactBounds();
    fixture.nativeElement.style.width = '567px';
    width.and.returnValue(599);
    fixture.detectChanges();
    checkCompactBounds();
    // A later sample with no sensor must remove the thermal minimum and every
    // bar temperature, while preserving the mobile usage minimum and model.
    dashboard.statsDataEvents.next({ name: 'CpuStats', data: { ...sample, temperature_celsius: [] } });
    fixture.detectChanges();
    expect(Object.keys(factValues())).toEqual(['Highest', 'Lowest Usage', 'Hottest']);
    expect(factValues().Hottest).toBe('No temperature sensor');
    expect(factValues()['Lowest Usage']).toBe('0% · thread 0');
    expect(text(body)).not.toContain('Infinity');
    expect(body.querySelectorAll('.thread-bar')[2].getAttribute('aria-label')).toBe('Thread 2 · 20%');
    expect(text(subtitle)).toContain(model);
    checkCompactBounds();
    width.and.returnValue(600);
    media.next([{ mqAlias: 'sm' }]);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    tick();
    dashboard.statsDataEvents.next({ name: 'CpuStats', data: sample });
    fixture.detectChanges();
    expect(Object.keys(factValues())).toEqual(['Highest', 'Hottest']);
    expect(factValues().Highest).toContain('70% · thread 1');
    expect(factValues().Hottest).toContain('71°C · 2 cores');
    expect(fixture.nativeElement.querySelector('[data-dashboard-back]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.thread-bar').length).toBe(4);
    expect(text(fixture.nativeElement.querySelector('.cpu-subtitle'))).toContain('4 threads');
  }));

  it('keeps the disabled HA standby action', () => {
    const dashboard = render(['System Information(standby)'], 360);
    dashboard.isHA = true;
    fixture.detectChanges();
    const system = fixture.debugElement.query(By.directive(WidgetSysInfoComponent)).componentInstance as WidgetSysInfoComponent;
    system.ready = true;
    system.ha_status = 'HA Disabled';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('simple-failover-button button').disabled).toBeTrue();
    // the internal development record: the vestigial flip side (and its hidden Flip button) no longer renders at all.
    expect(fixture.nativeElement.querySelector('.card-container > .back')).toBeNull();
  });
  it('discloses truncated Network names and IP/media on focus and hover with Escape dismissal', async () => {
    const name = 'physical-interface-name-that-does-not-fit-the-narrow-cell';
    const ip = '2001:db8:1234:5678:90ab:cdef:1234:5678';
    const mediaName = 'physical-interface-without-an-address';
    const mediaDescription = 'Ethernet media description that is longer than the narrow metadata cell';
    render(['Network'], 360, (dashboard) => {
      dashboard.nics = [
        { name, type: 'PHYSICAL', state: { link_state: 'LINK_STATE_UP', aliases: [{ type: 'INET6', address: ip, netmask: 64 }, { type: 'INET', address: '192.0.2.1', netmask: 24 }] } },
        { name: mediaName, type: 'PHYSICAL', state: { link_state: 'LINK_STATE_UP', aliases: [], active_media_subtype: mediaDescription } },
      ];
    });
    await fixture.whenStable();
    const networkRows = fixture.nativeElement.querySelectorAll('button.net-row') as NodeListOf<HTMLButtonElement>;
    const clipped = [networkRows[0].querySelector('.if-name'), networkRows[0].querySelector('.if-address'),
      networkRows[1].querySelector('.if-address')] as HTMLElement[];
    clipped.forEach((cell) => expect(cell.scrollWidth).toBeGreaterThan(cell.clientWidth));
    const triggers: [HTMLElement, string[]][] = [
      [networkRows[0], [name, ip + '/64', '+1']], [networkRows[1], [mediaName, mediaDescription]],
    ];
    for (const [trigger, expected] of triggers) {
      const matches = trigger.matches.bind(trigger);
      spyOn(trigger, 'matches').and.callFake(((query: string): boolean => (
        query === ':focus-visible' || matches(query)
      )) as typeof trigger.matches);
      trigger.focus();
      await new Promise((resolve) => setTimeout(resolve, 180));
      fixture.detectChanges();
      let tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
      expect(tooltip).not.toBeNull();
      expected.forEach((text) => expect(tooltip.textContent).toContain(text));
      expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      trigger.blur();
      trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await new Promise((resolve) => setTimeout(resolve, 180));
      fixture.detectChanges();
      tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
      expected.forEach((text) => expect(tooltip.textContent).toContain(text));
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    }
  }, 8000);

  it('keeps actual native focus rings above 3:1 on every registered card and matching hover surface', () => {
    // the internal development record: the per-interface card is gone; the Network card's rows still come from the nics.
    render(['Network'], 1000, (dashboard) => {
      const aliases = [{ type: 'INET', address: '192.0.2.1', netmask: 24 }, { type: 'INET', address: '192.0.2.2', netmask: 24 }];
      dashboard.nics = [{ name: 'vtnet0', type: 'PHYSICAL', state: { name: 'vtnet0', aliases, link_state: 'LINK_STATE_UP', vlans: [], lagg_ports: [] } }];
    });
    fixture.detectChanges();
    // Render the real launcher in the same Dashboard style scope, alongside
    // the real desktop controls, so both custom button families are read.
    const launcher = TestBed.createComponent(WidgetControllerComponent);
    launcher.componentInstance.dashState = [{ name: 'Network', rendered: true }];
    // Angular's test renderer removes previous root elements when creating a
    // second fixture. Restore the Dashboard host before measuring/focusing it.
    document.body.appendChild(fixture.nativeElement);
    fixture.nativeElement.appendChild(launcher.nativeElement);
    launcher.detectChanges();
    expect(fixture.nativeElement.isConnected).withContext('Dashboard fixture attached').toBeTrue();
    expect(launcher.nativeElement.isConnected).withContext('Launcher fixture attached').toBeTrue();
    const root = document.documentElement;
    const previousStyle = root.style.cssText;
    const previousDark = root.classList.contains('dark');
    const themes = new ThemeService({} as any, TestBed.inject(WebSocketService), TestBed.inject(CoreService), {} as any, router);
    const probe = document.createElement('span');
    fixture.nativeElement.appendChild(probe);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const luminance = (layers: string[]): number => {
      context.clearRect(0, 0, 1, 1);
      layers.forEach((color) => { context.fillStyle = color; context.fillRect(0, 0, 1, 1); });
      const channels = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    // PointerEvent does not activate CSS :hover. Read matching real stylesheet
    // declarations instead, then resolve/composite their actual computed color
    // on the same card.
    const hoverPaints = (element: HTMLElement): string[] => {
      const paints: string[] = [];
      const visit = (rules: CSSRuleList): void => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover')) {
            // Custom-property background shorthands do not populate the
            // backgroundColor longhand in CSSOM until computed on an element.
            const paint = rule.style.backgroundColor || rule.style.background;
            if (paint && element.matches(rule.selectorText.replace(/:hover/g, ''))) { paints.push(paint); }
          } else if ((rule as CSSGroupingRule).cssRules) { visit((rule as CSSGroupingRule).cssRules); }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try { visit(sheet.cssRules); } catch { /* External font stylesheets can be inaccessible. */ }
      }
      return paints;
    };
    const selectors = ['.widget-launcher-button', 'button.net-row'];
    try {
      expect(themes.freenasThemes.length).toBeGreaterThan(1);
      for (const theme of themes.freenasThemes) {
        themes.setCssVars(theme);
        for (const selector of selectors) {
          const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
          expect(button.isConnected).withContext(`${selector} attached before focus/color checks`).toBeTrue();
          button.focus();
          expect(button.matches(':focus-visible')).withContext(`${theme.name} ${selector}`).toBeTrue();
          const ring = getComputedStyle(button);
          expect(ring.outlineStyle).toBe('solid');
          expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
          expect(Number(ring.opacity)).toBe(1);
          const card = getComputedStyle(button.closest('.fc-card')).backgroundColor;
          const hoverBackgrounds = hoverPaints(button);
          expect(hoverBackgrounds.length).withContext(`${selector} matching hover rules`).toBeGreaterThan(0);
          const backgrounds = [ring.backgroundColor, ...hoverBackgrounds];
          for (const paint of backgrounds) {
            probe.style.background = paint;
            const layers = [card, getComputedStyle(probe).backgroundColor];
            const background = luminance(layers);
            const foreground = luminance([...layers, ring.outlineColor]);
            const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
            expect(ratio).withContext(`${theme.name} ${selector} on ${paint}`).toBeGreaterThanOrEqual(3);
          }
          button.blur();
        }
      }
    } finally {
      launcher.destroy();
      root.style.cssText = previousStyle;
      root.classList.toggle('dark', previousDark);
    }
  });

  it('does not retain media or realtime subscribers after mobile detail and page teardown', fakeAsync(() => {
    width.and.returnValue(599);
    media.next([{ mqAlias: 'xs' }]);
    const oldResize = window.onresize;
    const dashboard = render(['CPU']);
    dashboard.onMobileLaunch(dashboard.dashState[0]);
    fixture.detectChanges();
    tick();
    expect(dashboard.statsDataEvents.observed).toBeTrue();
    dashboard.onMobileBack();
    fixture.detectChanges();
    tick();
    expect(dashboard.statsDataEvents.observed).toBeFalse();
    fixture.destroy();
    expect(media.observed).toBeFalse();
    expect(window.onresize).toBe(oldResize);
    tick(100);
  }));
});
