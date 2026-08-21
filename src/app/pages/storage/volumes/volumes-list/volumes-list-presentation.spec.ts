import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FC_EXPANSION } from 'app/components/common/expansion/fc-expansion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NEVER } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { CoreService } from '../../../../core/services/core.service';
import { PreferencesService, UserPreferences } from '../../../../core/services/preferences.service';
import { DialogService, JobService, RestService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { ErdService } from '../../../../services/erd.service';
import { StorageService } from '../../../../services/storage.service';
import { ValidationService } from '../../../../services/validation.service';
import { MessageService } from '../../../common/entity/entity-form/services/message.service';
import { EntityTableActionsComponent } from '../../../common/entity/entity-table/entity-table-actions.component';
import { EntityTableAddActionsComponent } from '../../../common/entity/entity-table/entity-table-add-actions.component';
import { EntityTableService } from '../../../common/entity/entity-table/entity-table.service';
import { EntityTreeTableComponent } from '../../../common/entity/entity-tree-table/entity-tree-table.component';
import { FileSizePipe } from '../../../common/entity/entity-tree-table/filesize.pipe';
import { VolumesListComponent, VolumesListTableConfig } from './volumes-list.component';

// Actual page, Material panels, Helm menus and tree. Only middleware loading is
// stubbed; no copied header markup or schema stand-ins establish these contracts.
describe('Pools presentation and column preferences (the internal development record)', () => {
  let fixture: ComponentFixture<VolumesListComponent>;
  let root: HTMLElement;
  let core: CoreService;
  let pref: { preferences: UserPreferences; savePreferences: jasmine.Spy };
  let ws: { call: jasmine.Spy };
  const defaults = ['name', 'type', 'used_parsed', 'available_parsed'];
  const key = 'Pools datasets';
  let fonts: string;
  let iconStyles: HTMLStyleElement;

  beforeAll(async () => {
    const [typefaces, icons] = await Promise.all(['/assets/styles/fonts.css', '/assets/iconfont/material-icons.css'].map(async (url) => {
      const response = await fetch(url);
      return (await response.text()).replace(/url\((['"]?)([^'")]+)\1\)/g, (_, quote, resource) => `url("${new URL(resource, response.url).href}")`);
    }));
    fonts = typefaces;
    // Production loads this global font/class sheet from index.html, which the
    // Karma fixture does not use. Load the actual sheet, including its ligatures.
    iconStyles = document.createElement('style');
    iconStyles.textContent = icons;
    document.head.appendChild(iconStyles);
  });

  afterAll(() => iconStyles?.remove());

  beforeEach(async () => {
    pref = { preferences: { tableDisplayedColumns: [], preferIconsOnly: false }, savePreferences: jasmine.createSpy('savePreferences') };
    ws = { call: jasmine.createSpy('call').and.returnValue(NEVER) };
    spyOn(VolumesListComponent.prototype, 'ngOnInit').and.returnValue(Promise.resolve());
    await TestBed.configureTestingModule({
      declarations: [VolumesListComponent, EntityTreeTableComponent, EntityTableActionsComponent, EntityTableAddActionsComponent, FileSizePipe],
      imports: [CommonModule, CommonDirectivesModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmDropdownMenuImports, HlmSpinnerImports, HlmTooltipImports,
        ...FC_EXPANSION], // the internal development record: the pool panels
      providers: [CoreService, EntityTableService,
        { provide: Router, useValue: { events: NEVER, getCurrentNavigation: () => null, navigate: jasmine.createSpy('navigate') } },
        { provide: PreferencesService, useValue: pref }, { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} }, { provide: DialogService, useValue: {} },
        { provide: AppLoaderService, useValue: {} }, { provide: ErdService, useValue: {} },
        { provide: StorageService, useValue: {} }, { provide: JobService, useValue: {} },
        { provide: MessageService, useValue: {} }, { provide: HttpClient, useValue: {} },
        { provide: ValidationService, useValue: {} },
      ],
    }).overrideComponent(VolumesListComponent, { add: { styles: [fonts] } }).compileComponents();
    core = TestBed.inject(CoreService);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = 'position:fixed;top:0;left:0;width:668px;font-family:"IBM Plex Sans";';
    document.body.appendChild(root);
  });

  afterEach(() => { fixture?.destroy(); root?.remove(); });

  function pool(name: string, overrides: any = {}): any {
    const config = new VolumesListTableConfig(null, null, '', [], null, null, null, null, null, null, {}, null, null, null);
    config.tableData = [{ data: { id: name, name, type: 'FILESYSTEM', used_parsed: 1024, available_parsed: 2048,
      group_actions: true, actions: [{ title: 'Dataset Actions', actions: [{ name: 'Edit Permissions', label: 'Edit Permissions', onClick: () => {} }] }],
    }, children: [{ data: { id: `${name}/child`, name: 'child', type: 'VOLUME', used_parsed: 0, available_parsed: 2048 } }] }];
    return { name, id: name, type: 'zpool', status: 'ONLINE', healthy: true, is_decrypted: true, encrypt: 0, usedStr: '20.77 GiB (57%)', availStr: '15.58 GiB', volumesListTableConfig: config, ...overrides };
  }

  async function mount(rows = [pool('tank'), pool('archive')]) {
    fixture = TestBed.createComponent(VolumesListComponent);
    fixture.componentInstance.zfsPoolRows = rows;
    fixture.componentInstance.systemdatasetPool = rows[0]?.name;
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    await document.fonts.load('300 20px "Material Symbols Outlined"', 'settings');
    await document.fonts.ready;
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function preferences(name: 'UserPreferencesReady' | 'UserPreferencesChanged', cols: any[], extra: UserPreferences = {}) {
    pref.preferences = { ...pref.preferences, ...extra, tableDisplayedColumns: cols };
    core.emit({ name, data: pref.preferences });
    fixture.detectChanges();
  }
  function keydown(element: Element, keyName: string, keyCode: number) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, keyCode, bubbles: true }));
  }
  const columns = () => fixture.debugElement.queryAll(By.directive(EntityTreeTableComponent))
    .map((tree) => (tree.componentInstance as EntityTreeTableComponent).visibleColumns.map((col) => col.prop));

  it('hydrates cached/Ready/Changed preferences by property without saving defaults or touching unrelated entries', async () => {
    pref.preferences.tableDisplayedColumns = [{ title: key, cols: [{ prop: 'comments' }, { prop: 'unknown' }] }];
    await mount();
    expect(columns()).toEqual([['name', 'comments'], ['name', 'comments']]);
    const unrelated = { title: 'Users', cols: [{ prop: 'uid' }] };
    preferences('UserPreferencesReady', [unrelated, { title: key, cols: [{ prop: 'readonly' }, { prop: 'name' }, { prop: 'readonly' }] }]);
    expect(columns()).toEqual([['name', 'readonly'], ['name', 'readonly']]);
    preferences('UserPreferencesChanged', [unrelated]);
    expect(columns()).toEqual([defaults, defaults]);
    expect(pref.preferences.tableDisplayedColumns).toEqual([unrelated]);
    expect(pref.savePreferences).not.toHaveBeenCalled();
    expect(ws.call).not.toHaveBeenCalled();
  });

  it('keeps a local choice across late readiness and saves only once merged with the arriving preferences', async () => {
    const component = await mount();
    component.toggleDatasetColumn('comments');
    fixture.detectChanges();
    expect(pref.savePreferences).not.toHaveBeenCalled();
    const unrelated = { title: 'Users', cols: [{ prop: 'uid' }] };
    preferences('UserPreferencesReady', [unrelated, { title: key, cols: [{ prop: 'readonly' }] }], { userTheme: 'ix-blue' });
    expect(component.selectedDatasetColumns).toEqual([...defaults, 'comments']);
    expect(pref.savePreferences).toHaveBeenCalledTimes(1);
    const saved = pref.savePreferences.calls.mostRecent().args[0];
    expect(saved.userTheme).toBe('ix-blue');
    expect(saved.tableDisplayedColumns[0]).toEqual(unrelated);
    expect(saved.tableDisplayedColumns[1]).toEqual({ title: key, cols: [...defaults, 'comments'].map((prop) => ({ prop })) });
    preferences('UserPreferencesChanged', [{ title: key, cols: [{ prop: 'readonly' }] }]);
    expect(component.selectedDatasetColumns).toEqual([...defaults, 'comments']);
    expect(pref.savePreferences).toHaveBeenCalledTimes(1);
    component.repaintMe();
    expect(component.selectedDatasetColumns).toEqual([...defaults, 'comments']);
    expect(pref.savePreferences).toHaveBeenCalledTimes(1);
    component.resetDatasetColumns();
    fixture.detectChanges();
    expect(columns()).toEqual([defaults, defaults]);
    expect(pref.savePreferences).toHaveBeenCalledTimes(2);
    component.toggleDatasetColumn('name');
    component.toggleDatasetColumn('unknown');
    expect(component.selectedDatasetColumns).toEqual(defaults);
    expect(pref.savePreferences).toHaveBeenCalledTimes(2);
  });

  it('opens the shared Columns menu by keyboard, keeps Name mandatory, toggles in place and restores focus on Escape', async () => {
    await mount();
    preferences('UserPreferencesReady', []);
    const trigger = root.querySelector<HTMLButtonElement>('#pools-columns');
    trigger.focus();
    keydown(trigger, 'ArrowDown', 40);
    fixture.detectChanges();
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelectorAll('[hlmDropdownMenuCheckbox]').length).toBe(9);
    expect(overlay.querySelector('#pools-column-name').getAttribute('aria-disabled')).toBe('true');
    const readonly = overlay.querySelector<HTMLElement>('#pools-column-readonly');
    readonly.focus();
    keydown(readonly, 'Enter', 13);
    fixture.detectChanges();
    expect(columns()).toEqual([[...defaults, 'readonly'], [...defaults, 'readonly']]);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    keydown(readonly, 'Escape', 27);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the actual root dataset permission guard when the projected row menu opens', async () => {
    const component = await mount([pool('tank')]);
    const node = component.zfsPoolRows[0].volumesListTableConfig.tableData[0];
    const kebab = root.querySelector<HTMLButtonElement>('#actions_menu_button__tank');
    kebab.focus();
    keydown(kebab, 'ArrowDown', 40);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(node.data.actions[0].actions[0].disabled).toBeTrue();
    expect(node.data.actions[0].actions[0].matTooltip).toBeTruthy();
    expect(TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLButtonElement>('[hlmDropdownMenuItem]').disabled).toBeTrue();
    keydown(kebab, 'Escape', 27);
    fixture.detectChanges();
    expect(ws.call).not.toHaveBeenCalled();
  });

  it('keeps pool operations outside the accordion trigger, including the OFFLINE labeled action', async () => {
    await mount([pool('tank'), pool('offline', { status: 'OFFLINE', healthy: false })]);
    const panel = root.querySelector<HTMLElement>('#expansionpanel_zfs_tank .fc-expansion-panel-header');
    const cog = root.querySelector<HTMLButtonElement>('#tank_settings_button');
    expect(panel.contains(cog)).toBeFalse();
    const expanded = panel.getAttribute('aria-expanded');
    cog.focus();
    keydown(cog, 'ArrowDown', 40);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel.getAttribute('aria-expanded')).toBe(expanded);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const item = overlay.querySelector<HTMLElement>('[hlmDropdownMenuItem]');
    keydown(item, 'Escape', 27);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(cog);
    const offline = root.querySelector<HTMLElement>('#expansionpanel_zfs_offline .fc-expansion-panel-header');
    expect(offline.getAttribute('aria-disabled')).toBe('true');
    const offlineAction = root.querySelector<HTMLButtonElement>('.pool-panel-offline .pool-operations button');
    expect(offlineAction).not.toBeNull();
    expect(offlineAction.disabled).toBeFalse();
    expect(offlineAction.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right);
    expect(ws.call).not.toHaveBeenCalled();
  });

  it('opts only OFFLINE pool actions into wrapping and preserves the shared single-action default', async () => {
    const rows = [pool('tank'), pool('offline', { status: 'OFFLINE', healthy: false })];
    const component = await mount(rows);
    const poolActions = fixture.debugElement.queryAll(By.directive(EntityTableActionsComponent))
      .map((node) => node.componentInstance as EntityTableActionsComponent);
    expect(poolActions.find((action) => action.row === rows[0]).wrapSingleAction).toBeFalse();
    expect(poolActions.find((action) => action.row === rows[1]).wrapSingleAction).toBeTrue();
    expect(root.querySelector('.pool-panel-offline .pool-operations button').classList.contains('single-action-wrappable')).toBeTrue();

    // A real shared component outside the Pools layout keeps its existing DOM
    // and CSS unless its caller opts in; no copied single-action template.
    const shared = TestBed.createComponent(EntityTableActionsComponent);
    try {
      shared.componentInstance.entity = component.actionComponent as any;
      shared.componentInstance.row = rows[1];
      shared.componentInstance.groups = true;
      root.appendChild(shared.nativeElement);
      shared.detectChanges();
      const button = shared.nativeElement.querySelector('button') as HTMLButtonElement;
      const originalClasses = button.className;
      expect(shared.componentInstance.wrapSingleAction).toBeFalse();
      expect(button.classList.contains('single-action-wrappable')).toBeFalse();
      expect(getComputedStyle(button).position).toBe('relative');
      expect(getComputedStyle(button).right).toBe('16px');
      expect(getComputedStyle(button).whiteSpace).toBe('nowrap');
      shared.componentRef.setInput('wrapSingleAction', true);
      shared.detectChanges();
      expect(shared.nativeElement.querySelector('button')).toBe(button);
      expect(button.classList.contains('single-action-wrappable')).toBeTrue();
      shared.componentRef.setInput('wrapSingleAction', false);
      shared.detectChanges();
      expect(button.className).toBe(originalClasses);
      expect(getComputedStyle(button).right).toBe('16px');
    } finally {
      shared.destroy();
    }
    expect(ws.call).not.toHaveBeenCalled();
    expect(pref.savePreferences).not.toHaveBeenCalled();
  });

  it('keeps long OFFLINE actions above their own narrow summaries and ordinary cogs clear of summary text', async () => {
    root.style.width = '368px';
    const rows = [
      pool('online-before-with-a-long-pool-name', { encrypt: 2 }),
      pool('offline-first-with-a-long-pool-name', { status: 'OFFLINE', healthy: false }),
      pool('offline-second', { status: 'OFFLINE', healthy: false }),
      pool('online-after', { status: 'DEGRADED', healthy: false }),
    ];
    await mount(rows);
    const translatedAction = 'Datenträgerverbund sicher exportieren und von diesem Speichersystem trennen';
    // Stress the real single-action presenter with an already translated label.
    // Keep its actual operation, callback and row association; never invoke it.
    const actions = fixture.debugElement.queryAll(By.directive(EntityTableActionsComponent))
      .map((node) => node.componentInstance as EntityTableActionsComponent);
    for (const action of actions.filter((item) => item.row.status === 'OFFLINE')) {
      action.actions[0].actions[0].label = translatedAction;
    }
    fixture.detectChanges();
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const contains = (outer: DOMRect, inner: DOMRect, context: string) => {
      expect(inner.left).withContext(`${context}: left`).toBeGreaterThanOrEqual(outer.left - 1);
      expect(inner.top).withContext(`${context}: top`).toBeGreaterThanOrEqual(outer.top - 1);
      expect(inner.right).withContext(`${context}: right`).toBeLessThanOrEqual(outer.right + 1);
      expect(inner.bottom).withContext(`${context}: bottom`).toBeLessThanOrEqual(outer.bottom + 1);
    };
    const noIntersection = (first: DOMRect, second: DOMRect, context: string) => {
      const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
      const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
      expect(width <= 1 || height <= 1).withContext(context).toBeTrue();
    };
    const textBounds = (element: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return Array.from(range.getClientRects()).filter((bounds) => bounds.width > 0 && bounds.height > 0);
    };
    const page = root.querySelector<HTMLElement>('.fc-page');
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth + 1);
    const layouts = Array.from(root.querySelectorAll<HTMLElement>('.pool-panel-layout'));
    expect(layouts.length).toBe(rows.length);
    layouts.forEach((layout, index) => {
      const context = rows[index].name;
      const bounds = layout.getBoundingClientRect();
      const operations = layout.querySelector<HTMLElement>('.pool-operations');
      const header = layout.querySelector<HTMLElement>('.pool-summary-header');
      const button = operations.querySelector<HTMLButtonElement>('button');
      const action = actions.find((item) => item.row === rows[index]);
      expect(action).withContext(`${context}: actual row association`).toBeDefined();
      expect(operations.getAttribute('aria-label')).toBe(`Pool Operations: ${context}`);
      expect(layout.querySelector('.pool-name').textContent).toBe(context);
      expect(header.contains(button)).toBeFalse();
      expect(layout.scrollWidth).withContext(`${context}: panel overflow`).toBeLessThanOrEqual(layout.clientWidth + 1);
      contains(root.getBoundingClientRect(), bounds, `${context}: page bounds`);
      contains(bounds, operations.getBoundingClientRect(), `${context}: operations bounds`);
      contains(bounds, header.getBoundingClientRect(), `${context}: header bounds`);
      contains(operations.getBoundingClientRect(), button.getBoundingClientRect(), `${context}: complete button`);
      expect(button.scrollWidth).withContext(`${context}: button text width`).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.scrollHeight).withContext(`${context}: button text height`).toBeLessThanOrEqual(button.clientHeight + 1);
      if (index > 0) {
        expect(layouts[index - 1].getBoundingClientRect().bottom).withContext(`${context}: adjacent pool`)
          .toBeLessThanOrEqual(bounds.top + 1);
      }
      if (rows[index].status === 'OFFLINE') {
        expect(button.textContent.trim()).toBe(translatedAction);
        expect(button.disabled).toBeFalse();
        expect(button.querySelector('mat-icon')).toBeNull(); // The inherited single action is labeled, not a cog.
        expect(header.getAttribute('aria-disabled')).toBe('true');
        expect(operations.getBoundingClientRect().bottom).withContext(`${context}: action above summary`)
          .toBeLessThanOrEqual(header.getBoundingClientRect().top + 1);
        const labelRects = textBounds(button);
        expect(labelRects.length).toBeGreaterThan(0);
        labelRects.forEach((rect) => contains(button.getBoundingClientRect(), rect, `${context}: full label glyphs`));
        button.focus();
        expect(document.activeElement).toBe(button);
      } else {
        const icon = button.querySelector<HTMLElement>('mat-icon');
        expect(icon.textContent.trim()).toBe('settings');
        expect(getComputedStyle(icon).fontFamily).toContain('Material Symbols Outlined');
        expect(document.fonts.check('300 20px "Material Symbols Outlined"', 'settings')).toBeTrue();
        contains(button.getBoundingClientRect(), icon.getBoundingClientRect(), `${context}: cog box`);
        // Range includes the font's ascent/descent, not the painted glyph ink:
        // this shipped face has a 24px range in the unchanged 20px icon box.
        // Both the icon box and full font rectangle must fit the 32px action.
        textBounds(icon).forEach((rect) => contains(button.getBoundingClientRect(), rect, `${context}: cog font bounds`));
        for (const text of header.querySelectorAll<HTMLElement>('.pool-name, .pool-identity-note, .pool-state, .pool-capacity')) {
          contains(header.getBoundingClientRect(), text.getBoundingClientRect(), `${context}: summary content`);
          noIntersection(button.getBoundingClientRect(), text.getBoundingClientRect(), `${context}: cog/text overlap`);
        }
      }
    });
    expect(ws.call).not.toHaveBeenCalled();
    expect(pref.savePreferences).not.toHaveBeenCalled();
  });

  it('fits real pool headers, long identities and all status/encryption explanations at narrow and wide widths', async () => {
    const rows = [
      pool('tank'), pool('unhealthy', { healthy: false }), pool('degraded', { status: 'DEGRADED', healthy: false }),
      pool('locked', { status: 'LOCKED', healthy: false, encrypt: 1, vol_encrypt: 1, is_decrypted: false }),
      pool('faulted', { status: 'FAULTED', healthy: false }), pool('offline', { status: 'OFFLINE', healthy: false }),
      pool('legacy-' + 'long-name-'.repeat(16), { encrypt: 2 }),
    ];
    await mount(rows);
    expect(root.textContent).toContain('(Unhealthy)');
    expect(root.textContent).toContain('This geli-encrypted pool failed to decrypt.');
    expect(root.textContent).toContain('Legacy Encryption');
    expect(root.querySelector('#volume_encrypt_on_locked')).not.toBeNull();
    expect(root.querySelector('#expansionpanel_zfs_locked .fc-expansion-panel-header').getAttribute('aria-expanded')).toBe('false');
    for (const width of [1000, 668, 368, 1400, 668]) {
      root.style.width = `${width}px`;
      fixture.detectChanges();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      for (const header of root.querySelectorAll<HTMLElement>('.pool-summary-header')) {
        expect(header.scrollWidth).withContext(`${width}: ${header.textContent}`).toBeLessThanOrEqual(header.clientWidth + 1);
        const box = header.getBoundingClientRect();
        const layout = header.closest('.pool-panel-layout');
        if (!layout.classList.contains('pool-panel-offline')) {
          const cog = layout.querySelector('button').getBoundingClientRect();
          expect(Math.abs(cog.top + cog.height / 2 - box.top - box.height / 2))
            .withContext(`${width}: cog centered on its own header: ${header.textContent}`).toBeLessThanOrEqual(1);
          const indicator = header.querySelector('.fc-expansion-indicator').getBoundingClientRect();
          expect(Math.abs(cog.top + cog.height / 2 - indicator.top - indicator.height / 2))
            .withContext(`${width}: cog and chevron share an axis`).toBeLessThanOrEqual(1);
          if (header.getAttribute('aria-expanded') === 'true') {
            const tree = layout.querySelector('entity-tree-table').getBoundingClientRect();
            expect(tree.top).withContext(`${width}: expanded tree below header`).toBeGreaterThanOrEqual(box.bottom - 1);
          }
        }
        for (const text of header.querySelectorAll<HTMLElement>('.pool-name, .pool-decryption-error, .pool-capacity')) {
          const bounds = text.getBoundingClientRect();
          expect(bounds.bottom).toBeLessThanOrEqual(box.bottom + 1);
          expect(bounds.right).toBeLessThanOrEqual(box.right + 1);
        }
      }
      if (width >= 668) {
        for (const tree of root.querySelectorAll<HTMLElement>('.entity-tree-table__wrapper')) {
          expect(tree.scrollWidth).toBeLessThanOrEqual(tree.clientWidth + 1);
        }
      }
    }
  });
});
