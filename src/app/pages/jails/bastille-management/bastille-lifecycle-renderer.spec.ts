import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NEVER, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { MaterialModule } from '../../../appMaterial.module';
import { CoreService } from '../../../core/services/core.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { DialogService, JobService, RestService, WebSocketService } from '../../../services';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DocsService } from '../../../services/docs.service';
import { ErdService } from '../../../services/erd.service';
import { LocaleService } from '../../../services/locale.service';
import { StorageService } from '../../../services/storage.service';
import { EntityModule } from '../../common/entity/entity.module';
import { EntityTableComponent } from '../../common/entity/entity-table/entity-table.component';
import { BastilleJail, BastilleManagementComponent } from './bastille-management.component';

// Karma's global bundle omits this production sheet. The real table, detail and
// menu components supply their own markup/styles; only remote boundaries are fake.
@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../assets/styles/material-reduction.css'],
})
class BastilleRendererProductionStylesComponent {}

// Keep the real selector in the DOM: creating EntityTableComponent directly gives
// it a div host and misses production `entity-table .fc-records` margin rules.
@Component({
  standalone: false, template: '<entity-table [title]="page.title" [conf]="page"></entity-table>',
  changeDetection: ChangeDetectionStrategy.Eager,
})
class BastilleRendererHostComponent {
  page: BastilleManagementComponent;
}

