import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { WidgetSysInfoComponent } from 'app/core/components/widgets/widgetsysinfo/widgetsysinfo.component';
import { CoreService } from 'app/core/services/core.service';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { DialogService, SystemGeneralService, WebSocketService } from 'app/services';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { LocaleService } from 'app/services/locale.service';
import { ThemeService } from 'app/services/theme/theme.service';
import { DashboardComponent } from './dashboard.component';

// the internal development record: the widget header strip is a plain div.fc-card-header, no longer a
// <mat-toolbar-row>. Material's row sheet only loads with a <mat-toolbar> (the topbar), which this
// harness never renders -- so every row declaration asserted here comes from the app's own rules.
describe('Dashboard card header strip', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let media: BehaviorSubject<any[]>;
  let width: jasmine.Spy;

  beforeEach(waitForAsync(() => {
    media = new BehaviorSubject([{ mqAlias: 'md' }]);
    width = spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    const core = { register: () => NEVER, unregister: jasmine.createSpy('unregister'), emit: jasmine.createSpy('emit') };
    spyOn<any>(CoreServiceInjector, 'get').and.callFake((token: unknown) => token === ThemeService
      ? { currentTheme: () => ({ accentColors: [] }), isDefaultTheme: true }
      : core);
    spyOn(window, 'ResizeObserver').and.callFake(() => ({ observe: () => undefined, unobserve: () => undefined, disconnect: () => undefined }));
    TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [CoreComponents, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: CoreService, useValue: core },
        { provide: WebSocketService, useValue: { call: () => NEVER, sub: () => NEVER } },
        { provide: LayoutMediaObserver, useValue: { asObservable: () => media } },
        { provide: SystemGeneralService, useValue: { updateRunning: of('false') } },
        { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: { confirm: jasmine.createSpy('confirm').and.returnValue(of(false)) } },
      ],
    }).compileComponents();
  }));

  function render(names: string[], hostWidth: number, prepare?: (dashboard: DashboardComponent) => void): DashboardComponent {
    fixture = TestBed.createComponent(DashboardComponent);
    const dashboard = fixture.componentInstance;
    spyOn(dashboard, 'ngOnInit');
    Object.assign(dashboard, {
      pools: [], nics: [], volumeData: {}, sysinfoReady: true, gpus: [],
      systemInformation: { model: 'CPU model', ecc_memory: false },
      dashState: names.map((name) => ({ name, rendered: true })),
    });
    prepare?.(dashboard);
    fixture.nativeElement.style.width = `${hostWidth}px`;
    fixture.nativeElement.style.setProperty('--line', '#2A353D'); // the ladder value --fc-line reads
    fixture.nativeElement.classList.add('fc-ui');
    fixture.detectChanges();
    return dashboard;
  }

  afterEach(() => fixture?.destroy());

  // The row Material used to supply, plus the card law's strip (#431): 48px, 16px lead, 8px tail.
  function expectStrip(header: HTMLElement, context: string): void {
    const style = getComputedStyle(header);
    expect(header.tagName).withContext(context).toBe('DIV');
    expect(style.display).withContext(context).toBe('flex');
    expect(style.flexDirection).withContext(context).toBe('row');
    expect(style.alignItems).withContext(context).toBe('center');
    expect(style.boxSizing).withContext(context).toBe('border-box');
    expect(style.whiteSpace).withContext(context).toBe('nowrap');
    expect(style.height).withContext(context).toBe('48px');
    expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).withContext(context)
      .toEqual(['0px', '8px', '0px', '16px']);
    expect(style.borderBottomWidth).withContext(context).toBe('1px');
    expect(style.borderBottomStyle).withContext(context).toBe('solid');
    expect(style.borderBottomColor).withContext(context).toBe('rgb(42, 53, 61)');
    expect(style.borderTopLeftRadius).withContext(context).toBe('6px');
    expect(style.backgroundColor).withContext(context).toBe('rgba(0, 0, 0, 0)');
    expect(header.getBoundingClientRect().width).withContext(context).toBeCloseTo(header.parentElement.clientWidth, 0);
  }

  // The title keeps the dashboard's title law (500, not #301's 600) and inherits the strip's nowrap;
  // the actions sit against the 8px tail on the title's line.
  function expectTitleAndActions(header: HTMLElement, context: string): void {
    const title = header.querySelector('.card-title-text') as HTMLElement;
    const titleStyle = getComputedStyle(title);
    expect(titleStyle.whiteSpace).withContext(context).toBe('nowrap');
    expect(titleStyle.fontSize).withContext(context).toBe('15px');
    expect(titleStyle.fontWeight).withContext(context).toBe('500');
    expect(titleStyle.marginTop).withContext(context).toBe('0px');
    const strip = header.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    expect(titleBox.left - strip.left).withContext(`${context} title lead`).toBeCloseTo(16, 0);
    const controls = header.querySelector('.controls') as HTMLElement;
    if (!controls) { return; }
    const actions = controls.getBoundingClientRect();
    expect(strip.right - actions.right).withContext(`${context} actions tail`).toBeCloseTo(8, 0);
    expect(actions.top).withContext(`${context} one line`).toBeLessThan(titleBox.bottom);
    expect(titleBox.top).withContext(`${context} one line`).toBeLessThan(actions.bottom);
  }

  it('draws the System, CPU, Memory and Pools headers as one plain strip', () => {
    render(['System Information', 'CPU', 'Memory', 'Pools'], 1400);
    const system = fixture.debugElement.query(By.directive(WidgetSysInfoComponent)).componentInstance as WidgetSysInfoComponent;
    Object.assign(system, { ready: true, isPassive: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-toolbar-row')).toBeNull();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.stats-widget .fc-card-header') as NodeListOf<HTMLElement>);
    expect(headers.map((header) => header.querySelector('.card-title-text').textContent.trim()))
      .toEqual(['System', 'CPU', 'Memory', 'Pools']);
    for (const header of headers) {
      const context = header.querySelector('.card-title-text').textContent.trim();
      expectStrip(header, context);
      expectTitleAndActions(header, context);
      expect(header.querySelector('.controls')).withContext(`${context} actions`).not.toBeNull();
    }
  });

  it('keeps the phone launcher and an opened card on the same strip, back action and title on one line', fakeAsync(() => {
    width.and.returnValue(390);
    media.next([{ mqAlias: 'xs' }]);
    render(['CPU'], 358);
    expect(fixture.nativeElement.querySelector('mat-toolbar-row')).toBeNull();
    const launcherHeader = fixture.nativeElement.querySelector('.widget-launcher .fc-card-header') as HTMLElement;
    expectStrip(launcherHeader, 'launcher');
    expectTitleAndActions(launcherHeader, 'launcher');

    (fixture.nativeElement.querySelector('.widget-launcher-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    tick();
    const header = fixture.nativeElement.querySelector('.mobile-viewport .stats-widget:not(.widget-launcher) .fc-card-header') as HTMLElement;
    expectStrip(header, 'CPU detail');
    const back = header.querySelector('[data-dashboard-back]') as HTMLElement;
    const title = header.querySelector('.card-title-text') as HTMLElement;
    expect(back.getBoundingClientRect().top).toBeLessThan(title.getBoundingClientRect().bottom);
    expect(title.getBoundingClientRect().top).toBeLessThan(back.getBoundingClientRect().bottom);
    expect(back.getBoundingClientRect().right).toBeLessThanOrEqual(title.getBoundingClientRect().left);
  }));
});
