import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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
class SelectionProductionStylesComponent {}

describe('EntityTable selection control alignment', () => {
  afterEach(() => document.body.classList.remove('fc-ui'));

  beforeEach(async () => {
    const rows = [{ id: 1, name: 'First disk' }, { id: 2, name: 'Second disk' }, { id: 3, name: 'Zeta disk', hideCheckbox: true }];
    await TestBed.configureTestingModule({
      declarations: [SelectionProductionStylesComponent],
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
        { provide: PreferencesService, useValue: {
          preferences: { tableDisplayedColumns: [], preferIconsOnly: false }, savePreferences: () => {},
        } },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
    TestBed.createComponent(SelectionProductionStylesComponent).detectChanges();
  });

  it('aligns the header and row #352 boxes on one column, the whole cell as the hit area, keeping bulk, single, keyboard and range selection across resize', fakeAsync(() => {
    const fixture = TestBed.createComponent(EntityTableComponent);
    const table = fixture.componentInstance;
    table.title = 'Selectable rows';
    table.conf = {
      queryCall: 'disk.query', noActions: true, hasDetails: false, multiActions: [],
      columns: [{ name: 'Name', prop: 'name', always_display: true }],
      config: { multiSelect: true },
    };
    const root = fixture.nativeElement as HTMLElement;
    // the internal development record: measured on the 15.2 geometry (32px header, 40px rows) under the shell scope.
    root.classList.add('ix-blue', 'fc-ui');
    document.body.classList.add('fc-ui');
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick(2100);
    fixture.detectChanges();
    table.fixedTableHight = true;
    table.tableHeight = 350;
    fixture.detectChanges();
    table.table.recalculate();
    tick(32);
    fixture.detectChanges();

    // the internal development record: the header and the rows draw the same #352 box (hlm-checkbox, a 16px
    // button); the header's sits in a 32px cell, each row's in the whole 85x40 cell (#385), which
    // is the hit area. Selection is driven by the cell's click, the box only mirrors it.
    const headerBox = (): HTMLButtonElement => root.querySelector('.headerCheckBox button[role="checkbox"]');
    const rowCells = (): HTMLElement[] => Array.from(root.querySelectorAll('.row-checkbox'));
    const rowBoxes = (): HTMLButtonElement[] => Array.from(root.querySelectorAll('.row-checkbox button[role="checkbox"]'));
    const checked = (box: HTMLButtonElement): boolean => box.getAttribute('data-state') === 'checked';
    const redraw = (): void => { fixture.detectChanges(); tick(32); fixture.detectChanges(); };
    const verifyAlignment = (): void => {
      const header = root.querySelector<HTMLElement>('datatable-header');
      const headerSquare = headerBox();
      const headerTarget = root.querySelector<HTMLElement>('.headerCheckBox .checkbox-cell');
      expect(header.getBoundingClientRect().height).toBeCloseTo(32, 1);
      expect(center(headerSquare).y).toBeCloseTo(center(header).y, 1);
      expectSquare(headerSquare, 16);
      expectSquare(headerTarget, 32);
      expectInside(headerTarget, header);
      expect(getComputedStyle(headerSquare).borderTopLeftRadius).toBe('4px');
      const boxes = rowBoxes();
      expect(boxes.length).toBe(3);
      boxes.forEach((square) => {
        const row = square.closest<HTMLElement>('datatable-body-row');
        const cell = square.closest<HTMLElement>('datatable-body-cell');
        const target = square.closest<HTMLElement>('.row-checkbox');
        expect(row.getBoundingClientRect().height).toBeCloseTo(40, 1);
        expectSquare(square, 16);
        // the hit area is the whole cell -- the 40px row, never into the neighbours
        expect(target.getBoundingClientRect().height).toBeCloseTo(40, 1);
        expect(target.getBoundingClientRect().width).toBeCloseTo(cell.getBoundingClientRect().width, 1);
        expect(getComputedStyle(target).cursor).toBe(target.classList.contains('row-checkbox-hidden') ? 'default' : 'pointer');
        expect(getComputedStyle(square).pointerEvents).toBe('none'); // the cell is the only pointer path
        expect(center(square).x).toBeCloseTo(center(headerSquare).x, 1);
        expect(center(square).x).toBeCloseTo(center(cell).x, 1);
        const borders = getComputedStyle(cell);
        const topBorder = parseFloat(borders.borderTopWidth);
        const bottomBorder = parseFloat(borders.borderBottomWidth);
        const contentCenter = center(cell).y + (topBorder - bottomBorder) / 2;
        expect(center(square).y).toBeCloseTo(contentCenter, 1);
        expect(Math.abs(center(square).y - center(row).y)).toBeLessThanOrEqual(0.5);
        expectInside(target, cell);
        expect(cell.querySelector('mat-checkbox, .fake-mat-checkbox, input')).toBeNull();
      });
    };
    verifyAlignment();
    expect(table.selected).toEqual([]);
    expect(rowBoxes().every((box) => !checked(box))).toBeTrue();
    expect(headerBox().getAttribute('aria-label')).toBe('Select all');
    expect(rowBoxes().map((box) => box.getAttribute('aria-label'))).toEqual(['First disk', 'Second disk', 'Zeta disk']);
    // the hideCheckbox row: a disabled box, its cell inert
    const hidden = root.querySelector<HTMLButtonElement>('.row-checkbox-hidden button[role="checkbox"]');
    expect(hidden.disabled).toBeTrue();
    hidden.closest('.row-checkbox').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    redraw();
    expect(table.selected).toEqual([]);

    headerBox().click();
    redraw();
    // select-all takes the hidden row too, and the footer counts it out
    expect(table.selected.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(table.removeFromSelectedTotal).toBe(1);
    expect(rowBoxes().slice(0, 2).every((box) => checked(box))).toBeTrue();
    expect(rowCells().slice(0, 2).every((cell) => cell.hasAttribute('data-selected'))).toBeTrue();
    // a shift-click whose range keeps a selected row selected leaves its box checked (the box
    // mirrors the selection; a click on the box itself cannot flip it ahead of ngx)
    rowCells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    redraw();
    rowCells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    redraw();
    expect(table.selected.map((row) => row.id).sort()).toEqual([1, 2, 3]);
    rowCells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    redraw();
    expect(table.selected.map((row) => row.id)).toEqual([1]);
    expect(rowBoxes().slice(0, 2).map((box) => checked(box))).toEqual([true, false]);
    headerBox().click();
    redraw();
    expect(table.selected.map((row) => row.id)).toEqual([1, 2, 3]);
    const first = rowBoxes()[0];
    // the fill is a 120ms transition (proven at rest in form-checkbox's spec); the mark is immediate
    expect(first.querySelector('ng-icon')).not.toBeNull();
    // a click on the cell outside the box deselects the row
    const firstCell = rowCells()[0];
    firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    redraw();
    expect(table.selected.map((row) => row.id)).toEqual([2, 3]);
    expect(rowBoxes().slice(0, 2).map((box) => checked(box))).toEqual([false, true]);
    expect(rowCells()[0].hasAttribute('data-selected')).toBeFalse();
    expect(checked(headerBox())).toBeFalse();
    expect(first.querySelector('ng-icon')).toBeNull();
    verifyAlignment();

    // the box itself is focusable and a keyboard activation (a detail=0 click) selects
    first.focus();
    expect(document.activeElement).toBe(first);
    expect(first.tabIndex).toBe(0);
    first.click();
    redraw();
    expect(table.selected.map((row) => row.id).sort()).toEqual([1, 2, 3]);
    verifyAlignment();
    headerBox().click();
    redraw();
    expect(table.selected).toEqual([]);

    // shift-click from the first cell to the second selects the range
    rowCells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    redraw();
    rowCells()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    redraw();
    expect(table.selected.map((row) => row.id).sort()).toEqual([1, 2]);
    headerBox().click();
    redraw();
    expect(table.selected.length).toBe(3);
    headerBox().click();
    redraw();
    expect(table.selected).toEqual([]);

    root.style.width = '540px';
    table.table.recalculate();
    redraw();
    verifyAlignment();
    headerBox().click();
    redraw();
    expect(table.selected.length).toBe(3);
    headerBox().click();
    redraw();
    expect(table.selected).toEqual([]);
    expect(rowBoxes().every((box) => !checked(box))).toBeTrue();
    fixture.destroy();
    tick(200);
  }));

  function center(element: HTMLElement): { x: number; y: number } {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  }

  function expectSquare(element: HTMLElement, size: number): void {
    expect(element.getBoundingClientRect().width).toBeCloseTo(size, 1);
    expect(element.getBoundingClientRect().height).toBeCloseTo(size, 1);
  }

  function expectInside(element: HTMLElement, container: HTMLElement): void {
    const inner = element.getBoundingClientRect();
    const outer = container.getBoundingClientRect();
    expect(inner.top).toBeGreaterThanOrEqual(outer.top - 0.1);
    expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + 0.1);
    expect(inner.left).toBeGreaterThanOrEqual(outer.left - 0.1);
    expect(inner.right).toBeLessThanOrEqual(outer.right + 0.1);
  }
});
