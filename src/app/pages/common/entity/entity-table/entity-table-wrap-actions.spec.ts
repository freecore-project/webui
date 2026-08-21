import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
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
import { EntityTableAction, EntityTableComponent, InputTableConf } from './entity-table.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../assets/styles/material-reduction.css'],
})
class ProductionStylesComponent {}

// A host with six row actions: the wrap boundary this measures needs a row wide enough
// to wrap, and the internal development record reduced the Bastille page to one action.
@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
})
class WrapHostComponent implements InputTableConf {
  title = 'Wrap host';
  queryCall = 'stub.query';
  // The column shape this measurement was written against: two always-displayed
  // columns, three optional, two hidden. The fixed detail height derives from it.
  rows = ['web', 'web2'].map((name) => ({
    name, state: 'up', release: '15.1-RELEASE', boot: 'Yes', ip4_addr: '192.0.2.5/24', interface: 'em0', bridge: 'bridge0',
  }));
  rowIdentifier = 'name';
  autoFillWindowHeight = true;
  wrapRowActions = true;
  columns = [
    { name: 'Name', prop: 'name', always_display: true },
    { name: 'State', prop: 'state', always_display: true },
    { name: 'Release', prop: 'release' },
    { name: 'Auto-start', prop: 'boot' },
    { name: 'IPv4', prop: 'ip4_addr' },
    { name: 'Interface', prop: 'interface', hidden: true },
    { name: 'Bridge', prop: 'bridge', hidden: true },
  ];
  config = { paging: true, sorting: { columns: this.columns }, multiSelect: false };
  getActions(): EntityTableAction[] {
    return ['start', 'stop', 'restart', 'shell', 'logs', 'delete'].map((id) => ({
      id, icon: 'info', label: id, onClick: () => {},
    }));
  }

  // The same data path the Bastille page used when this measurement was written:
  // the host supplies the observable and the table subscribes to it.
  callGetFunction(entity: any): void {
    entity.getFunction = of(this.rows);
    entity.callGetFunction();
  }
}

describe('Entity table row action wrapping', () => {
  let preferences: { tableDisplayedColumns: any[]; preferIconsOnly: boolean };

  beforeEach(async () => {
    preferences = { tableDisplayedColumns: [], preferIconsOnly: false };
    const ws = { onCloseSubject: NEVER, call: () => NEVER };
    await TestBed.configureTestingModule({
      declarations: [WrapHostComponent, ProductionStylesComponent],
      imports: [CommonModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        DialogService, JobService, StorageService, ErdService,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['jail', 'web']]) } } },
        { provide: Router, useValue: { events: NEVER, url: '/wrap-host' } },
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
        { provide: DocsService, useValue: { getDocs: () => of('') } },
        { provide: PreferencesService, useValue: { preferences, savePreferences: () => {} } },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
    TestBed.createComponent(ProductionStylesComponent).detectChanges();
  });

  for (const wrap of [false, true]) {
    it(`${wrap ? 'wraps row actions and measures expanded rows across resize' : 'preserves the native fixed-height detail path without observers'}`, fakeAsync(() => {
      const observers: { element?: Element; notify: () => void; disconnect: jasmine.Spy }[] = [];
      spyOn(window, 'ResizeObserver').and.callFake(function (callback: ResizeObserverCallback) {
        const observer = {
          element: undefined as Element,
          observe: (element: Element) => { observer.element = element; },
          unobserve: () => {},
          disconnect: jasmine.createSpy('disconnect'),
          notify: () => callback([], observer),
        };
        observers.push(observer);
        return observer;
      });
      const fixture = TestBed.createComponent(WrapHostComponent);
      fixture.componentInstance.wrapRowActions = wrap;
      // Six actions land exactly on the wrap boundary at 900px -- the same width then
      // measured wrapped or unwrapped depending on style state left by earlier specs.
      // The wide width has to be unambiguously wide for the action set, or this
      // measures a coin flip.
      fixture.nativeElement.style.cssText = 'display:block;width:1200px';
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      const tableNode = fixture.debugElement.query(By.directive(EntityTableComponent));
      const table = tableNode.componentInstance as EntityTableComponent;
      const redraw = () => {
        fixture.detectChanges();
        tableNode.injector.get(ChangeDetectorRef).detectChanges();
      };
      tick(2100);
      redraw();
      table.tableHeight = 700;
      table.fixedTableHight = true;
      redraw();
      table.table.recalculate();
      tick(32);
      redraw();
      table.toggleExpandRow(table.currentRows[0]);
      table.toggleExpandRow(table.currentRows[1]);
      redraw();
      tick(32);
      redraw();
      tick(120);
      redraw();
      const detailHosts = () => Array.from(fixture.nativeElement.querySelectorAll('app-entity-table-row-details')) as HTMLElement[];
      expect(detailHosts().length).toBe(2);
      if (!wrap) {
        expect(observers.length).toBe(0);
        expect(table.getRowDetailHeight(table.currentRows[0])).toBe(133); // 2 lines * 24 + the strip's 85px chrome
        expect(getComputedStyle(detailHosts()[0].querySelector('.entity-table-row-actions-layout')).flexWrap).toBe('nowrap');
      } else {
        expect(observers.length).toBe(2);
        const assertGeometry = () => {
          const hosts = detailHosts();
          const body = fixture.nativeElement.querySelector('datatable-body').getBoundingClientRect();
          hosts.forEach((host) => {
            const boundary = host.getBoundingClientRect();
            expect(boundary.right).toBeLessThanOrEqual(body.right + 1);
            expect(boundary.left).toBeGreaterThanOrEqual(body.left - 1);
            expect(host.parentElement.getBoundingClientRect().height).toBeGreaterThanOrEqual(Math.ceil(boundary.height));
            host.querySelectorAll('.entity-table-row-actions-layout > button').forEach((button) => {
              expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(boundary.right + 1);
            });
          });
          const wrappers = Array.from(fixture.nativeElement.querySelectorAll('datatable-row-wrapper')) as HTMLElement[];
          expect(wrappers[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(wrappers[0].getBoundingClientRect().bottom - 1);
        };
        assertGeometry();
        const initialHeight = table.getRowDetailHeight(table.currentRows[0]);
        fixture.nativeElement.style.width = '540px';
        table.table.recalculate();
        redraw();
        observers.forEach((observer) => observer.notify());
        tick(32);
        redraw();
        tick(120);
        redraw();
        expect(table.getRowDetailHeight(table.currentRows[0])).toBeGreaterThan(initialHeight);
        assertGeometry();
        const unchangedRows = table.currentRows;
        observers.forEach((observer) => observer.notify());
        tick(32);
        redraw();
        expect(table.currentRows).toBe(unchangedRows);
        table.toggleExpandRow(table.currentRows[0]);
        redraw();
        expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
        fixture.nativeElement.style.width = '1200px';
        table.table.recalculate();
        table.toggleExpandRow(table.currentRows[0]);
        redraw();
        observers.filter((observer) => !observer.disconnect.calls.count()).forEach((observer) => observer.notify());
        tick(32);
        redraw();
        tick(120);
        redraw();
        expect(table.getRowDetailHeight(table.currentRows[0])).toBe(initialHeight);
        assertGeometry();
        observers.filter((observer) => !observer.disconnect.calls.count()).forEach((observer) => observer.notify());
      }
      fixture.destroy();
      tick(200);
      observers.forEach((observer) => expect(observer.disconnect).toHaveBeenCalledTimes(1));
    }));
  }
});
