import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApplicationRef, getDebugNode } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { CoreService } from '../../../../core/services/core.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { DialogService, JobService, RestService, TaskService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { DocsService } from '../../../../services/docs.service';
import { ErdService } from '../../../../services/erd.service';
import { LocaleService } from '../../../../services/locale.service';
import { StorageService } from '../../../../services/storage.service';
import { EntityModule } from '../entity.module';
import { EntityTableActionsComponent } from './entity-table-actions.component';
import { EntityTableRowDetailsComponent } from './entity-table-row-details/entity-table-row-details.component';
import { EntityTableComponent } from './entity-table.component';

// the internal development record: the REAL entity table under .ix-blue.fc-ui with the
// production bundle Karma loads globally. entity-table-15.2.spec.ts renders a
// stand-in host, which the component's own encapsulated stylesheet never
// reaches -- that is how a 12px/400 header and fg2 cells stayed green.
describe('EntityTable on the 15.2 table vocabulary (real component)', () => {
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const rows = [
    { id: 1, name: 'tank/home', size: '288 KiB' },
    { id: 2, name: 'tank/media', size: '96 KiB' },
    { id: 3, name: 'tank/projects', size: '96 KiB' },
  ];
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };
  const center = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  const ws = { rows: rows as any[], call: () => of(ws.rows), onCloseSubject: NEVER };

  beforeEach(async () => {
    ws.rows = rows;
    Object.entries(themeVars).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    document.body.classList.add('ix-blue', 'fc-ui');
    await TestBed.configureTestingModule({
      imports: [CommonModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        DialogService, JobService, StorageService, ErdService, TaskService,
        { provide: Router, useValue: { events: NEVER, url: '/storage/snapshots', navigate: () => {} } },
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
        { provide: DocsService, useValue: { getDocs: () => of('') } },
        { provide: PreferencesService, useValue: {
          preferences: { tableDisplayedColumns: [], preferIconsOnly: false }, savePreferences: () => {},
        } },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((name) => document.documentElement.style.removeProperty(name));
    document.body.classList.remove('ix-blue', 'fc-ui');
  });

  let fixture0: ComponentFixture<EntityTableComponent>;

  function render(extraConf: Record<string, any> = {}, data: any[] = rows): { root: HTMLElement; table: EntityTableComponent } {
    ws.rows = data;
    const fixture = TestBed.createComponent(EntityTableComponent);
    fixture0 = fixture;
    const table = fixture.componentInstance;
    table.title = 'Snapshots';
    table.conf = <any>{
      title: 'Snapshots',
      queryCall: 'zfs.snapshot.query', route_add: ['storage', 'snapshots', 'add'], hasDetails: false, multiActions: [],
      columns: [
        { name: 'Dataset', prop: 'name', always_display: true },
        { name: 'Size', prop: 'size' },
      ],
      config: { multiSelect: false, paging: true },
      ...extraConf,
    };
    const root = fixture.nativeElement as HTMLElement;
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick(2100);
    fixture.detectChanges();
    table.table.recalculate();
    tick(32);
    fixture.detectChanges();
    return { root, table };
  }

  it('draws the 32px header in 11px/500 uppercase fg2 with the label centred and on the body column', fakeAsync(() => {
    const { root } = render();
    const headerCell = root.querySelector<HTMLElement>('.datatable-header-cell');
    const label = headerCell.querySelector<HTMLElement>('.datatable-header-cell-label');
    const bodyLabel = root.querySelector<HTMLElement>('.datatable-body-cell .datatable-body-cell-label');
    expect(root.querySelector('.datatable-header').getBoundingClientRect().height).toBe(32);
    const styles = getComputedStyle(headerCell);
    expect(styles.fontSize).toBe('11px');
    expect(styles.fontWeight).toBe('500');
    expect(styles.textTransform).toBe('uppercase');
    expect(styles.color).toBe(fg2);
    expect(Math.abs(center(label).y - center(headerCell).y)).toBeLessThanOrEqual(1);
    // text column: the body label carries its 8px padding inside its box
    const bodyTextLeft = bodyLabel.getBoundingClientRect().left + parseFloat(getComputedStyle(bodyLabel).paddingLeft);
    expect(Math.abs(label.getBoundingClientRect().left - bodyTextLeft)).toBeLessThanOrEqual(0.5);
  }));

  it('draws 40px rows in 13px fg1', fakeAsync(() => {
    const { root } = render();
    const row = root.querySelector<HTMLElement>('.datatable-body-row');
    const cell = root.querySelector<HTMLElement>('.datatable-body-cell');
    expect(row.getBoundingClientRect().height).toBe(40);
    expect(getComputedStyle(cell).color).toBe(fg1);
    expect(getComputedStyle(cell).fontSize).toBe('13px');
  }));

  it('lines the toolbar controls up at 32px on one baseline', fakeAsync(() => {
    const { root } = render();
    const controls = Array.from(root.querySelectorAll<HTMLElement>('.entity-table-controls hlm-input-group, .entity-table-controls button'))
      .filter((el) => el.getBoundingClientRect().height > 0);
    expect(controls.length).toBeGreaterThanOrEqual(2);
    const add = root.querySelector<HTMLElement>('#add_action_button');
    expect(add).withContext('the Add button renders for route_add').not.toBeNull();
    const tops = controls.map((el) => Math.round(el.getBoundingClientRect().top));
    controls.forEach((el) => expect(el.getBoundingClientRect().height).withContext(el.outerHTML.slice(0, 80)).toBe(32));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  }));

  // the internal development record: the filter is the #351 input group; the magnifier is its inline-start
  // addon (#387 placed it by hand at 10 / 18 / 34 -- the shared addon says 9 / 16 / 31: the
  // hairline, the 8px gutter, a 16px glyph, a 6px lead).
  it('draws the filter as the #351 box with the magnifier as its addon: 9 in, 16px, centred, the text at 31', fakeAsync(() => {
    const { root } = render();
    const filter = root.querySelector<HTMLElement>('#filter.fc-table-search');
    const group = filter.querySelector<HTMLElement>('hlm-input-group');
    const icon = filter.querySelector<HTMLElement>('hlm-input-group-addon .mat-icon');
    const box = group.getBoundingClientRect();
    const input = filter.querySelector<HTMLInputElement>('input');
    const ir = icon.getBoundingClientRect();
    expect(box.height).toBe(32);
    expect(box.width).toBe(300);
    expect(getComputedStyle(group).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(group).backgroundColor).toBe('rgb(16, 21, 26)');
    expect(getComputedStyle(group).borderTopLeftRadius).toBe('6px');
    expect(Math.round(ir.left - box.left)).toBe(9);
    expect(Math.round(ir.width)).toBe(16);
    expect(Math.abs((ir.top + ir.height / 2) - (box.top + box.height / 2))).toBeLessThanOrEqual(1);
    expect(getComputedStyle(icon).color).toBe(fg2);
    // the text starts at 31: the box's edge is at 25, the input's own 6px lead follows
    expect(Math.round(input.getBoundingClientRect().left - box.left)).toBe(25);
    expect(Math.round(input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft) - box.left)).toBe(31);
    expect(input.getAttribute('placeholder')).toBe('Filter Snapshots');
    expect(input.getAttribute('ix-auto')).toBe('input__Filter Snapshots');
    expect(getComputedStyle(input).fontWeight).toBe('400');
    expect(getComputedStyle(input).letterSpacing).toBe('normal');
    expect(filter.querySelector('mat-form-field')).toBeNull();
    // the glyph is part of the box: clicking it focuses the input, as the Material container did
    (icon as HTMLElement).click();
    expect(document.activeElement).toBe(input);
  }));

  it('draws the custom actions, the single action and the Actions menu on the outline tier, the caret centred', fakeAsync(() => {
    const refresh = jasmine.createSpy('refresh');
    const stats = jasmine.createSpy('stats');
    const { root } = render({ custActions: [{ id: 'refresh', name: 'Refresh', function: refresh }], getAddActions: () => [{ label: 'Stats', onClick: stats }] });
    const cust = root.querySelector<HTMLButtonElement>('#cust_button_Refresh');
    expect(cust.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(cust).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(cust).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cust).color).toBe(fg1);
    expect(getComputedStyle(cust).fontSize).toBe('13px');
    expect(getComputedStyle(cust).fontWeight).toBe('500');
    expect(getComputedStyle(cust).paddingLeft).toBe('14px');
    expect(getComputedStyle(cust).borderTopLeftRadius).toBe('6px');
    expect(cust.getAttribute('ix-auto')).toBe('button__Refresh');
    cust.click();
    expect(refresh).toHaveBeenCalled();
    // route_add + one action = the Actions menu trigger with its caret
    const actions = root.querySelector<HTMLButtonElement>('app-entity-table-add-actions button.menu-toggle');
    expect(actions).not.toBeNull();
    expect(root.querySelector('#add_action_button')).toBeNull();
    expect(actions.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(actions).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(actions).paddingRight).toBe('8px');
    expect(actions.getAttribute('aria-haspopup')).toBe('menu');
    expect(actions.getAttribute('ix-auto')).toBe('button__Snapshots_ACTIONS');
    const caret = actions.querySelector<HTMLElement>('.menu-caret');
    const cr = caret.getBoundingClientRect();
    const ar = actions.getBoundingClientRect();
    expect([Math.round(cr.width), Math.round(cr.height)]).toEqual([16, 16]);
    expect(Math.abs((cr.top + cr.height / 2) - (ar.top + ar.height / 2))).toBeLessThanOrEqual(1);
    expect(Math.round(ar.right - cr.right)).toBe(9); // 8px end padding + the hairline
    expect(getComputedStyle(caret).position).toBe('static');
  }));

  // the internal development record: the Actions menu and the cog menu on the helm dropdown-menu (M1).
  it('opens the Actions menu with the Add row disabled and the add actions acting and closing', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const stats = jasmine.createSpy('stats');
    const { root, table } = render({ addBtnDisabled: true, getAddActions: () => [{ label: 'Stats', onClick: stats }] });
    const doAdd = spyOn(table, 'doAdd');
    const actions = root.querySelector<HTMLButtonElement>('app-entity-table-add-actions button.menu-toggle');
    actions.click();
    tick();
    fixture0.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu');
    expect(panel).not.toBeNull();
    expect(overlay.getContainerElement().querySelector('.mat-mdc-menu-panel')).toBeNull();
    const rows = Array.from(panel.querySelectorAll<HTMLButtonElement>('[hlmDropdownMenuItem]'));
    expect(rows.map((r) => r.id)).toEqual(['add_action_button', 'add_action_button_Stats']);
    expect(rows.map((r) => r.getAttribute('ix-auto'))).toEqual(['button__Snapshots_ADD', 'button__Snapshots_Stats']);
    expect(rows.map((r) => r.textContent.trim())).toEqual(['Add', 'Stats']);
    expect(rows[0].disabled).toBeTrue();
    expect(getComputedStyle(rows[0]).opacity).toBe('0.4');
    expect(document.activeElement).toBe(rows[1]); // the disabled first row is skipped on open
    expect(panel.getBoundingClientRect().right).toBeLessThanOrEqual(document.documentElement.clientWidth); // start-aligned, or flipped to end at the toolbar's right edge
    rows[0].click();
    expect(doAdd).not.toHaveBeenCalled();
    rows[1].click();
    tick(500);
    fixture0.detectChanges();
    expect(stats).toHaveBeenCalled();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(actions);
    overlay.ngOnDestroy();
  }));

  it('opens the cog menu (globalConfig.actions) aligned to the cog end with the option rows', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const activate = jasmine.createSpy('activate');
    const { root } = render({ globalConfig: { id: 'jail-config', tooltip: 'Settings', actions: [
      { id: 'activate-pool', label: 'Activate Pool', onClick: activate },
      { id: 'bastille', label: 'Bastille Jails', onClick: () => {} },
    ] } });
    const cog = root.querySelector<HTMLButtonElement>('button#jail-config');
    expect(cog.getAttribute('aria-haspopup')).toBe('menu');
    expect(cog.getAttribute('ix-auto')).toBe('settings__Snapshots');
    expect(cog.getAttribute('aria-label')).toBe('Settings');
    root.scrollIntoView({ block: 'start' });
    cog.click();
    tick();
    fixture0.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu');
    expect(panel).not.toBeNull();
    const rows = Array.from(panel.querySelectorAll<HTMLButtonElement>('[hlmDropdownMenuItem]'));
    expect(rows.map((r) => r.id)).toEqual(['jail-config-activate-pool', 'jail-config-bastille']);
    expect(rows.map((r) => r.getAttribute('ix-auto'))).toEqual(['option__Activate Pool', 'option__Bastille Jails']);
    // aligned end (the cog can sit past karma's viewport edge, where CDK pushes the panel back in)
    expect(Math.abs(panel.getBoundingClientRect().right - Math.min(cog.getBoundingClientRect().right, document.documentElement.clientWidth))).toBeLessThanOrEqual(1);
    expect(rows[0].getBoundingClientRect().height).toBe(32);
    rows[0].click();
    tick(500);
    fixture0.detectChanges();
    expect(activate).toHaveBeenCalled();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    overlay.ngOnDestroy();
  }));

  // the internal development record: the row cells on spartan -- the kebab as a ghost icon button, the state
  // as text (C3), the selectable cell as the #352 box.
  it('draws the kebab as a ghost icon button and the state cell as text in its tone', fakeAsync(() => {
    const stateButton = jasmine.createSpy('stateButton');
    const { root } = render({
      columns: [
        { name: 'Dataset', prop: 'name', always_display: true },
        { name: 'State', prop: 'state', state: true },
      ],
      getActions: () => [{ id: 'edit', label: 'Edit', onClick: () => {} }, { id: 'delete', label: 'Delete', onClick: () => {} }],
      stateButton,
    }, [
      { id: 1, name: 'tank/home', state: 'RUNNING' },
      { id: 2, name: 'tank/media', state: 'SUCCESS' },
      { id: 3, name: 'tank/projects', state: 'FAILED' },
      { id: 4, name: 'tank/hold', state: 'PENDING' },
    ]);
    const kebab = root.querySelector<HTMLButtonElement>('app-entity-table-actions button.row-kebab[ix-auto="options__tank/home"]');
    expect(kebab).not.toBeNull();
    expect(root.querySelectorAll('app-entity-table-actions button.row-kebab').length).toBe(4);
    expect([kebab.getBoundingClientRect().width, kebab.getBoundingClientRect().height]).toEqual([32, 32]);
    expect(getComputedStyle(kebab).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(kebab).color).toBe(fg2);
    expect(kebab.querySelector('mat-icon').getBoundingClientRect().width).toBe(20);
    expect(kebab.getAttribute('aria-haspopup')).toBe('menu');
    expect(kebab.getAttribute('ix-auto')).toBe('options__tank/home');
    expect(kebab.id).toBe('tank/home__button');
    expect(root.querySelector('app-entity-table-actions mat-icon[ix-auto]')).toBeNull();
    const links = Array.from(root.querySelectorAll<HTMLButtonElement>('button.state-link'))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(links.map((l) => l.id)).toEqual(['tank/home_State-button', 'tank/media_State-button', 'tank/projects_State-button']); // PENDING is not clickable
    expect(links.map((l) => l.textContent.trim())).toEqual(['RUNNING', 'SUCCESS', 'FAILED']);
    expect(links.map((l) => getComputedStyle(l).color)).toEqual([fg1, fg2, 'rgb(227, 98, 90)']);
    links.forEach((l) => {
      expect(getComputedStyle(l).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(l).textDecorationLine).toBe('underline');
      expect(getComputedStyle(l).textDecorationColor).toBe('rgb(42, 53, 61)');
      expect(getComputedStyle(l).fontSize).toBe('13px');
      expect(l.getBoundingClientRect().height).toBe(32);
      expect(l.classList.contains('fn-theme-orange') || l.classList.contains('fn-theme-green') || l.classList.contains('fn-theme-red')).toBeFalse();
    });
    expect(links[0].id).toBe('tank/home_State-button');
    expect(links[0].getAttribute('ix-auto')).toBe('button__tank/home_State');
    links[0].click();
    expect(stateButton).toHaveBeenCalled();
    expect(root.querySelector('.datatable-body .mat-mdc-button, .datatable-body mat-checkbox')).toBeNull();
  }));

  it('draws a selectable value cell as the #352 box in a 32px cell and writes the change back', fakeAsync(() => {
    const onCheckboxChange = jasmine.createSpy('onCheckboxChange');
    const { root } = render({
      columns: [
        { name: 'Dataset', prop: 'name', always_display: true },
        { name: 'Enabled', prop: 'enabled', selectable: true },
      ],
      onCheckboxChange,
    }, [{ id: 1, name: 'tank/home', enabled: true }, { id: 2, name: 'tank/media', enabled: false }]);
    const hosts = Array.from(root.querySelectorAll<HTMLElement>('hlm-checkbox[id*="_Enabled-checkbox_"]'))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(hosts.map((h) => h.id)).toEqual(['tank/home_Enabled-checkbox_0_0', 'tank/media_Enabled-checkbox_0_1']);
    const cell = hosts[0].closest<HTMLElement>('.checkbox-cell');
    expect([cell.getBoundingClientRect().width, cell.getBoundingClientRect().height]).toEqual([32, 32]);
    const boxes = hosts.map((h) => h.querySelector<HTMLButtonElement>('button[role="checkbox"]'));
    expect(boxes.map((b) => b.getAttribute('data-state'))).toEqual(['checked', 'unchecked']);
    expect(boxes[0].getBoundingClientRect().width).toBe(16);
    expect(boxes[0].getAttribute('aria-label')).toBe('Enabled');
    boxes[1].click();
    expect(onCheckboxChange).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'tank/media' }));
    // the 32px cell is the hit area too
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onCheckboxChange).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'tank/home' }));
    expect(getComputedStyle(cell).cursor).toBe('pointer');
  }));

  // the internal development record: the M1 menus -- the #354 panel (bg2, hairline, 6px, 4px padding, no shadow),
  // 32px rows at 13px fg1, group headings in the table-header voice on a hairline, disabled rows at .4.
  it('opens the kebab menu (M1) from the ghost button without activating the row, and returns focus on Escape', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const edit = jasmine.createSpy('edit');
    const { root, table } = render({ getActions: () => [
      { id: 'edit', label: 'Edit', onClick: edit },
      { id: 'delete', label: 'Delete', onClick: () => {}, disabled: true, matTooltip: 'Busy' },
    ] });
    const kebab = root.querySelector<HTMLButtonElement>('button.row-kebab[ix-auto="options__tank/home"]');
    const activate = spyOn(table, 'onActivate').and.callThrough();
    kebab.click();
    tick();
    fixture0.detectChanges();
    expect(kebab.getAttribute('aria-expanded')).toBe('true');
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('menu');
    expect(overlay.getContainerElement().querySelector('.mat-mdc-menu-panel')).toBeNull();
    expect(getComputedStyle(panel).backgroundColor).toBe('rgb(23, 30, 36)');
    expect(getComputedStyle(panel).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(panel).borderTopWidth).toBe('1px');
    expect(getComputedStyle(panel).borderTopLeftRadius).toBe('6px');
    expect(getComputedStyle(panel).paddingTop).toBe('4px');
    expect(getComputedStyle(panel).boxShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?/g, '')).toBe(''); // shadow-none
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('[hlmDropdownMenuItem]'));
    expect(items.map((i) => i.id)).toEqual(['action_button___edit', 'action_button___delete']); // (no action.name in this conf, as before)
    expect(items.map((i) => i.getAttribute('ix-auto'))).toEqual(['action__edit_Edit', 'action__delete_Delete']);
    expect(items.map((i) => i.getAttribute('role'))).toEqual(['menuitem', 'menuitem']);
    expect(items[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(items[0]).fontSize).toBe('13px');
    expect(getComputedStyle(items[0]).color).toBe(fg1);
    expect(getComputedStyle(items[0]).paddingLeft).toBe('12px');
    expect(document.activeElement).toBe(items[0]); // CDK focuses the first row on open; the surface follows :focus-visible only
    expect(getComputedStyle(items[0]).backgroundColor.includes('/ 0.05)')).toBe(items[0].matches(':focus-visible'));
    expect(getComputedStyle(items[1]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(items[0].getBoundingClientRect().width).toBe(panel.getBoundingClientRect().width - 10); // 4px padding + the hairline each side
    expect(getComputedStyle(items[1]).opacity).toBe('0.4');
    expect(items[1].hasAttribute('disabled')).toBeTrue();
    const wrapper = items[1].closest<HTMLElement>('.row-menu-item'); // the tooltip wrapper is a block: the disabled row is its hover target
    expect(getComputedStyle(wrapper).display).toBe('block');
    expect(wrapper.getBoundingClientRect().height).toBe(32);
    TestBed.inject(ApplicationRef).tick(); // the brain wires its hover listeners in afterNextRender
    wrapper.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); // the brain opens on mouse/pen hover only
    tick(500); // >= the 150 ms show delay
    fixture0.detectChanges();
    const tip = overlay.getContainerElement().querySelector('[role="tooltip"]');
    expect(tip?.textContent.trim()).toBe('Busy'); // the disabled row's tooltip still shows
    // the row-menu default is 'left' (the panel's data-side is the CDK-resolved side and flips when the page leaves no room)
    expect(getDebugNode(wrapper).injector.get(BrnTooltip).position()).toBe('left');
    wrapper.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    tick(100); // the hide delay
    fixture0.detectChanges();
    expect(tip.getAttribute('data-state')).toBe('closed');
    TestBed.inject(ApplicationRef).tick(); // the detach is scheduled in afterNextRender
    tick(400); // the exit fade + the animation wait
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('[role="tooltip"]')).toBeNull();
    expect(activate).not.toHaveBeenCalled();
    // the row acts and the menu closes
    items[0].click();
    tick(500);
    fixture0.detectChanges();
    expect(edit).toHaveBeenCalled();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    // keyboard: Enter on the kebab opens with the first row focused; Escape from wherever focus is closes
    kebab.focus();
    kebab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    tick();
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).not.toBeNull();
    expect(document.activeElement.id).toBe('action_button___edit');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(500);
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(kebab);
    overlay.ngOnDestroy();
  }));

  it('draws grouped kebab actions (the Pools cog) under headings in the table-header voice on a hairline', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const fixture = TestBed.createComponent(EntityTableActionsComponent);
    fixture.componentInstance.entity = <any>{
      conf: {},
      getActions: () => [
        { title: 'Snapshot', actionName: 'tank', actions: [{ id: 'clone', name: 'tank', label: 'Clone', onClick: () => {} }] },
        { title: 'Danger', actionName: 'tank', actions: [{ id: 'delete', name: 'tank', label: 'Delete', onClick: () => {} }] },
        { title: 'Empty', actionName: 'tank', actions: [] },
      ],
    };
    fixture.componentInstance.row = { name: 'tank' };
    fixture.componentInstance.groups = true;
    fixture.componentInstance.icon_name = 'settings';
    fixture.componentInstance.action = 'settings';
    fixture.detectChanges();
    const kebab = fixture.nativeElement.querySelector('button.row-kebab') as HTMLButtonElement;
    expect(kebab.id).toBe('tank_settings_button');
    kebab.click();
    tick();
    fixture.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu');
    const labels = Array.from(panel.querySelectorAll<HTMLElement>('hlm-dropdown-menu-label'));
    expect(labels.map((l) => l.textContent.trim())).toEqual(['Snapshot', 'Danger']);
    expect(labels[0].getBoundingClientRect().height).toBe(24);
    expect(getComputedStyle(labels[0]).fontSize).toBe('11px');
    expect(getComputedStyle(labels[0]).fontWeight).toBe('500');
    expect(getComputedStyle(labels[0]).textTransform).toBe('uppercase');
    expect(getComputedStyle(labels[0]).color).toBe(fg2);
    expect(getComputedStyle(labels[0]).paddingLeft).toBe('12px');
    expect(panel.getBoundingClientRect().width).toBeGreaterThanOrEqual(200);
    const separators = Array.from(panel.querySelectorAll<HTMLElement>('hlm-dropdown-menu-separator'));
    expect(separators.length).toBe(1); // between the groups, not above the first
    expect(separators[0].getBoundingClientRect().height).toBe(1);
    expect(getComputedStyle(separators[0]).backgroundColor).toBe('rgb(42, 53, 61)');
    expect(Math.round(separators[0].getBoundingClientRect().left - panel.getBoundingClientRect().left)).toBe(1); // -mx-1 reaches the hairline
    expect(panel.children[0].tagName).toBe('HLM-DROPDOWN-MENU-LABEL');
    expect(Array.from(panel.querySelectorAll('[hlmDropdownMenuItem]')).map((i) => i.id)).toEqual(['action_button_tank__clone', 'action_button_tank__delete']);
    overlay.ngOnDestroy();
    fixture.destroy();
  }));

  it('opens the schedule widget menu (M1) from the column glyph with the runs as plain 32px rows under the label', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const { root } = render({
      columns: [
        { name: 'Dataset', prop: 'name', always_display: true },
        { name: 'Schedule', prop: 'cron_schedule', widget: { icon: 'calendar_month', component: 'TaskScheduleListComponent' } },
      ],
    }, [{ id: 1, name: 'tank/home', cron_schedule: '0 0 * * *' }]);
    const glyph = root.querySelector<HTMLElement>('mat-icon.widget-icon');
    expect(glyph.id).toBe('tank/home_Schedule_widget');
    expect(glyph.getAttribute('ix-auto')).toContain('tank/home_Schedule_widget'); // (untyped hook, as before)
    expect(glyph.getAttribute('aria-haspopup')).toBe('menu');
    expect(glyph.getAttribute('role')).toBe('button');
    expect(glyph.getAttribute('tabindex')).toBe('0');
    expect(glyph.getAttribute('aria-hidden')).toBe('false'); // MatIcon hides itself from AT by default; a focusable trigger may not be
    expect(glyph.getAttribute('aria-label')).toBe('Schedule');
    expect(glyph.nextElementSibling.id).toBe('tank/home_Schedule_0_0'); // no hidden menu host between glyph and value
    glyph.focus(); // a pointer click focuses the tabindex=0 glyph; the synthetic one does not
    glyph.click();
    tick();
    fixture0.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.widget-menu');
    expect(panel).not.toBeNull();
    expect(Math.round(panel.getBoundingClientRect().right)).toBeLessThanOrEqual(Math.round(glyph.getBoundingClientRect().right) + 1); // aligned end
    const label = panel.querySelector<HTMLElement>('hlm-dropdown-menu-label');
    expect(label.textContent.trim()).toBe('Upcoming tasks');
    expect(label.getBoundingClientRect().height).toBe(24);
    expect(panel.querySelector('hlm-dropdown-menu-separator')).not.toBeNull();
    const runs = Array.from(panel.querySelectorAll<HTMLElement>('.task-run'));
    expect(runs.length).toBe(5);
    expect(runs[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(runs[0]).fontSize).toBe('13px');
    expect(getComputedStyle(runs[0]).paddingLeft).toBe('12px');
    expect(getComputedStyle(runs[0]).color).toBe(fg1);
    expect(panel.querySelector('mat-list, mat-divider, [role=menuitem]')).toBeNull();
    // nothing inside takes focus, so Escape is pressed on the glyph itself (the real path)
    expect(document.activeElement).toBe(glyph);
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(500);
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(glyph.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(glyph);
    overlay.ngOnDestroy();
  }));

  it('renders the row-details widget menu (M1) from the real details component', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const fixture = TestBed.createComponent(EntityTableRowDetailsComponent);
    fixture.componentInstance.parent = <any>{
      hasActions: false,
      allColumns: [{ name: 'Schedule', prop: 'cron', hidden: true, widget: { icon: 'calendar_month', component: 'TaskScheduleListComponent' } }],
      conf: { columns: [], getActions: () => [] },
      updateRowDetailHeight: () => {},
    };
    fixture.componentInstance.config = { name: 'job', cron: '0 0 * * *' };
    fixture.detectChanges();
    tick();
    const glyph = fixture.nativeElement.querySelector('mat-icon.widget-icon') as HTMLElement;
    expect(glyph.getAttribute('role')).toBe('button');
    expect(glyph.getAttribute('tabindex')).toBe('0');
    expect(glyph.getAttribute('aria-hidden')).toBe('false');
    expect(glyph.getAttribute('aria-label')).toBe('Schedule');
    expect(glyph.nextElementSibling.tagName).toBe('P'); // no hidden menu host
    glyph.focus();
    glyph.click();
    tick();
    fixture.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.widget-menu');
    expect(panel).not.toBeNull();
    expect(panel.querySelector('hlm-dropdown-menu-label').textContent.trim()).toBe('Upcoming tasks');
    expect(panel.querySelectorAll('.task-run').length).toBe(5);
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(500);
    fixture.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    overlay.ngOnDestroy();
    fixture.destroy();
  }));

  it('draws the columns picker (M1) with real #352 boxes in stay-open checkbox rows', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer);
    const { root, table } = render();
    const trigger = root.querySelector<HTMLButtonElement>('.fc-table-columns');
    trigger.click();
    tick();
    fixture0.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.columns-menu');
    expect(panel).not.toBeNull();
    const size = panel.querySelector<HTMLElement>('#menu_option-Size');
    expect(size.getAttribute('role')).toBe('menuitemcheckbox');
    expect(size.getAttribute('aria-checked')).toBe('true');
    expect(size.getAttribute('ix-auto')).toBe('action__COLUMNS_Size');
    expect(size.getBoundingClientRect().height).toBe(32);
    expect(size.tagName).toBe('DIV'); // the row is the control; the box's button is not nested in a button
    expect(size.querySelector('.menu-box').hasAttribute('inert')).toBeTrue(); // the box is display-only
    const box = size.querySelector<HTMLButtonElement>('.menu-box button[role="checkbox"]');
    expect(box).not.toBeNull();
    expect([box.getBoundingClientRect().width, box.getBoundingClientRect().height]).toEqual([16, 16]);
    expect(box.getAttribute('data-state')).toBe('checked');
    expect(getComputedStyle(box).backgroundColor).toBe(fg1);
    expect(Math.round(box.getBoundingClientRect().left - size.getBoundingClientRect().left)).toBe(12);
    expect(panel.querySelector('[hlmDropdownMenuCheckbox] mat-icon')).toBeNull(); // no check-circle glyphs
    // toggling keeps the picker open and flips the box
    size.click();
    tick();
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull();
    expect(table.conf.columns.map((c: any) => c.prop)).toEqual([]); // conf.columns holds the toggleable columns (Dataset is always_display)
    expect(size.getAttribute('aria-checked')).toBe('false');
    expect(box.getAttribute('data-state')).toBe('unchecked'); // (the fill reads mid-transition here)
    // Select All / Reset are plain rows that keep it open, on separators
    const all = panel.querySelector<HTMLButtonElement>('#check-all');
    expect(all.getAttribute('role')).toBe('menuitem');
    expect(all.textContent).toContain('Select All');
    all.click();
    tick();
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull();
    expect(table.conf.columns.map((c: any) => c.prop)).toEqual(['size']);
    expect(all.textContent).toContain('Unselect All');
    expect(panel.querySelectorAll('hlm-dropdown-menu-separator').length).toBe(2);
    panel.querySelector<HTMLButtonElement>('#reset_col_view').click();
    tick();
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull();
    expect(panel.contains(document.activeElement)).toBeTrue(); // a row holds focus; Escape from there
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(500);
    fixture0.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    overlay.ngOnDestroy();
  }));

  it('draws the batch bar with its actions as inline ghost buttons once rows are selected', fakeAsync(() => {
    const start = jasmine.createSpy('start');
    const { root, table } = render({ config: { multiSelect: true, paging: true }, multiActions: [{ id: 'mstart', label: 'Start', icon: 'play_arrow', enable: true, onClick: start }] });
    expect(root.querySelector('.entity-table-multi-actions-layout')).toBeNull();
    table.onSelect({ selected: [table.currentRows[0]] });
    fixture0.detectChanges();
    const bar = root.querySelector<HTMLElement>('.entity-table-multi-actions-layout');
    expect(bar).not.toBeNull();
    expect(bar.querySelector('.multiactions-title').textContent.replace(/\s+/g, ' ').trim()).toBe('Batch Operations (1 selected)');
    const button = bar.querySelector<HTMLButtonElement>('button#mstart.multi-action');
    expect(button.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(button).color).toBe(fg2);
    expect(button.querySelector('mat-icon').getBoundingClientRect().width).toBe(16);
    expect(getComputedStyle(button.querySelector('mat-icon')).color).toBe(fg2);
    expect(button.querySelector('br')).toBeNull();
    expect(button.querySelector('span').textContent.trim()).toBe('Start');
    button.click();
    expect(start).toHaveBeenCalledWith([table.currentRows[0]]);
    expect(bar.querySelector('.mat-mdc-button')).toBeNull();
  }));

  // the internal development record: the toggle column (VM State) -- the S1 switch display-only behind the click
  // overlay that carries the state tooltip and the consumer's flow; a 20px spinner in flight.
  it('draws the toggle column as the S1 switch behind its overlay, with a 20px spinner while the state is in flight', fakeAsync(() => {
    const onSliderChange = jasmine.createSpy('onSliderChange');
    const { root } = render({
      columns: [
        { name: 'Name', prop: 'name', always_display: true },
        { name: 'State', prop: 'state', always_display: true, toggle: true },
      ],
      onSliderChange,
    }, [
      { id: 1, name: 'vm-a', state: 'RUNNING' },
      { id: 2, name: 'vm-b', state: 'STOPPED' },
      { id: 3, name: 'vm-c', state: 'STARTING' },
      { id: 4, name: 'vm-d', state: 'STOPPED', disableSlider: true },
    ]);
    const cell = (name: string): HTMLElement => root.querySelector<HTMLElement>(`#${name}_State-overlay`).closest('.state-toggle');
    const running = cell('vm-a');
    const sw = running.querySelector<HTMLButtonElement>('button[role="switch"]:not(.clickable)');
    expect([Math.round(sw.getBoundingClientRect().width), Math.round(sw.getBoundingClientRect().height)]).toEqual([32, 18]);
    expect(sw.getAttribute('data-state')).toBe('checked');
    expect(sw.tabIndex).toBe(-1); // display-only: out of the tab order, hidden from readers
    expect(sw.id).toBe('vm-a_State-slidetoggle-button');
    expect(running.getAttribute('ix-auto')).toBe('toggle__vm-a_State'); // the hook on the laid-out wrapper
    // the overlay covers exactly the switch, is the accessible switch, and takes the click and the keys
    const overlay = running.querySelector<HTMLElement>('.clickable');
    const or = overlay.getBoundingClientRect();
    const sr = sw.getBoundingClientRect();
    expect(Math.abs(or.left - sr.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(or.right - sr.right)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(or.top - sr.top)).toBeLessThanOrEqual(0.5);
    expect(overlay.getAttribute('role')).toBe('switch');
    expect(overlay.tabIndex).toBe(0);
    expect(overlay.getAttribute('aria-checked')).toBe('true');
    expect(overlay.getAttribute('aria-label')).toBe('State');
    expect(getComputedStyle(overlay).cursor).toBe('pointer');
    expect(overlay.getAttribute('ix-auto')).toBe('overlay___State'); // the overlay names the column only, as before
    overlay.click();
    expect(onSliderChange).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'vm-a' }));
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSliderChange).toHaveBeenCalledTimes(2);
    expect(sw.getAttribute('data-state')).toBe('checked'); // display-only: the consumer's flow decides
    expect(cell('vm-b').querySelector('button[role="switch"]:not(.clickable)').getAttribute('data-state')).toBe('unchecked');
    // the switch and the state text share one 40px line
    const label = running.closest<HTMLElement>('.datatable-body-cell-label');
    expect(getComputedStyle(label).display).toBe('flex');
    expect(label.getBoundingClientRect().height).toBeLessThanOrEqual(40);
    const rr = running.closest<HTMLElement>('datatable-body-row').getBoundingClientRect();
    expect(Math.abs((sr.top + sr.height / 2) - (rr.top + rr.height / 2))).toBeLessThanOrEqual(1);
    // a disabled slider: the overlay is inert (not-allowed), the switch dimmed
    const inert = cell('vm-d').querySelector<HTMLElement>('.clickable');
    inert.click();
    expect(onSliderChange).toHaveBeenCalledTimes(2);
    expect(getComputedStyle(inert).cursor).toBe('not-allowed');
    expect(inert.getAttribute('aria-disabled')).toBe('true');
    expect(cell('vm-d').querySelector<HTMLButtonElement>('button[role="switch"]:not(.clickable)').disabled).toBeTrue();
    // in flight: the spinner beside the switch, 20px
    const spinner = root.querySelector<HTMLElement>('#vm-c_State-overlay').closest('datatable-body-cell').querySelector<HTMLElement>('hlm-spinner.state-spinner');
    expect(spinner).not.toBeNull();
    expect(getComputedStyle(spinner).fontSize).toBe('20px');
    expect([Math.round(spinner.getBoundingClientRect().width), Math.round(spinner.getBoundingClientRect().height)]).toEqual([20, 20]);
    expect(getComputedStyle(spinner).color).toBe(fg2);
    expect(root.querySelector('mat-slide-toggle, mat-spinner')).toBeNull();
  }));

  it('keeps a disabled Add inert and renders a lone custom action as the outline button', fakeAsync(() => {
    const table1 = render({ addBtnDisabled: true });
    const add = table1.root.querySelector<HTMLButtonElement>('#add_action_button');
    expect(add.disabled).toBeTrue();
    expect(add.hasAttribute('data-disabled')).toBeTrue();
    expect(getComputedStyle(add).opacity).toBe('0.4');
    expect(getComputedStyle(add).pointerEvents).toBe('none');
    const single = jasmine.createSpy('single');
    const { root } = render({ route_add: undefined, getAddActions: () => [{ label: 'Import', onClick: single }] });
    const button = root.querySelector<HTMLButtonElement>('#add_action_button_Import');
    expect(button).not.toBeNull();
    expect(button.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(button).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(button.getAttribute('ix-auto')).toBe('button__Snapshots_Import');
    button.click();
    expect(single).toHaveBeenCalled();
  }));

  it('puts the toolbar buttons on the #353 tiers: Add outline, Columns and the cog ghost icons with 20px glyphs', fakeAsync(() => {
    const { root } = render({ globalConfig: { id: 'snapshot-settings', tooltip: 'Settings', onClick: () => {} } });
    const add = root.querySelector<HTMLButtonElement>('#add_action_button');
    const columns = root.querySelector<HTMLButtonElement>('.fc-table-columns');
    const cog = root.querySelector<HTMLButtonElement>('#config > button');
    expect(add.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(add).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(add).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(add).color).toBe(fg1);
    expect(add.getAttribute('ix-auto')).toBe('button__Snapshots_ADD');
    for (const b of [columns, cog]) {
      expect(b).not.toBeNull();
      const r = b.getBoundingClientRect();
      expect([r.width, r.height]).toEqual([32, 32]);
      expect(getComputedStyle(b).borderTopColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(b).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(b).color).toBe(fg2);
      const icon = b.querySelector<HTMLElement>('.mat-icon');
      expect(icon.getBoundingClientRect().width).toBe(20);
      expect(getComputedStyle(icon).fontSize).toBe('20px');
    }
    expect(columns.getAttribute('aria-haspopup')).not.toBeNull(); // the menu trigger survives on the helm button
    expect(root.querySelector('.entity-table-controls .mat-mdc-button, .entity-table-controls .mat-mdc-icon-button, .entity-table-controls mat-spinner')).toBeNull();
  }));

  it('sizes the box to the header, the rows and the footer, so the footer sits under the last row', fakeAsync(() => {
    const { root, table } = render();
    // Karma's short window makes three rows a full page; the partial page adds 10.
    const partial = rows.length < table.paginationPageSize ? 10 : 0;
    expect(table.tableHeight).toBe(rows.length * 40 + 32 + 40 + partial);
    const datatable = root.querySelector<HTMLElement>('ngx-datatable');
    expect(datatable.getBoundingClientRect().height).toBe(table.tableHeight);
    const lastRow = Array.from(root.querySelectorAll<HTMLElement>('.datatable-body-row')).pop();
    const footer = root.querySelector<HTMLElement>('.datatable-footer');
    expect(footer.getBoundingClientRect().top - lastRow.getBoundingClientRect().bottom).toBeLessThanOrEqual(10);
    expect(footer.getBoundingClientRect().height).toBe(40);
  }));
});