describe('Bastille lifecycle through the real 15.2 table renderers', () => {
  const ready = { installed: true, configured: true, configuration_valid: true };
  const stopped: BastilleJail = {
    name: 'web', state: 'down', release: '15.0-RELEASE', boot: true,
    ip4_addr: 'vnet0|192.0.2.50/24', ip6_addr: '', operable: true,
  };
  const running: BastilleJail = { ...stopped, name: 'db', state: 'up', jid: 7 };
  let rows: BastilleJail[];
  let job: Subject<any>;
  let ws: any;
  let dialog: any;
  let view: any;
  let jobRef: any;
  let matDialog: any;
  let page: BastilleManagementComponent;
  let fixture: ComponentFixture<BastilleRendererHostComponent>;
  let table: EntityTableComponent;
  let styles: ComponentFixture<BastilleRendererProductionStylesComponent>;
  let bodyClasses: string;

  beforeEach(async () => {
    rows = [running, stopped, { ...stopped, name: 'unknown', state: 'UNKNOWN' },
      { ...stopped, name: 'unsafe', operable: false, validation_error: 'Unsafe jail root' }];
    job = new Subject<any>();
    const dispatch = jasmine.createSpy('dispatch').and.returnValue(of(42));
    ws = {
      onCloseSubject: NEVER,
      subscribe: () => job.pipe(map((fields) => ({ id: 42, fields }))),
      unsubscribe: () => {},
      call: jasmine.createSpy('call').and.callFake((method, args) => {
        switch (method) {
          case 'bastille.config': return of(ready);
          case 'bastille.query': return of(rows);
          case 'core.get_jobs': return of([{ id: 42, state: 'RUNNING' }]);
          default: return dispatch(method, args);
        }
      }),
      dispatch,
    };
    // The existing standard dialog is a boundary stub: false models rejection,
    // not a rendered Cancel button or focus restoration from that dialog.
    dialog = { confirm: jasmine.createSpy('confirm').and.returnValue(of(false)) };
    view = { job: {}, setDescription: jasmine.createSpy('setDescription'), showCloseButton: false };
    jobRef = { componentInstance: view, close: jasmine.createSpy('close') };
    matDialog = { open: jasmine.createSpy('open').and.returnValue(jobRef) };
    bodyClasses = document.body.className;
    document.body.classList.add('ix-blue', 'fc-ui');
    await TestBed.configureTestingModule({
      declarations: [BastilleRendererProductionStylesComponent, BastilleRendererHostComponent],
      imports: [CommonModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        StorageService,
        { provide: Router, useValue: { events: NEVER, url: '/jails/bastille' } },
        { provide: DialogService, useValue: dialog },
        { provide: JobService, useValue: {} },
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
        { provide: DocsService, useValue: { getDocs: () => of('') } },
        { provide: ErdService, useValue: { attachResizeEventToElement: () => {} } },
        { provide: PreferencesService, useValue: {
          preferences: { tableDisplayedColumns: [{ title: 'Other table', cols: [] }], preferIconsOnly: false },
          savePreferences: () => {},
        } },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
    styles = TestBed.createComponent(BastilleRendererProductionStylesComponent);
    styles.detectChanges();
  });

  afterEach(() => {
    page?.ngOnDestroy();
    fixture?.destroy();
    styles?.destroy();
    TestBed.inject(OverlayContainer).ngOnDestroy();
    TestBed.resetTestingModule();
    document.body.className = bodyClasses;
    page = undefined;
    fixture = undefined;
  });

  function render(width: number): HTMLElement {
    page = new BastilleManagementComponent(
      ws, dialog, matDialog, TestBed.inject(Router), TestBed.inject(TranslateService),
    );
    fixture = TestBed.createComponent(BastilleRendererHostComponent);
    fixture.componentInstance.page = page;
    const root = fixture.nativeElement as HTMLElement;
    root.style.cssText = `display:block;position:absolute;left:0;top:0;width:${width}px`;
    fixture.detectChanges();
    tick(600);
    fixture.detectChanges();
    table = fixture.debugElement.query(By.directive(EntityTableComponent)).componentInstance;
    table.table.recalculate();
    tick(32);
    fixture.detectChanges();
    expect(root.isConnected).toBeTrue();
    return root;
  }

  function row(root: HTMLElement, name: string): HTMLElement {
    return root.querySelector(`[id="${name}_Name"]`).closest('datatable-row-wrapper');
  }

  function actionIds(parent: ParentNode): string[] {
    return Array.from(parent.querySelectorAll<HTMLButtonElement>('button[id^="action_button_"]'))
      .map((button) => button.id.slice(button.id.lastIndexOf('__') + 2));
  }

  function key(element: Element, value: string, keyCode: number): void {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: value, keyCode, bubbles: true }));
    tick();
    fixture.detectChanges();
  }

  function openMenu(root: HTMLElement, name: string): HTMLElement {
    const trigger = row(root, name).querySelector<HTMLButtonElement>('button.row-kebab');
    expect(trigger).not.toBeNull();
    trigger.focus();
    key(trigger, 'Enter', 13);
    const menu = TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.row-menu');
    expect(menu).not.toBeNull();
    expect(menu.getAttribute('role')).toBe('menu');
    return menu;
  }

  // 700px and 1280px page widths leave these content widths after the existing shell/padding.
  for (const width of [668, 1000]) {
    it(`contains the actual detail actions within ${width}px and honors rejected Stop confirmation`, fakeAsync(() => {
      const root = render(width);
      expect(table.hasDetails()).toBeTrue();
      expect(root.querySelector('button.row-kebab')).toBeNull();
      const cases = [
        ['web', ['logs', 'start']], ['db', ['logs', 'restart', 'stop']],
        ['unknown', ['logs', 'start', 'restart', 'stop']], ['unsafe', []],
      ] as [string, string[]][];
      for (const [name, expected] of cases) {
        const wrapper = row(root, name);
        wrapper.querySelector<HTMLElement>('.datatable-icon-right').click();
        tick(32);
        fixture.detectChanges();
        const detail = wrapper.querySelector<HTMLElement>('app-entity-table-row-details');
        expect(detail).not.toBeNull();
        expect(actionIds(detail)).toEqual(expected);
        expect(Array.from(detail.querySelectorAll('h4')).map((heading) => heading.textContent.trim()))
          .toEqual(['Boot:', 'IPv4:', 'IPv6:']);
        expect(detail.querySelector('.mat-mdc-button')).toBeNull();
        const bounds = detail.getBoundingClientRect();
        expect(bounds.width).toBeGreaterThan(0);
        const geometry = [root, root.querySelector('.ngx-datatable'), wrapper, detail].map((element) => ({
          tag: element.tagName, classes: element.className,
          left: element.getBoundingClientRect().left, width: element.getBoundingClientRect().width,
          clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        }));
        expect(bounds.right).withContext(JSON.stringify(geometry)).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
        detail.querySelectorAll<HTMLButtonElement>('.entity-table-row-actions-layout > button').forEach((button) => {
          expect(button.type).toBe('button');
          expect(button.disabled).toBeFalse();
          expect(button.tabIndex).toBe(0);
          button.focus();
          expect(document.activeElement).toBe(button);
          const rect = button.getBoundingClientRect();
          expect(rect.height).toBeGreaterThanOrEqual(32);
          expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
          expect(rect.right).toBeLessThanOrEqual(bounds.right);
          const label = button.querySelector('p');
          expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        });
        if (name === 'db') {
          detail.querySelector<HTMLButtonElement>('button[id$="__stop"]').click();
          expect(dialog.confirm).toHaveBeenCalledOnceWith('Stop Jail', 'Stop db?', true, 'Stop');
          expect(ws.dispatch).not.toHaveBeenCalled();
          expect(matDialog.open).not.toHaveBeenCalled();
        }
        wrapper.querySelector<HTMLElement>('.datatable-icon-down').click();
        tick(32);
        fixture.detectChanges();
      }
      tick(500);
    }));
  }

  it('uses keyboard menu actions within the browser viewport, dispatches the name only and refreshes the state', fakeAsync(() => {
    const root = render(668);
    table.checkAll(); // real Columns selection path; preference service is local to this fixture
    fixture.detectChanges();
    tick(32);
    table.table.recalculate();
    fixture.detectChanges();
    expect(table.hasDetails()).toBeFalse();
    expect(root.querySelector('datatable-body-row .datatable-icon-right')).toBeNull();
    const menu = openMenu(root, 'web');
    expect(actionIds(menu)).toEqual(['logs', 'start']);
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    expect(document.activeElement).toBe(items[0]);
    key(items[0], 'ArrowDown', 40);
    expect(document.activeElement).toBe(items[1]);
    key(items[1], 'Enter', 13);
    tick(500);
    fixture.detectChanges();
    expect(ws.dispatch).toHaveBeenCalledOnceWith('bastille.start', ['web']);
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(matDialog.open.calls.mostRecent().args[1].data.title).toBe('Starting web');
    rows = rows.map((jail) => jail.name === 'web' ? { ...jail, state: 'up' as const, jid: 8 } : jail);
    job.next({ state: 'SUCCESS', result: true });
    tick(32);
    fixture.detectChanges();
    expect(jobRef.close).toHaveBeenCalledWith(true);
    expect(row(root, 'web').textContent).toContain('up');
    const refreshed = openMenu(root, 'web');
    expect(actionIds(refreshed)).toEqual(['logs', 'restart', 'stop']);
    const rect = refreshed.getBoundingClientRect();
    // The overlay lives under document.body, not the 668px table fixture. This
    // proves menu size/browser-viewport bounds only; the detail tests above are
    // the proof of containment within the actual narrow table container.
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.width).toBeLessThanOrEqual(668);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).withContext('the real overlay stays inside the browser viewport')
      .toBeLessThanOrEqual(window.innerWidth);
    refreshed.querySelectorAll<HTMLButtonElement>('[role="menuitem"]').forEach((item) => {
      expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
    });
    key(document.activeElement, 'Escape', 27);
    tick(500);
    fixture.detectChanges();
    expect(TestBed.inject(OverlayContainer).getContainerElement().querySelector('hlm-dropdown-menu.row-menu')).toBeNull();
    expect(document.activeElement).toBe(row(root, 'web').querySelector('button.row-kebab'));
  }));

  it('honors rejected confirmation after keyboard Stop and passes Restart failure to the existing dialog boundary', fakeAsync(() => {
    const root = render(668);
    table.checkAll();
    fixture.detectChanges();
    tick(32);
    const menu = openMenu(root, 'db');
    expect(actionIds(menu)).toEqual(['logs', 'restart', 'stop']);
    const stop = menu.querySelector<HTMLButtonElement>('button[id$="__stop"]');
    stop.focus();
    key(stop, 'Enter', 13);
    tick(500);
    fixture.detectChanges();
    expect(dialog.confirm).toHaveBeenCalledOnceWith('Stop Jail', 'Stop db?', true, 'Stop');
    expect(ws.dispatch).not.toHaveBeenCalled();
    const again = openMenu(root, 'db');
    const restart = again.querySelector<HTMLButtonElement>('button[id$="__restart"]');
    restart.focus();
    key(restart, 'Enter', 13);
    tick(500);
    fixture.detectChanges();
    expect(ws.dispatch).toHaveBeenCalledOnceWith('bastille.restart', ['db']);
    job.next({ state: 'FAILED', error: 'Bastille restart did not leave the jail running.' });
    tick(32);
    fixture.detectChanges();
    expect(view.job.state).toBe('FAILED');
    expect(view.showCloseButton).toBeTrue();
    expect(page.error).toBe('Bastille restart did not leave the jail running.');
    expect(jobRef.close).not.toHaveBeenCalled();
    tick(500);
  }));
});
