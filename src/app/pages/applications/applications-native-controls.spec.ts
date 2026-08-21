import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { NEVER, of, throwError, Subject } from 'rxjs';
import { getDebugNode } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BrnTabsImports } from '@spartan-ng/brain/tabs';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';
import { MaterialModule } from '../../appMaterial.module';
import { PreferencesService } from '../../core/services/preferences.service';
import { ApiService } from '../../core/services/api.service';
import { CoreService } from '../../core/services/core.service';
import { DialogService, RestService, WebSocketService } from '../../services';
import { ThemeService } from '../../services/theme/theme.service';
import { EntityModule } from '../common/entity/entity.module';
import { ApplicationsComponent } from './applications.component';
import { ApplicationsStore } from './applications.store';
import { CatalogListComponent } from './catalog-list/catalog-list.component';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';
import {
  expandInstalledRow, installedAction, installedDetail, installedTableProviders, publishInstalledRecords, settleInstalledTable, clearDialogs, dialogRoot,
} from './installed-applications-testing';

// the internal development record/#534: the page declares the catalog list child and the helm form kit
const HELM_KIT = [HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports, HlmFieldImports, HlmInputImports, HlmInputGroupImports,
  HlmSelectImports, HlmCheckboxImports, HlmLabelImports, HlmSpinnerImports, HlmTextareaImports, HlmRadioGroupImports,
  BrnTabsImports]; // the internal development record: Catalog / Installed

