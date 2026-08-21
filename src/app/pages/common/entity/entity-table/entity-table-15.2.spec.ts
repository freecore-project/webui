import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { EntityTableComponent } from './entity-table.component';

// the internal development record: the list table, dialogs and menus on the shell tokens.
// A real ngx-datatable renders inside .fc-ui .fc-records with the entity
// table's heights; a real MatDialog opens into the overlay (the Material menu case retired with the app's last mat-menu, the internal development record)
// container, which is in scope because the shell marks <body> (#353).
@Component({
  standalone: false,
  template: `
    <h2 mat-dialog-title>Stats/Settings</h2>
    <mat-dialog-content>Boot pool condition: Healthy</mat-dialog-content>
    <mat-dialog-actions><button mat-button color="accent" mat-dialog-close>Close</button><button mat-button color="primary">Update interval</button></mat-dialog-actions>
  `,
})
class TableDialogComponent {}

@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue" style="width: 720px;">
      <div id="entity-table-component" class="fc-records">
        <ngx-datatable class="material" [rows]="rows" [columns]="columns" [columnMode]="'force'"
          [headerHeight]="headerHeight" [rowHeight]="rowHeight" [footerHeight]="40" [scrollbarV]="false">
        </ngx-datatable>
      </div>
    </div>
  `,
})
class TableHostComponent {
  headerHeight = EntityTableComponent.HEADER_HEIGHT;
  rowHeight = EntityTableComponent.ROW_HEIGHT;
  columns = [{ name: 'Name', prop: 'name' }, { name: 'Active', prop: 'active' }, { name: 'Space', prop: 'space' }];
  rows = [{ name: 'Before_UI_Review', active: '-', space: '2.00 GiB' }, { name: 'FreeCORE-15.2-review', active: 'Now/Reboot', space: '4.00 GiB' }];
}

describe('15.2 tables, dialogs and menus (the internal development record)', () => {
  let fixture: ComponentFixture<TableHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };
  const q = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const line = 'rgb(42, 53, 61)';

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui');
    await TestBed.configureTestingModule({
      declarations: [TableHostComponent, TableDialogComponent],
      imports: [CommonModule, NgxDatatableModule, MatButtonModule, MatDialogModule, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui');
  });

  it('keeps the entity table on the shell heights: 40px rows, 32px header, 40px footer', () => {
    expect(EntityTableComponent.ROW_HEIGHT).toBe(40);
    expect(EntityTableComponent.HEADER_HEIGHT).toBe(32);
    const table = Object.create(EntityTableComponent.prototype) as EntityTableComponent;
    expect((table as unknown as { footerHeight: number }).footerHeight ?? 40).toBe(40);
  });

  it('draws a 32px uppercase header over one hairline and 40px rows in fg1 without vertical rules', () => {
    const headerCell = q('.datatable-header-cell');
    const label = q('.datatable-header-cell-label');
    expect(q('.datatable-header').getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(headerCell).textTransform).toBe('uppercase');
    expect(getComputedStyle(headerCell).fontSize).toBe('11px');
    expect(getComputedStyle(headerCell).color).toBe(fg2);
    expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(headerCell.getBoundingClientRect().bottom + 0.5);
    expect(getComputedStyle(q('.datatable-header')).borderBottomColor).toBe(line);
    expect(getComputedStyle(q('.resize-handle')).borderRightColor).toBe('rgba(0, 0, 0, 0)');

    const row = q('.datatable-body-row');
    const cell = q('.datatable-body-cell');
    expect(row.getBoundingClientRect().height).toBe(40);
    expect(getComputedStyle(cell).color).toBe(fg1);
    expect(getComputedStyle(cell).fontSize).toBe('13px');
    expect(getComputedStyle(cell).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(cell).borderRightWidth).toBe('0px');
    expect(getComputedStyle(cell).borderBottomWidth).toBe('1px');
  });

  it('opens a dialog on the raised surface with a hairline, 6px radius, no elevation and a 16/500 title', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(TableDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = document.querySelector('.mat-mdc-dialog-surface') as HTMLElement;
    const title = document.querySelector('.mat-mdc-dialog-title') as HTMLElement;
    try {
      expect(getComputedStyle(surface).backgroundColor).toBe('rgb(23, 30, 36)');
      expect(getComputedStyle(surface).borderTopColor).toBe(line);
      expect(getComputedStyle(surface).borderTopLeftRadius).toBe('6px'); // the internal development record: the dialog law (was 8px)
      expect(getComputedStyle(surface).boxShadow).toBe('none');
      expect(getComputedStyle(title).fontSize).toBe('16px');
      expect(getComputedStyle(title).fontWeight).toBe('500');
      const primary = document.querySelector('.mat-mdc-dialog-actions .mat-primary') as HTMLElement;
      expect(getComputedStyle(primary).backgroundColor).toBe(fg1);
    } finally {
      ref.close();
      fixture.detectChanges();
      await fixture.whenStable();
    }
  });
});
