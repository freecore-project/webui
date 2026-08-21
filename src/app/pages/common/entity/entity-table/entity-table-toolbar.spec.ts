import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ViewEncapsulation } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { CoreService } from '../../../../core/services/core.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { DialogService, JobService, RestService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { DocsService } from '../../../../services/docs.service';
import { ErdService } from '../../../../services/erd.service';
import { LocaleService } from '../../../../services/locale.service';
import { StorageService } from '../../../../services/storage.service';
import { EntityModule } from '../entity.module';
import { EntityTableComponent } from './entity-table.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../assets/styles/material-reduction.css'],
})
class ToolbarProductionStylesComponent {}

describe('FreeCORE EntityTable toolbar', () => {
  let fixture: ComponentFixture<EntityTableComponent>;
  let overlay: OverlayContainer;
  let preferences: { preferences: object; savePreferences: jasmine.Spy };
  let refresh: jasmine.Spy;
  let configure: jasmine.Spy;

  beforeEach(async () => {
    const rows = [{ id: 1, name: 'First disk', serial: 'SAMPLE-01' }, { id: 2, name: 'Second disk', serial: 'SAMPLE-02' }];
    preferences = {
      preferences: { tableDisplayedColumns: [], preferIconsOnly: false },
      savePreferences: jasmine.createSpy('savePreferences'),
    };
    refresh = jasmine.createSpy('refresh');
    configure = jasmine.createSpy('configure');
    await TestBed.configureTestingModule({
      declarations: [ToolbarProductionStylesComponent],
      imports: [CommonModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        DialogService, JobService, StorageService, ErdService,
        { provide: Router, useValue: { events: NEVER, url: '/storage/disks' } },
        { provide: WebSocketService, useValue: { call: () => of(rows), onCloseSubject: NEVER } },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
        { provide: DocsService, useValue: { getDocs: () => of('') } },
        { provide: PreferencesService, useValue: preferences },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
    TestBed.createComponent(ToolbarProductionStylesComponent).detectChanges();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(EntityTableComponent);
    fixture.componentInstance.title = 'Disks';
    const conf = {
      title: 'Disks', queryCall: 'disk.query', noActions: true, multiActions: [],
      columns: [
        { name: 'Name', prop: 'name', always_display: true },
        { name: 'Serial', prop: 'serial' },
      ],
      config: {},
      custActions: [{ id: 'refresh', name: 'Refresh', function: refresh }],
      globalConfig: { id: 'configure-disks', tooltip: 'Configure disks', onClick: configure },
    };
    fixture.componentInstance.conf = conf;
    fixture.nativeElement.classList.add('ix-blue');
    fixture.nativeElement.style.cssText = 'display:block;width:900px';
  });

  afterEach(() => overlay.ngOnDestroy());

  function render(): HTMLElement {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick(2100);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  function finish(): void {
    fixture.destroy();
    tick(200);
  }

  it('opens the real Columns menu with an accessible icon and retains column preferences and reset', fakeAsync(() => {
    const root = render();
    const button = root.querySelector<HTMLButtonElement>('.fc-table-columns');
    expect(button.getAttribute('aria-label')).toBe('Columns: Disks');
    expect(button.textContent.trim()).toBe('view_column');
    expect(button.getAttribute('ix-auto')).toBe('button__Disks_COLUMNS');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    button.focus();
    button.click();
    tick();
    fixture.detectChanges();
    // the internal development record: the picker is the helm dropdown-menu (a CDK menu); its column rows are
    // menuitemcheckbox hosts, Select All / Reset keep-open items.
    const menu = overlay.getContainerElement();
    expect(menu.querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull();
    const option = menu.querySelector<HTMLElement>('#menu_option-Serial');
    expect(option).not.toBeNull();
    expect(option.getAttribute('role')).toBe('menuitemcheckbox');
    expect(option.getAttribute('aria-checked')).toBe('true');
    option.click();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.columns.length).toBe(0);
    expect(option.getAttribute('aria-checked')).toBe('false');
    expect(menu.querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull(); // stays open
    expect(preferences.savePreferences).toHaveBeenCalled();
    expect(menu.querySelector('#reset_col_view')).not.toBeNull();
    menu.querySelector<HTMLButtonElement>('#reset_col_view').click();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.columns.map((column) => column.prop)).toEqual(['serial']);
    menu.querySelector<HTMLButtonElement>('#check-all').click();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.columns.length).toBe(0);
    menu.querySelector<HTMLButtonElement>('#check-all').click();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.columns.length).toBe(1);
    expect(menu.querySelector('hlm-dropdown-menu.columns-menu')).not.toBeNull(); // still open after Reset and Select All
    // The CDK menu owns keyboard dismissal and focus restoration.
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(escape, 'keyCode', { get: () => 27 });
    menu.querySelector<HTMLElement>('[role=menu]').dispatchEvent(escape);
    tick();
    fixture.detectChanges();
    expect(menu.querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(button);
    finish();
  }));

  it('wraps the real toolbar within narrow containers and keeps custom controls usable', fakeAsync(() => {
    const root = render();
    const toolbar = root.querySelector<HTMLElement>('.entity-table-toolbar-layout');
    const title = root.querySelector<HTMLElement>('h2');
    const controls = root.querySelector<HTMLElement>('.entity-table-controls-layout');
    for (const width of [900, 540, 280]) {
      root.style.width = `${width}px`;
      fixture.detectChanges();
      const bounds = toolbar.getBoundingClientRect();
      expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(controls.getBoundingClientRect().top);
      expect(controls.scrollWidth).toBeLessThanOrEqual(Math.ceil(controls.getBoundingClientRect().width));
      for (const item of Array.from(controls.querySelectorAll<HTMLElement>('input, button'))) {
        const target = item.getBoundingClientRect();
        expect(target.left).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(target.right).toBeLessThanOrEqual(bounds.right + 1);
        expect(target.width).toBeGreaterThan(0);
      }
    }
    root.querySelector<HTMLButtonElement>('#cust_button_Refresh').click();
    root.querySelector<HTMLButtonElement>('#configure-disks').click();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledTimes(1);
    finish();
  }));

  it('preserves the filter subscription and honors the Columns visibility setting', fakeAsync(() => {
    fixture.componentInstance.conf.columnFilter = false;
    const root = render();
    expect(root.querySelector('.fc-table-columns')).toBeNull();
    const input = root.querySelector<HTMLInputElement>('#filter input');
    expect(input.getAttribute('aria-label')).toBe('Filter Disks');
    input.value = 'Second';
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }));
    tick(151);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentRows.map((row) => row.name)).toEqual(['Second disk']);
    expect(fixture.componentInstance.paginationPageIndex).toBe(0);
    finish();
  }));
});
