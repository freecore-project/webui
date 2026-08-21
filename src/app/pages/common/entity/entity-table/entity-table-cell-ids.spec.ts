import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';

@Component({
  standalone: false,
  selector: 'entity-table-cell-id-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ngx-datatable [rows]="rows">
      @for (col of columns; track col; let colIndex = $index) {
        <ngx-datatable-column
          [name]="col.name"
          [prop]="col.prop"
          >
          <ng-template let-row="row" let-rowIndex="rowIndex" ngx-datatable-cell-template>
            <div
              class="entity-table-value-cell"
              id="{{ row[rowIdentifier] }}_{{ col.name }}_{{ colIndex }}_{{ rowIndex }}"
              >
              @if (col.selectable) {
                <hlm-checkbox
                  id="{{ row[rowIdentifier] }}_{{ col.name }}-checkbox_{{ colIndex }}_{{ rowIndex }}"
                  [checked]="row[col.prop]"
                />
              }
              @if (!col.selectable) {
                <span>{{ row[col.prop] }}</span>
              }
            </div>
          </ng-template>
        </ngx-datatable-column>
      }
    </ngx-datatable>
    `,
})
class EntityTableCellIdTestHostComponent {
  rowIdentifier = 'username';
  columns = [
    { name: 'UID', prop: 'uid' },
    { name: 'Enabled', prop: 'enabled', selectable: true },
  ];
  rows = [
    { username: 'root', uid: 0, enabled: true },
    { username: 'operator', uid: 1000, enabled: false },
  ];
}

describe('EntityTable configurable cell IDs', () => {
  let fixture: ComponentFixture<EntityTableCellIdTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityTableCellIdTestHostComponent],
      imports: [CommonModule, HlmCheckboxImports, NgxDatatableModule, NoopAnimationsModule],
    }).compileComponents();
  }));

  beforeEach(async () => {
    fixture = TestBed.createComponent(EntityTableCellIdTestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('uses defined column and row context for every generated ID', () => {
    const ids = Array.from(
      fixture.nativeElement.querySelectorAll('.entity-table-value-cell, hlm-checkbox'),
      (element: HTMLElement) => element.id,
    );

    expect(ids).toEqual([
      'root_UID_0_0',
      'root_Enabled_1_0',
      'root_Enabled-checkbox_1_0',
      'operator_UID_0_1',
      'operator_Enabled_1_1',
      'operator_Enabled-checkbox_1_1',
    ]);
    expect(ids.some((id) => id.includes('undefined') || id.includes('null'))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps IDs stable after a later change-detection pass and renders UID 0', () => {
    const idsBefore = Array.from(
      fixture.nativeElement.querySelectorAll('.entity-table-value-cell, hlm-checkbox'),
      (element: HTMLElement) => element.id,
    );

    fixture.detectChanges();

    const idsAfter = Array.from(
      fixture.nativeElement.querySelectorAll('.entity-table-value-cell, hlm-checkbox'),
      (element: HTMLElement) => element.id,
    );
    const uidZeroCell: HTMLElement = fixture.nativeElement.querySelector('#root_UID_0_0');

    expect(idsAfter).toEqual(idsBefore);
    expect(uidZeroCell.textContent.trim()).toBe('0');
  });
});