describe('Applications native presentation', () => {
  let store: any;
  beforeEach(async () => {
    store = {
      load: () => {}, clearLogs: () => {}, catalog: [], installed: [], pools: [], providers: [],
      config: { configured: true }, selectedDetail: null, activeJob: null,
    };
    publishInstalledRecords(store);
    await TestBed.configureTestingModule({
      declarations: [ApplicationsComponent, CatalogListComponent, InstalledApplicationsComponent],
      imports: [CommonModule, FormsModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), ...HELM_KIT],
      providers: [
        ...installedTableProviders(),
        { provide: ApplicationsStore, useValue: store },
        { provide: DialogService, useValue: {} }, { provide: Router, useValue: { events: NEVER, url: '/applications' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
      ],
    }).compileComponents();
  });
  afterEach(() => { clearDialogs(); TestBed.resetTestingModule(); });

  it('distinguishes the initial empty catalog from a filter with no matches', () => {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Use Update Catalog');
    expect(fixture.nativeElement.textContent).not.toContain('No matching applications');
    store.catalog = [{ id: 'one', title: 'Mail', name: 'mail', status: 'AVAILABLE' }];
    fixture.componentInstance.search = 'unknown';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching applications');
    expect(fixture.nativeElement.textContent).not.toContain('Use Update Catalog');
  });

  it('renders known catalog icon tokens using native Material glyphs and keeps an unknown token inert', () => {
    store.catalog = [':material-email:', ':material-speedometer:', ':unknown:<img src=x>'].map((icon, index) => ({
      id: String(index), title: 'Application', name: String(index), icon, status: 'AVAILABLE',
    }));
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    const icons = fixture.nativeElement.querySelectorAll('.catalog-row .row-icon .mat-icon');
    expect(Array.from(icons).map((icon: HTMLElement) => icon.textContent.trim())).toEqual(['email', 'speed', 'extension']);
    expect(fixture.nativeElement.querySelector('.catalog-row img')).toBeNull();
  });

  // the internal development record: the tab bar is the shell's (#375: active fg1, inactive fg2, a 1px fg2 indicator),
  // the same bar iSCSI has; the page carries no tab tokens of its own. the internal development record: off mat-tab-group --
  // brain tabs drawn as the shell's `.fc-tab-bar` (#479), stretched halves with the underline.
  it('takes the shell tab vocabulary and carries no tab tokens of its own', () => {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.nativeElement.classList.add('fc-ui');
    fixture.nativeElement.style.setProperty('--fg1', 'rgb(238, 238, 238)');
    fixture.nativeElement.style.setProperty('--fg2', 'rgb(150, 160, 170)');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-tab-group, .mat-mdc-tab-header, .mat-mdc-tab-body')).toBeNull();
    const tabs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role=tab]'));
    expect(tabs.length).toBe(2);
    const bar = tabs[0].closest('[role=tablist]');
    expect(Array.from(bar.classList)).toEqual(jasmine.arrayContaining(['fc-tab-bar', 'fc-tab-bar--stretch', 'fc-tab-bar--underline']));
    expect(getComputedStyle(tabs[0]).color).toBe('rgb(238, 238, 238)'); // the active tab, fg1
    expect(getComputedStyle(tabs[1]).color).toBe('rgb(150, 160, 170)'); // the inactive tab, fg2
    expect(getComputedStyle(tabs[0], '::after').borderTopColor).toBe('rgb(150, 160, 170)'); // the fg2 underline
    expect(getComputedStyle(tabs[1], '::after').content).toBe('none');
    expect(tabs.map((tab) => tab.textContent.trim())).toEqual(['Installed (0)', 'Catalog']); // the internal development record
    expect(fixture.nativeElement.querySelector('.applications-shell').classList).not.toContain('mat-card'); // no card box
    expect(fixture.nativeElement.querySelector('header.fc-page-header h1.fc-page-title')).not.toBeNull();
  });

  // the internal development record: what mat-tab-group did -- a tablist of tabs controlling panes that are no Tab stop of their
  // own; the arrow keys move focus without switching (Enter / Space / a click switch); both panes keep their state
  // across switches. the internal development record: Installed is the first tab and the page opens on it.
  it('keeps the tab group behaviour: aria wiring, manual activation, Installed first and open, preserved panes', () => {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const tabs: HTMLElement[] = Array.from(root.querySelectorAll('[role=tab]'));
    const panes: HTMLElement[] = Array.from(root.querySelectorAll('[role=tabpanel]'));
    expect(panes.length).toBe(2);
    tabs.forEach((tab, i) => {
      expect(tab.getAttribute('aria-controls')).toBe(panes[i].id);
      expect(panes[i].getAttribute('aria-labelledby')).toBe(tab.id);
      expect(panes[i].hasAttribute('tabindex')).toBeFalse();
    });
    expect(fixture.componentInstance.selectedTab).toBe('installed');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect([panes[0].hidden, panes[1].hidden]).toEqual([false, true]);
    expect(panes[0].querySelector('app-installed-applications')).not.toBeNull(); // the page opens on Installed

    tabs[0].focus();
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(arrow, 'keyCode', { get: () => 39 });
    tabs[0].dispatchEvent(arrow);
    fixture.detectChanges();
    expect(document.activeElement).toBe(tabs[1]);
    expect(fixture.componentInstance.selectedTab).toBe('installed'); // focus moved, nothing switched

    const catalogSection = panes[1].querySelector('section.tab-content');
    tabs[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTab).toBe('catalog');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect([panes[0].hidden, panes[1].hidden]).toEqual([true, false]);
    expect(panes[1].querySelector('section.tab-content')).toBe(catalogSection); // the same Catalog

    fixture.componentInstance.selectedTab = 'installed'; // the page switches back itself (an install finished)
    fixture.detectChanges();
    expect([panes[0].hidden, panes[1].hidden]).toEqual([false, true]);
    expect(panes[0].querySelector('app-installed-applications')).not.toBeNull(); // Installed stays rendered
    tabs[1].click();
    fixture.detectChanges();
    expect(panes[1].querySelector('section.tab-content')).toBe(catalogSection); // the Catalog kept across switches
  });

  async function installedRow(health: string | null, healthDeclared?: boolean) {
    store.installed = [{ name: 'speed', image: 'test', running: true, health, health_declared: healthDeclared,
      status: 'RUNNING', restart_policy: 'always' }];
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    return fixture;
  }

  it('uses jail state wording in the table and search while retaining exceptional states and raw records', async () => {
    const cases: [string, string | null, boolean, string][] = [
      ['active-app', 'RUNNING', true, 'up'],
      ['exited-app', 'EXITED', false, 'down'],
      ['stopped-app', 'STOPPED', false, 'down'],
      ['paused-app', 'PAUSED', true, 'paused'],
      ['recovering-app', 'RESTARTING', false, 'restarting'],
      ['failed-app', 'ERROR', false, 'error'],
      ['unknown-app', null, false, 'unknown'],
      ['future-app', 'FUTURE_STATE', false, 'future_state'],
    ];
    store.installed = cases.map(([name, status, running]) => ({
      name, status, running, image: 'test', restart_policy: 'no',
      error: name === 'failed-app' ? 'Runtime is unavailable.' : null,
    }));
    const original = JSON.stringify(store.installed);
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    const table = await settleInstalledTable(fixture);
    // the Installed pane's filter: the Catalog pane is in the DOM too (hidden), as mat-tab-group's was once visited (#480)
    const input = fixture.nativeElement.querySelector('.installed-content .fc-table-search input') as HTMLInputElement;
    const filter = async (value: string) => {
      input.value = value;
      input.dispatchEvent(new KeyboardEvent('keyup', { key: value.slice(-1), bubbles: true }));
      await settleInstalledTable(fixture);
    };
    for (const [name, , , label] of cases) {
      // Bring each row into the real virtual table viewport before inspecting its cell.
      await filter(name);
      expect(table.currentRows.map((row) => row.name)).toEqual([name]);
      const expected = name === 'failed-app' ? `${label} — Runtime is unavailable.` : label;
      expect(fixture.nativeElement.querySelector(`[id^="${name}_State_"]`).textContent.trim())
        .withContext(name).toBe(expected);
    }
    for (const [query, expected] of [['up', ['active-app']], ['down', ['exited-app', 'stopped-app']]] as const) {
      await filter(query);
      expect(table.currentRows.map((row) => row.name)).withContext(query).toEqual([...expected]);
    }
    expect(JSON.stringify(store.installed)).toBe(original);
    fixture.destroy();
  });

  // the internal development record: Shell is a row action for a running application only, and
  // it goes to the web terminal page for that application by name.
  it('offers Shell for a running application and routes to its terminal page', async () => {
    const router = TestBed.inject(Router) as any;
    router.navigate = jasmine.createSpy('navigate');
    const fixture = await installedRow('HEALTHY');
    const details = await expandInstalledRow(fixture, 'speed');
    const shell = installedAction(details, 'speed', 'shell');
    expect(shell.textContent).toContain('Shell');
    shell.click();
    expect(router.navigate).toHaveBeenCalledWith(['/applications/shell', 'speed']);
  });

  it('offers no Shell for a stopped application', async () => {
    store.installed = [{ name: 'speed', image: 'test', running: false, health: 'UNKNOWN', status: 'STOPPED' }];
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const details = await expandInstalledRow(fixture, 'speed');
    expect(installedAction(details, 'speed', 'shell')).toBeNull();
    expect(installedAction(details, 'speed', 'start')).not.toBeNull();
    expect(installedAction(details, 'speed', 'restart')).toBeNull();
    expect(installedAction(details, 'speed', 'stop')).toBeNull();
  });

  it('omits health entirely when the application has no declared check', async () => {
    const fixture = await installedRow('UNDECLARED', false);
    const details = await expandInstalledRow(fixture, 'speed');
    expect(installedDetail(details, 'Health')).toBe('');
    expect(fixture.nativeElement.querySelector('.entity-table-status-icon')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No health check');
    expect(fixture.nativeElement.textContent).not.toContain('UNDECLARED');
    const table = await settleInstalledTable(fixture);
    expect(table.allColumns.some((column) => column.name === 'Health')).toBeFalse();
    fixture.destroy();
  });

  // the internal development record: a bare "Unknown" beside RUNNING read as a verdict on the
  // application. It is the container runtime's value, and it does not contradict the
  // startup check the catalog endpoint was used for.
  it('explains the absent runtime health result separately from the process state', async () => {
    const fixture = await installedRow('UNKNOWN', true);
    const details = await expandInstalledRow(fixture, 'speed');
    expect(installedDetail(details, 'Health')).toBe('');
    const icon = fixture.debugElement.query(By.css('.entity-table-status-icon'));
    expect(icon.nativeElement.textContent.trim()).toBe('help_outline');
    expect(icon.nativeElement.getAttribute('aria-label')).toBe('Health: Unknown');
    const hint = icon.injector.get(BrnTooltip).brnTooltip() as string;
    expect(hint).toContain('No runtime health result is available');
    expect(hint).toContain('does not contradict a successful startup check');
    // The process state is a separate observation and stays in its own column.
    expect(fixture.nativeElement.querySelector('[id^="speed_State_"]').textContent.trim()).toBe('up');
    fixture.destroy();
  });

  it('distinguishes declared runtime results with a health icon beside the unchanged process state', async () => {
    const fixture = await installedRow('HEALTHY', true);
    for (const [health, glyph, tone, label] of [
      ['HEALTHY', 'check_circle', 'success', 'Healthy'],
      ['UNHEALTHY', 'error_outline', 'error', 'Unhealthy'],
      ['STARTING', 'schedule', 'warning', 'Starting'],
    ]) {
      store.installed = [{ ...store.installed[0], health }];
      await settleInstalledTable(fixture);
      const state = fixture.nativeElement.querySelector('[id^="speed_State_"]') as HTMLElement;
      const icon = state.parentElement.querySelector('.entity-table-status-icon') as HTMLElement;
      expect(state.textContent.trim()).withContext(health).toBe('up');
      expect(icon.textContent.trim()).withContext(health).toBe(glyph);
      expect(icon.classList.contains(`status-${tone}`)).withContext(health).toBeTrue();
      expect(icon.getAttribute('aria-label')).withContext(health).toBe(`Health: ${label}`);
      expect(fixture.nativeElement.querySelectorAll('.entity-table-status-icon').length).toBe(1);
    }
    fixture.destroy();
  });

  it('accepts only concrete legacy results and respects an explicit absent declaration', async () => {
    const fixture = await installedRow(null);
    const cases: [string | null, boolean | undefined, string | null][] = [
      ['HEALTHY', undefined, 'check_circle'],
      ['UNHEALTHY', undefined, 'error_outline'],
      ['STARTING', undefined, 'schedule'],
      ['UNKNOWN', undefined, null],
      [null, undefined, null],
      ['HEALTHY', false, null],
      ['UNDECLARED', true, null],
    ];
    for (const [health, declared, glyph] of cases) {
      store.installed = [{ ...store.installed[0], health, health_declared: declared }];
      await settleInstalledTable(fixture);
      const icon = fixture.nativeElement.querySelector('.entity-table-status-icon') as HTMLElement;
      expect(icon?.textContent.trim() || null).withContext(`${health}/${declared}`).toBe(glyph);
    }
    fixture.destroy();
  });

  it('keeps the small health glyphs readable on registered light themes and their hover surfaces', async () => {
    const fixture = await installedRow('HEALTHY', true);
    const root = document.documentElement;
    const previousStyle = root.style.cssText;
    const previousDark = root.classList.contains('dark');
    const themes = new ThemeService(TestBed.inject(RestService), TestBed.inject(WebSocketService),
      TestBed.inject(CoreService), {} as ApiService, TestBed.inject(Router));
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
    const surface = document.createElement('div');
    fixture.nativeElement.appendChild(surface);
    try {
      const lightThemes = themes.freenasThemes.filter((theme) => !themes.darkTest(theme.bg2));
      expect(lightThemes.length).toBeGreaterThan(0);
      for (const theme of lightThemes) {
        themes.setCssVars(theme);
        for (const health of ['HEALTHY', 'UNHEALTHY', 'STARTING']) {
          store.installed = [{ ...store.installed[0], health }];
          await settleInstalledTable(fixture);
          const icon = fixture.nativeElement.querySelector('.entity-table-status-icon') as HTMLElement;
          const foreground = luminance(getComputedStyle(icon).color);
          for (const token of ['bg0', 'bg1', 'bg2']) {
            for (const hover of [false, true]) {
              surface.style.backgroundColor = hover
                ? `color-mix(in srgb, var(--fg1) 5%, var(--${token}))` : `var(--${token})`;
              const background = luminance(getComputedStyle(surface).backgroundColor);
              const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
              expect(contrast).withContext(`${theme.name} ${health} ${token} hover=${hover}`).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }
    } finally {
      root.style.cssText = previousStyle;
      root.classList.toggle('dark', previousDark);
      fixture.destroy();
    }
  });

  it('drops stale health when stopped or undeclared while preserving the expanded application', async () => {
    const fixture = await installedRow('HEALTHY', true);
    const details = await expandInstalledRow(fixture, 'speed');
    expect(fixture.nativeElement.querySelector('.entity-table-status-icon').textContent.trim()).toBe('check_circle');
    store.installed = [{ ...store.installed[0], running: false, status: 'EXITED' }];
    await settleInstalledTable(fixture);
    expect(fixture.nativeElement.querySelector('.entity-table-status-icon')).toBeNull();
    expect(fixture.nativeElement.querySelector('[id^="speed_State_"]').textContent.trim()).toBe('down');
    expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
    store.installed = [{ ...store.installed[0], running: true, status: 'RUNNING', health: 'UNDECLARED', health_declared: false }];
    await settleInstalledTable(fixture);
    expect(fixture.nativeElement.querySelector('.entity-table-status-icon')).toBeNull();
    expect(fixture.nativeElement.querySelector('[id^="speed_State_"]').textContent.trim()).toBe('up');
    expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
    fixture.destroy();
  });

  it('resizes the real table scroller with its columns while preserving the expanded row', async () => {
    const fixture = await installedRow('UNDECLARED', false);
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:1200px';
    const details = await expandInstalledRow(fixture, 'speed');
    for (const width of [1200, 668, 368, 1000, 1030]) {
      fixture.nativeElement.style.width = `${width}px`;
      const table = await settleInstalledTable(fixture);
      const body = fixture.nativeElement.querySelector('datatable-body') as HTMLElement;
      const scroller = body.querySelector('datatable-scroller') as HTMLElement;
      const columnsWidth = table.table.bodyComponent.columns.reduce((sum, column) => sum + column.width, 0);
      expect(Math.round(scroller.getBoundingClientRect().width)).withContext(`${width}px scroller`)
        .toBe(Math.round(columnsWidth));
      // At phone width the columns' genuine minimum may scroll, but never a cached desktop width.
      expect(body.scrollWidth).withContext(`${width}px body`).toBe(Math.max(body.clientWidth, Math.round(columnsWidth)));
      // the internal development record: a column never shrinks under ngx's 150px start (it bleeds into the scroll
      // instead, as in 13.3), so the row's floor is the sum of max(150, minimum) plus the fixed columns
      // (970px here). Wherever that floor fits, the columns fit: a wider minimum is paid before the share,
      // not clamped up after it -- 1030px (a 982px table) used to come out 3px wide.
      const floor = table.table.bodyComponent.columns.reduce((sum, column) => sum
        + (column.canAutoResize === false ? column.width : Math.max(150, column.minWidth || 0)), 0);
      if (body.clientWidth >= floor) {
        expect(Math.round(columnsWidth)).withContext(`${width}px columns fit (floor ${floor})`).toBeLessThanOrEqual(body.clientWidth);
      } else {
        expect(width).withContext(`${width}px is under the floor ${floor}`).toBeLessThan(1030);
      }
      expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
      expect(installedAction(details, 'speed', 'logs')).not.toBeNull();
    }
    fixture.componentInstance.selectedTab = 'catalog';
    await settleInstalledTable(fixture);
    fixture.nativeElement.style.width = '668px';
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    const body = fixture.nativeElement.querySelector('app-installed-applications datatable-body') as HTMLElement;
    const table = fixture.nativeElement.querySelector('app-installed-applications');
    // the internal development record: six glance columns have a genuine minimum wider than 668px; what must not
    // survive the tab round-trip is a cached desktop width.
    const columnsWidth = Array.from(
      table.querySelectorAll('datatable-body-row:first-of-type datatable-body-cell') as NodeListOf<HTMLElement>,
      (cell) => cell.getBoundingClientRect().width,
    ).reduce((sum, width) => sum + width, 0);
    expect(body.scrollWidth).toBe(Math.max(body.clientWidth, Math.round(columnsWidth)));
    expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
    fixture.destroy();
  });

  it('renders health with saved column selections that predate the status indicator', async () => {
    TestBed.inject(PreferencesService).preferences.tableDisplayedColumns = JSON.parse(JSON.stringify([{
      title: 'Installed Applications', cols: [
        { name: 'State', prop: 'state_label' }, { name: 'Restart policy', prop: 'restart_policy' },
        { name: 'Health', prop: 'health_label' },
      ],
    }]));
    const fixture = await installedRow('HEALTHY', true);
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.datatable-header-cell-label'))
      .map((header: HTMLElement) => header.textContent.trim()).filter(Boolean);
    expect(headers).toEqual(['Name', 'State', 'Restart policy']);
    expect(fixture.nativeElement.querySelector('.entity-table-status-icon').textContent.trim()).toBe('check_circle');
    fixture.destroy();
  });

  // the internal development record: provenance and OS move into the engine's hidden-column details.
  async function installedRecord(extra: any) {
    store.installed = [{ name: 'speed', image: 'test', running: true, health: 'HEALTHY', status: 'RUNNING', ...extra }];
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    return fixture;
  }

  it('keeps the experimental OS and image provenance in the expanded details', async () => {
    let fixture = await installedRecord({ image_os: 'linux', origin: null });
    let details = await expandInstalledRow(fixture, 'speed');
    expect(installedDetail(details, 'OS')).toBe('Linux · experimental');
    expect(installedDetail(details, 'Source')).toBe('Unknown');
    fixture.destroy();

    fixture = await installedRecord({ image_os: 'freebsd', origin: { kind: 'byo', reference: 'registry.example/x:1' } });
    details = await expandInstalledRow(fixture, 'speed');
    expect(installedDetail(details, 'Source')).toBe('Unreviewed — registry.example/x:1');
    expect(installedDetail(details, 'OS')).toBe('FreeBSD');
    fixture.destroy();

    fixture = await installedRecord({ image_os: 'freebsd', origin: { kind: 'convert', reference: 'old-jail' } });
    expect(installedDetail(await expandInstalledRow(fixture, 'speed'), 'Source')).toBe('Converted — old-jail');
    fixture.destroy();

    fixture = await installedRecord({ image_os: 'freebsd', origin: null, catalog: { id: 'daemonless:speed' } });
    expect(installedDetail(await expandInstalledRow(fixture, 'speed'), 'Source')).toBe('Catalog — daemonless:speed');
    fixture.destroy();
  });

  it('explains a blocked Linux import and keeps the submit disabled without the acknowledgement', async () => {
    store.config = { configured: true, pool: 'tank', subnet: '10.88.0.0/16', linux_compat_enabled: false };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.openImport();
    fixture.componentInstance.importDraft.image = 'docker.io/library/alpine:3.20';
    fixture.componentInstance.importDraft.name = 'alpine';
    fixture.componentInstance.importDraft.image_os = 'linux';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const note = dialogRoot().querySelector('.import-linux-blocked'); // the internal development record: the import dialog
    expect(note).not.toBeNull();
    expect(note.textContent).toContain('Linux binary compatibility is off');
    expect((dialogRoot().querySelector('.import-submit') as HTMLButtonElement).disabled).toBeTrue();

    store.config.linux_compat_enabled = true;
    fixture.componentInstance.importDraft.acknowledged = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialogRoot().querySelector('.import-linux-blocked')).toBeNull();
    fixture.destroy();
  });

  it('makes the runtime health explanation keyboard accessible and dismissible with Escape', async () => {
    const fixture = await installedRow('HEALTHY', true);
    const icon = fixture.nativeElement.querySelector('.entity-table-status-icon') as HTMLElement;
    expect(icon.getAttribute('role')).toBe('img');
    expect(icon.getAttribute('aria-hidden')).toBe('false');
    expect(icon.tabIndex).toBe(0);
    expect(icon.getAttribute('aria-label')).toBe('Health: Healthy');
    // Simulate keyboard focus independently of previous tests' pointer history.
    const matches = icon.matches.bind(icon);
    spyOn(icon, 'matches').and.callFake(((selector: string): boolean => (
      selector === ':focus-visible' || matches(selector)
    )) as typeof icon.matches);
    icon.focus();
    await new Promise((resolve) => setTimeout(resolve, 180));
    fixture.detectChanges();
    const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(document.activeElement).toBe(icon);
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain('Health: Healthy. Reported by the container runtime.');
    expect(icon.getAttribute('aria-describedby')).toBe(tooltip.id);
    icon.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(icon.hasAttribute('aria-describedby')).toBeFalse();
    fixture.destroy();
  });
  it('calls the catalog endpoint a startup check and says it is not recurring', () => {
    store.selectedDetail = {
      title: 'Mail', available: true, image: null, ports: [], volumes: [], annotations: [],
      health: { type: 'HTTP', scheme: 'http', container_port: 15630, host_port: 15630, path: '/health' },
      environment: [], install: { name: 'mail', restart_policy: 'always', ports: [], environment: [], volumes: [] },
    };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.prepareReview(store.selectedDetail);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Startup check / Portal');
    expect(text).toContain('does not become a recurring probe');
    // The old heading conflated the one-time check with the installed row's value.
    expect(text).not.toContain('Health / Portal');
  });

  // the internal development record/#534: the catalog is a list and the review opens in ONE detail slot beside it,
  // inside the Catalog tab -- nothing renders after the catalog any more, nothing scrolls (the #324
  // reveal and its scroll-back are gone). Cancel hands focus back to the tile the review came from.
  describe('the review in the slot beside the list', () => {
    const detail = {
      id: 'one', title: 'Mail', available: true, image: null, ports: [], volumes: [],
      annotations: [], environment: [],
      install: { name: 'mail', restart_policy: 'always', ports: [], environment: [], volumes: [] },
    };

    function openReview(catalog: any[], entryId = 'one') {
      store.catalog = catalog;
      store.reviewCatalog = (entry: any) => {
        store.selectedDetail = { ...detail, id: entry.id };
        return of(store.selectedDetail);
      };
      store.clearReview = () => { store.selectedDetail = null; };
      const fixture = TestBed.createComponent(ApplicationsComponent);
      fixture.componentInstance.selectedTab = 'catalog'; // the internal development record: the page opens on Installed
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(`button.catalog-row[data-catalog-entry="${entryId}"]`) as HTMLElement;
      button.click();
      fixture.detectChanges();
      return { fixture, button };
    }

    const entries = [
      { id: 'one', title: 'Mail', name: 'mail', status: 'AVAILABLE' },
      { id: 'two', title: 'Speed', name: 'speed', status: 'AVAILABLE' },
    ];

    // the internal development record (layout C): the list on the left, the detail slot beside it with a hint until one is chosen
    it('puts the list and the detail slot side by side, the slot holding a hint until an entry is selected', fakeAsync(() => {
      store.catalog = entries;
      const fixture = TestBed.createComponent(ApplicationsComponent);
      fixture.componentInstance.selectedTab = 'catalog';
      fixture.detectChanges();
      const split = fixture.nativeElement.querySelector('.catalog-split') as HTMLElement;
      const list = split.querySelector('.catalog-split-list app-catalog-list') as HTMLElement;
      const slot = split.querySelector('.catalog-split-detail.catalog-panel-slot') as HTMLElement;
      expect(list).not.toBeNull();
      expect(slot.querySelector('.catalog-detail-empty').textContent).toContain('Select an application to see its details.');
      // side by side from 900px; one column under it (Karma's window is narrower): the slot under the list
      const [l, d] = [list.getBoundingClientRect(), slot.getBoundingClientRect()];
      if (window.innerWidth > 900) {
        expect(d.left).toBeGreaterThan(l.right - 1);
      } else {
        expect(d.top).toBeGreaterThan(l.bottom - 1);
      }
      expect(split.querySelector('.catalog-split-list #applications-catalog-filter')).not.toBeNull(); // the filter over the list
      fixture.destroy();
    }));

    it('renders the review inside the Catalog tab on the helm kit, and Install... opens its settings dialog', fakeAsync(() => {
      const { fixture, button } = openReview(entries);
      tick();
      const panel = fixture.nativeElement.querySelector('.catalog-panel-slot .review-panel') as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.closest('section.tab-content')).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('[role=tabpanel]')[1].contains(panel)).toBeTrue(); // the Catalog pane (#480, #532)
      expect(panel.querySelector('.mat-mdc-form-field, .mat-mdc-select, .mat-mdc-checkbox, .mat-mdc-button, .mat-mdc-icon-button')).toBeNull();
      expect(panel.querySelector('.catalog-panel-title').textContent.trim()).toBe('Mail');
      expect(button.getAttribute('aria-selected')).toBe('true');
      // the internal development record: the review holds no form; Install... is on the default tier and opens the dialog
      expect(panel.querySelector('form')).toBeNull();
      const install = panel.querySelector('.catalog-panel-install') as HTMLButtonElement;
      expect(install.classList).toContain('bg-primary');
      install.click();
      fixture.detectChanges();
      tick();
      const dialog = dialogRoot().querySelector('.mat-mdc-dialog-container .install-panel') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.querySelector('.catalog-panel-title').textContent.replace(/\s+/g, ' ').trim()).toBe('Install Mail');
      expect(dialog.querySelector('.mat-mdc-form-field, .mat-mdc-select, .mat-mdc-checkbox, .mat-mdc-button')).toBeNull();
      // the tiers: Install on the default tier, Cancel outline
      expect(dialog.querySelector('button[type=submit]').classList).toContain('bg-primary');
      expect(dialog.querySelector('.catalog-panel-cancel').classList).toContain('border-border');
      // Cancel closes the dialog only: the review stays selected beside the list
      (dialog.querySelector('.catalog-panel-cancel') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick();
      expect(dialogRoot().querySelector('.install-panel')).toBeNull();
      expect(fixture.nativeElement.querySelector('.catalog-panel-slot .review-panel')).not.toBeNull();
      fixture.destroy();
    }));

    // the internal development record: Escape is the dialog's Cancel; nothing else closes it while a job runs
    it('closes the settings dialog on Escape and keeps the review beside the list', fakeAsync(() => {
      const { fixture } = openReview(entries);
      tick();
      fixture.componentInstance.openInstall();
      fixture.detectChanges();
      tick();
      const container = dialogRoot().querySelector('.mat-mdc-dialog-container') as HTMLElement;
      expect(container.querySelector('.install-panel')).not.toBeNull();
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      tick(500);
      expect(dialogRoot().querySelector('.install-panel')).toBeNull();
      expect(fixture.componentInstance.installDialogOpen).toBeFalse();
      expect(fixture.nativeElement.querySelector('.catalog-panel-slot .review-panel')).not.toBeNull();
      fixture.destroy();
    }));

    it('puts the Applications setup first in the dialog on a box where Applications is not configured', fakeAsync(() => {
      store.config = { configured: false, pool: null, subnet: null };
      store.pools = [{ name: 'tank' }];
      const { fixture } = openReview(entries);
      tick();
      fixture.componentInstance.openInstall();
      fixture.detectChanges();
      tick();
      const sections = Array.from(dialogRoot().querySelectorAll('.install-panel form > section.fc-settings-section')) as HTMLElement[];
      expect(sections[0].getAttribute('aria-labelledby')).toBe('applications-panel-setup');
      expect(sections[1].getAttribute('aria-labelledby')).toBe('applications-panel-general');
      fixture.destroy();
    }));

    // the approved order (layout C): what the user must decide first, the rare settings last and folded
    it('orders the settings General, Network, Ports, Storage, Environment, then Labels and certificates folded', fakeAsync(() => {
      const { fixture } = openReview(entries);
      tick();
      store.selectedDetail = { ...store.selectedDetail, environment: [{ name: 'TZ', required: false }], install: {
        name: 'mail', restart_policy: 'always', ports: [{ host_port: 8080, container_port: 8080, protocol: 'tcp' }],
        environment: [{ name: 'TZ', value: 'UTC' }], volumes: [{ name: 'config', target: '/config', dataset: '' }], labels: [],
      } };
      fixture.componentInstance.openInstall();
      fixture.detectChanges();
      tick();
      const form = dialogRoot().querySelector('.install-panel form') as HTMLElement;
      const order = Array.from(form.children).map((child) => child.matches('details') ? 'extras' : child.getAttribute('aria-labelledby') || child.className.split(' ')[0]);
      expect(order.slice(0, 6)).toEqual(['applications-panel-general', 'applications-panel-network', 'applications-panel-ports',
        'applications-panel-storage', 'applications-panel-environment', 'extras']);
      const extras = form.querySelector<HTMLDetailsElement>('details[data-applications-extras]');
      expect(extras.open).toBeFalse(); // nothing in them yet
      expect(extras.querySelector('summary').textContent).toContain('Labels and certificates');
      expect(extras.querySelector('#applications-panel-labels')).not.toBeNull();
      expect(extras.querySelector('#applications-panel-certificates')).not.toBeNull();
      fixture.destroy();
    }));

    // the internal development record: a dialog a job runs behind cannot be dismissed out from under it
    it('ignores Escape on the settings dialog while a job runs, and honours it again after', fakeAsync(() => {
      const { fixture } = openReview(entries);
      tick();
      fixture.componentInstance.openInstall();
      fixture.detectChanges();
      tick();
      const container = dialogRoot().querySelector('.mat-mdc-dialog-container') as HTMLElement;
      store.activeJob = { id: 7 };
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      tick(500);
      expect(dialogRoot().querySelector('.install-panel')).not.toBeNull();
      store.activeJob = null;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      tick(500);
      expect(dialogRoot().querySelector('.install-panel')).toBeNull();
      fixture.destroy();
    }));

    it('closes the settings dialog and lands on Installed when the install job succeeds', fakeAsync(() => {
      const { fixture } = openReview(entries);
      tick();
      const component = fixture.componentInstance;
      component.openInstall();
      fixture.detectChanges();
      tick();
      expect(dialogRoot().querySelector('.install-panel')).not.toBeNull();
      component.finishInstall(); // the store's success hook
      fixture.detectChanges();
      tick(500);
      expect(dialogRoot().querySelector('.install-panel')).toBeNull();
      expect(component.selectedTab).toBe('installed');
      fixture.destroy();
    }));

    // the internal development record: an entry already installed says so in its review, and can show the application
    it('says "Installed as …" in the review of an entry with an installed application, and Show installed goes there', fakeAsync(() => {
      store.installed = [{ name: 'speed', image: 'test', running: true, status: 'RUNNING', restart_policy: 'always', catalog: { id: 'two' } }];
      const { fixture } = openReview(entries, 'two');
      tick();
      const panel = fixture.nativeElement.querySelector('.catalog-panel-slot .review-panel') as HTMLElement;
      expect(panel.querySelector('[data-applications-installed-as]').textContent.replace(/\s+/g, ' ').trim()).toBe('Installed as speed');
      expect(panel.querySelector('.catalog-panel-install')).not.toBeNull(); // a second instance is still an install
      expect(fixture.nativeElement.querySelector('button.catalog-row[data-catalog-entry="two"] .row-tag').textContent.trim()).toBe('Installed');
      (panel.querySelector('[data-applications-action="show-installed"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick();
      expect(fixture.componentInstance.selectedTab).toBe('installed');
      fixture.destroy();
    }));

    it('returns focus to the originating row when the review is closed', fakeAsync(() => {
      const { fixture, button } = openReview(entries, 'two');
      tick();
      const scrolled = spyOn(button, 'scrollIntoView');

      fixture.componentInstance.closeReview();
      fixture.detectChanges();
      tick();

      expect(fixture.nativeElement.querySelector('.review-panel')).toBeNull();
      expect(scrolled).toHaveBeenCalledTimes(1);
      expect(scrolled.calls.mostRecent().args[0]).toEqual({ block: 'nearest' }); // the list scrolls vertically (#534)
      expect(document.activeElement).toBe(button);
      fixture.destroy();
    }));

    it('finds the originating row again in a filtered catalog', fakeAsync(() => {
      const { fixture } = openReview(entries, 'two');
      tick();
      fixture.componentInstance.search = 'Speed';
      fixture.detectChanges();

      fixture.componentInstance.closeReview();
      fixture.detectChanges();
      tick();

      const button = fixture.nativeElement.querySelector('button.catalog-row[data-catalog-entry="two"]');
      expect(button).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('button.catalog-row').length).toBe(1);
      expect(document.activeElement).toBe(button);
      fixture.destroy();
    }));
  });

  // the internal development record/#534: Import image and Convert jail open in the same slot as the review, beside the
  // list; their buttons sit in the page header (both tabs), Update Catalog stays in the Catalog tab's ROW ONE.
  describe('the import and convert dialogs', () => {
    function openFromToolbar(action: 'import' | 'convert') {
      store.config = { configured: true, pool: 'tank', subnet: '10.88.0.0/16', convert_enabled: true };
      store.convertSources = () => of([]);
      store.clearReview = () => { store.selectedDetail = null; };
      const fixture = TestBed.createComponent(ApplicationsComponent);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(`header.fc-page-header [data-applications-action="${action}"]`) as HTMLElement;
      button.click();
      fixture.detectChanges();
      // the internal development record: the dialog's body renders on the next turn, in the overlay
      const panel = () => dialogRoot().querySelector(`.mat-mdc-dialog-container .${action}-panel`) as HTMLElement;
      return { fixture, button, panel };
    }

    for (const action of ['import', 'convert'] as const) {
      it(`renders the ${action} panel in a dialog on the helm kit, from either tab`, fakeAsync(() => {
        const { fixture, panel: find } = openFromToolbar(action);
        tick();
        fixture.detectChanges();
        const panel = find();
        expect(panel).not.toBeNull();
        expect(fixture.componentInstance.selectedTab).toBe('installed'); // the header button switches nothing
        expect(panel.querySelector('.mat-mdc-form-field, .mat-mdc-select, .mat-mdc-checkbox, .mat-mdc-radio-button, .mat-mdc-button')).toBeNull();
        expect(panel.querySelector('.catalog-panel-cancel').classList).toContain('border-border');
        fixture.destroy();
      }));

      it(`returns to the ${action} button when the panel is cancelled`, fakeAsync(() => {
        const { fixture, button } = openFromToolbar(action);
        tick();
        const scrolled = spyOn(button, 'scrollIntoView');

        if (action === 'import') {
          fixture.componentInstance.cancelImport();
        } else {
          fixture.componentInstance.cancelConvert();
        }
        fixture.detectChanges();
        tick();

        expect(scrolled).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(button);
        fixture.destroy();
      }));
    }

    // the internal development record: the jail picker is disabled while the chosen jail is detected, which blurs it to the page
    // behind the dialog; once detection settles the picker takes focus back, so Tab stays inside the dialog.
    it('returns focus to the jail picker once a chosen jail is detected', fakeAsync(() => {
      const detection = new Subject<any>();
      store.convertDetect = () => detection;
      const { fixture } = openFromToolbar('convert');
      tick();
      fixture.detectChanges();
      const trigger = dialogRoot().querySelector('#app-convert-source') as HTMLElement;
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
      fixture.componentInstance.selectConvertSource({ name: 'web', engine: 'iocage', lift: true } as any);
      fixture.detectChanges();
      tick();
      detection.next({
        kind: 'jail', engine: 'iocage', ref: 'web', root: '/r', dataset: 'tank/j', state: 'up', release: '15.1-RELEASE-p3',
        userland: '15.1-RELEASE-p3', root_kind: 'clone', app: null, version: null, recipe: null, refusals: ['no recipe recognises this jail'],
        packages: [], ports: [], ports_detected_from: 'listening',
      });
      fixture.detectChanges();
      tick();
      expect(document.activeElement).toBe(dialogRoot().querySelector('#app-convert-source'));
      expect(dialogRoot().querySelector('.convert-prepare')).not.toBeNull();
      fixture.destroy();
    }));

    it('opens one flow at a time: import drops the review, convert replaces import', fakeAsync(() => {
      store.catalog = [{ id: 'one', title: 'Mail', name: 'mail', status: 'AVAILABLE' }];
      store.reviewCatalog = (entry: any) => {
        store.selectedDetail = { id: entry.id, title: 'Mail', available: true, image: null, ports: [], volumes: [], annotations: [], environment: [],
          install: { name: 'mail', restart_policy: 'always', ports: [], environment: [], volumes: [] } };
        return of(store.selectedDetail);
      };
      const { fixture } = openFromToolbar('import');
      fixture.componentInstance.review(store.catalog[0]);
      fixture.detectChanges();
      tick();
      expect(fixture.nativeElement.querySelector('.catalog-panel-slot .review-panel')).not.toBeNull();
      expect(dialogRoot().querySelector('.import-panel')).toBeNull();
      fixture.componentInstance.openImport();
      fixture.detectChanges();
      tick();
      expect(dialogRoot().querySelector('.import-panel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.review-panel')).toBeNull();
      fixture.componentInstance.openConvert();
      fixture.detectChanges();
      tick();
      expect(dialogRoot().querySelector('.convert-panel')).not.toBeNull();
      expect(dialogRoot().querySelector('.import-panel')).toBeNull();
      expect(dialogRoot().querySelectorAll('.mat-mdc-dialog-container').length).toBe(1);
      tick();
      fixture.destroy();
    }));

    it('puts Import and Convert in the page header and keeps Update Catalog in the Catalog tab, all outline', () => {
      const fixture = TestBed.createComponent(ApplicationsComponent);
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('header.fc-page-header .toolbar-actions') as HTMLElement;
      const row = fixture.nativeElement.querySelector('.catalog-toolbar--picker > .toolbar-actions') as HTMLElement;
      expect(Array.from(header.querySelectorAll(':scope > button[data-applications-action]')).map((b: HTMLElement) => b.dataset.applicationsAction))
        .toEqual(['import', 'convert']);
      const update = Array.from(row.querySelectorAll(':scope > button')) as HTMLButtonElement[];
      expect(update.length).toBe(1);
      expect(update[0].textContent).toContain('Update Catalog');
      for (const button of [...Array.from(header.querySelectorAll(':scope > button[data-applications-action]')), ...update] as HTMLButtonElement[]) {
        expect(button.classList).toContain('border-border');
        expect(button.classList).not.toContain('mat-mdc-button');
      }
      expect(fixture.nativeElement.querySelector('.catalog-toolbar .mat-mdc-form-field')).toBeNull();
      expect(fixture.nativeElement.querySelector('#applications-catalog-filter')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#applications-catalog-category')).not.toBeNull();
      fixture.destroy();
    });
  });

  it('shows a catalog review failure as an error notice and escapes its text', () => {
    store.reviewCatalog = () => {
      store.detailError = '<img src=x> Catalog entry unavailable';
      return throwError(() => new Error(store.detailError));
    };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.review({ id: 'missing' } as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice.error').textContent).toContain(store.detailError);
    expect(fixture.nativeElement.querySelector('.notice.error img')).toBeNull();
  });

  // the internal development record: the value is the image's version since the internal development record; an
  // index fallback says so.
  it('labels the reviewed version plainly and marks an index fallback', async () => {
    const base = { title: 'Mail', available: true, image: null, ports: [], volumes: [], annotations: [],
      health: null, environment: [],
      install: { name: 'mail', restart_policy: 'always', ports: [], environment: [], volumes: [] } };
    store.selectedDetail = { ...base, catalog: { version: 'v2.1.5', version_source: 'image', compose_sha256: 'a'.repeat(64), source: 'live', fetched_at: 1 } };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.prepareReview(store.selectedDetail);
    fixture.detectChanges();
    const rows = () => Array.from(fixture.nativeElement.querySelectorAll('.identity-list div') as NodeListOf<HTMLElement>)
      .map((row) => row.textContent.replace(/\s+/g, ' ').trim());
    expect(rows().find((row) => row.startsWith('Version'))).toBe('Version v2.1.5');
    expect(fixture.nativeElement.textContent).not.toContain('Package version');

    store.selectedDetail = { ...base, catalog: { version: '1.37.3', version_source: 'index', compose_sha256: 'a'.repeat(64), source: 'seed', fetched_at: 1 } };
    fixture.componentInstance.prepareReview(store.selectedDetail);
    fixture.detectChanges();
    expect(rows().find((row) => row.startsWith('Version')))
      .toBe('Version 1.37.3 (from the catalog index; the registry did not answer)');
  });

  it('shows native required-field and port errors and keeps Install disabled until valid', async () => {
    store.selectedDetail = { title: 'Mail', available: true, image: null, ports: [], volumes: [], annotations: [],
      health: { type: 'HTTP', scheme: 'http', container_port: 15630, host_port: 15630, path: '/' },
      environment: [{ name: 'PASSWORD', required: true, sensitive: true }],
      install: { name: 'mail', restart_policy: 'always', ports: [{ host_port: 70000, container_port: 8080, protocol: 'tcp' }],
        environment: [{ name: 'PASSWORD', value: '' }], volumes: [] },
    };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.openInstall(); // the internal development record: the settings dialog
    component.effectsReviewed = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = dialogRoot();
    const form = getDebugNode(dialog.querySelector('form')).injector.get(NgForm);
    form.control.markAllAsTouched();
    fixture.detectChanges();
    expect(dialog.querySelector<HTMLButtonElement>('button[type=submit]').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('http · 15630 · /'); // the review beside the list
    expect(dialog.textContent).toContain('This field is required.');
    expect(dialog.textContent).toContain('Enter a port number between 1 and 65535.');
    form.controls['environment-0'].setValue('valid password');
    form.controls['host-port-0'].setValue(8080);
    fixture.detectChanges();
    expect(component.canInstall()).toBeTrue();
    expect(dialog.querySelector<HTMLButtonElement>('button[type=submit]').disabled).toBeFalse();
    component.installDraft.ports[0].host_port = 1.5;
    expect(component.canInstall()).toBeFalse();
  });


  // the internal development record: browsers compile the pattern attribute with the v flag, where an
  // unescaped hyphen inside a class is a syntax error and the constraint is silently dropped.
  it('gives the name field a pattern the browser accepts, equal to the middleware rule', async () => {
    store.selectedDetail = { title: 'Mail', available: true, image: null, ports: [], volumes: [], annotations: [],
      health: null, environment: [],
      install: { name: 'mail', restart_policy: 'always', ports: [{ host_port: 8080, container_port: 8080, protocol: 'tcp' }],
        environment: [], volumes: [] },
    };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.openInstall(); // the internal development record: the settings dialog
    fixture.detectChanges();
    await fixture.whenStable();
    const inputs = Array.from(dialogRoot().querySelectorAll('input[pattern]')) as HTMLInputElement[];
    expect(inputs.map((input) => input.name)).toEqual(['applicationName', 'host-port-0']);
    for (const input of inputs) {
      expect(() => new RegExp(input.getAttribute('pattern'), 'v')).withContext(input.name).not.toThrow();
    }
    const name = new RegExp(`^(?:${inputs[0].getAttribute('pattern')})$`, 'v');
    for (const ok of ['a', 'kuma', 'web-app_1.2', 'x'.repeat(63)]) { expect(name.test(ok)).withContext(ok).toBeTrue(); }
    for (const bad of ['', '-lead', 'Upper', 'x'.repeat(64), 'sp ace']) { expect(name.test(bad)).withContext(bad).toBeFalse(); }
    // The native constraint is live again: an uppercase name is invalid to the browser itself.
    inputs[0].value = 'Upper';
    inputs[0].dispatchEvent(new Event('input'));
    expect(inputs[0].validity.patternMismatch).toBeTrue();
  });
  it('offers Export for Linux before Delete only while Convert & Import is on (the internal development record)', async () => {
    store.loadLogs = jasmine.createSpy('loadLogs');
    store.loadCore = jasmine.createSpy('loadCore');
    store.config = { configured: true, runtime_ready: true, convert_enabled: true };
    store.installed = [{ name: 'speed', image: 'test', running: true, health: 'HEALTHY', status: 'RUNNING', restart_policy: 'always', catalog: { id: 'x' },
      portal: { scheme: 'http', port: 8080, path: '/' } }];
    store.activeJob = { id: 1 };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.nativeElement.classList.add('fc-ui');
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    const details = await expandInstalledRow(fixture, 'speed');
    const actionIds = Array.from(details.querySelectorAll('.entity-table-row-actions-layout > button'))
      .map((button) => button.id.split('__').pop());
    expect(actionIds).toEqual(['portal', 'stop', 'restart', 'update', 'recreate', 'edit', 'logs', 'shell', 'export', 'delete']); // the internal development record: the toolbar order
    expect(installedAction(details, 'speed', 'export').disabled).toBeTrue();
    store.activeJob = null;
    fixture.detectChanges();
    expect(installedAction(details, 'speed', 'export').disabled).toBeFalse();
  });

  it('uses the Jails table columns and keeps its ordered row actions live while expanded', async () => {
    store.loadLogs = jasmine.createSpy('loadLogs');
    store.loadCore = jasmine.createSpy('loadCore');
    store.config = { configured: true, runtime_ready: true };
    store.installed = [{ name: 'speed', image: 'test', running: true, health: 'HEALTHY', status: 'RUNNING', restart_policy: 'always', catalog: { id: 'x' },
      portal: { scheme: 'http', port: 8080, path: '/' } }];
    store.activeJob = { id: 1 };
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.nativeElement.classList.add('fc-ui');
    fixture.componentInstance.selectedTab = 'installed';
    const table = await settleInstalledTable(fixture);
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.datatable-header-cell-label'))
      .map((header: HTMLElement) => header.textContent.trim()).filter(Boolean);
    expect(headers).toEqual(['Name', 'State', 'Version', 'Update', 'Ports', 'Restart policy']); // the internal development record: layout D's glance columns
    expect(table.alwaysDisplayedCols.map((column) => column.prop)).toEqual(['name']);
    expect(fixture.nativeElement.querySelector('.row-kebab, .state-text mat-icon, .tier-badge')).toBeNull();
    expect(getComputedStyle(fixture.nativeElement.querySelector('.entity-table-title-layout')).display).toBe('none');
    expect(fixture.nativeElement.querySelector('h1.fc-page-title').textContent.trim()).toBe('Applications');

    const details = await expandInstalledRow(fixture, 'speed');
    const actionIds = Array.from(details.querySelectorAll('.entity-table-row-actions-layout > button'))
      .map((button) => button.id.split('__').pop());
    expect(actionIds).toEqual(['portal', 'stop', 'restart', 'update', 'recreate', 'edit', 'logs', 'shell', 'delete']);
    for (const action of ['stop', 'restart', 'edit', 'update', 'recreate', 'delete']) {
      expect(installedAction(details, 'speed', action).disabled).withContext(action).toBeTrue();
    }
    const refresh = fixture.nativeElement.querySelector('[id="cust_button_Refresh"]') as HTMLButtonElement;
    expect(refresh.disabled).toBeTrue();
    refresh.click();
    expect(store.loadCore).not.toHaveBeenCalled();

    store.activeJob = null;
    fixture.detectChanges();
    for (const action of ['stop', 'restart', 'edit', 'delete']) {
      expect(installedAction(details, 'speed', action).disabled).withContext(action).toBeFalse();
    }
    expect(refresh.disabled).toBeFalse();
    refresh.click();
    expect(store.loadCore).toHaveBeenCalledTimes(1);
    store.detailLoading = true;
    fixture.detectChanges();
    expect(installedAction(details, 'speed', 'edit').disabled).toBeTrue();
    expect(installedAction(details, 'speed', 'stop').disabled).toBeTrue();
    store.detailLoading = false;
    fixture.detectChanges();

    const open = spyOn(window, 'open').and.returnValue(null);
    installedAction(details, 'speed', 'portal').click();
    expect(open).toHaveBeenCalledOnceWith(fixture.componentInstance.portalUrl(store.installed[0]), '_blank', 'noopener,noreferrer');
    installedAction(details, 'speed', 'logs').click();
    expect(store.loadLogs).toHaveBeenCalledOnceWith(store.installed[0]);
    expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
    fixture.destroy();
  });

  it('keeps a named expanded row across a store refresh and separates its state from diagnostics', async () => {
    const fixture = await installedRow('UNKNOWN');
    await expandInstalledRow(fixture, 'speed');
    store.installed = [{ ...store.installed[0], running: false, status: 'STOPPED', error: 'Container is unavailable.' }];
    await settleInstalledTable(fixture);
    const details = fixture.nativeElement.querySelector('app-entity-table-row-details') as HTMLElement;
    expect(details).not.toBeNull();
    expect(installedAction(details, 'speed', 'start')).not.toBeNull();
    expect(installedAction(details, 'speed', 'restart')).toBeNull();
    expect(fixture.nativeElement.querySelector('[id^="speed_State_"]').textContent).toContain('down');
    expect(fixture.nativeElement.textContent).toContain('Container is unavailable.');
    fixture.destroy();
  });

  it('retains the expander and action strip when the columns picker shows every detail column', async () => {
    const fixture = await installedRow('HEALTHY');
    (fixture.nativeElement.querySelector('.fc-table-columns') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#check-all').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.datatable-header-cell-label'))
      .map((header: HTMLElement) => header.textContent.trim()).filter(Boolean);
    // the internal development record (layout D): the glance columns first, then the band's.
    expect(headers).toEqual(['Name', 'State', 'Version', 'Update', 'Ports', 'Restart policy', 'Port mapping', 'Network', 'Image', 'Certificates', 'Source', 'OS']);
    expect(fixture.nativeElement.querySelector('.datatable-icon-right')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.row-kebab')).toBeNull();
    // Close the stay-open columns menu before interacting with the row behind it.
    (fixture.nativeElement.querySelector('.fc-table-columns') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const details = await expandInstalledRow(fixture, 'speed');
    expect(details.querySelectorAll('.entity-table-row-detail-layout').length).toBe(0);
    expect(installedAction(details, 'speed', 'logs')).not.toBeNull();
    fixture.destroy();
  });
});
