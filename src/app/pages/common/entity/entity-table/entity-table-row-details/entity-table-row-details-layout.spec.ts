import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';

// the internal development record: the band an entity-table row opens into -- the actions first as text on the
// ghost tier, then the hidden columns as a grid of facts (label over value).
@Component({
  standalone: false,
  selector: 'entity-table-row-details-layout-test-host',
  template: `
    <section [dir]="direction">
      <div class="wrapper__action-buttons entity-table-row-actions-layout">
        @for (action of actions; track action) {
          @if (action.visible) {
            <button hlmBtn variant="ghost" type="button" class="row-action" [class.row-action-destructive]="action.name === 'Delete'">
              <p class="entity-table-row-action-layout">{{ action.name }}</p>
            </button>
          }
        }
      </div>
      <section class="wrapper__details" style="width: 700px">
        <div class="entity-table-row-detail-layout detail-widget">
          <h4>Label</h4>
          <div class="entity-table-row-detail-value-layout">
            @if (widget) {
              <mat-icon class="widget-icon" [hlmDropdownMenuTrigger]="menu" role="button" tabindex="0">schedule</mat-icon>
              <ng-template #menu><hlm-dropdown-menu><button hlmDropdownMenuItem type="button">Menu</button></hlm-dropdown-menu></ng-template>
              <p>Value</p>
            } @else {
              <p>Value</p>
            }
          </div>
        </div>
        <div class="entity-table-row-detail-layout detail-second"><h4>Second</h4><div class="entity-table-row-detail-value-layout"><p>two</p></div></div>
        <div class="entity-table-row-detail-layout detail-third"><h4>Third</h4><div class="entity-table-row-detail-value-layout"><p>a value long enough to wrap inside its own cell instead of pushing the band wider than the table</p></div></div>
      </section>
    </section>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-table-row-details.component.scss'],
})
class EntityTableRowDetailsLayoutTestHostComponent {
  direction = 'ltr';
  widget = true;
  actions = [
    { name: 'Hidden', visible: false },
    { name: 'Edit', visible: true },
    { name: 'Delete', visible: true },
  ];
}

describe('entity-table row-details band layout (the internal development record)', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityTableRowDetailsLayoutTestHostComponent],
      imports: [CommonModule, MatButtonModule, MatIconModule, HlmButtonImports, HlmDropdownMenuImports],
    }).compileComponents();
  }));

  it('shows the visible actions as a wrapping row of text buttons on the ghost tier', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const actionRow = fixture.nativeElement.querySelector('.entity-table-row-actions-layout');
    const rowStyles = getComputedStyle(actionRow);
    expect(rowStyles.display).toBe('flex');
    expect(rowStyles.flexWrap).toBe('wrap');
    expect(rowStyles.justifyContent).toBe('flex-start');
    expect(rowStyles.columnGap).toBe('12px');

    const buttons = actionRow.querySelectorAll(':scope > button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(buttons[0]).paddingLeft).toBe('12px');
    expect(getComputedStyle(buttons[0]).marginLeft).toBe('-12px');
    expect(getComputedStyle(buttons[1]).marginLeft).toBe('0px');
    expect(getComputedStyle(buttons[0]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(buttons[0].querySelector('mat-icon')).toBeNull();
    expect(buttons[1].classList).toContain('row-action-destructive');
    const label = getComputedStyle(buttons[0].querySelector('.entity-table-row-action-layout'));
    expect(label.fontSize).toBe('13px');
    expect(label.fontWeight).toBe('500');
    // the strip is boxed by a hairline under it, and a destructive action's label reads in --red
    expect(rowStyles.borderBottomWidth).toBe('1px');
    expect(rowStyles.borderBottomStyle).toBe('solid');
    expect(rowStyles.marginBottom).toBe('16px');
    expect(rowStyles.paddingBottom).toBe('8px');
    fixture.nativeElement.style.setProperty('--red', 'rgb(227, 98, 90)');
    expect(getComputedStyle(buttons[1].querySelector('.entity-table-row-action-layout')).color).toBe('rgb(227, 98, 90)');
    expect(getComputedStyle(buttons[0].querySelector('.entity-table-row-action-layout')).color).not.toBe('rgb(227, 98, 90)');
  });

  it('starts the actions on the band edge under RTL too', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.componentInstance.direction = 'rtl';
    fixture.detectChanges();

    const first = getComputedStyle(fixture.nativeElement.querySelector('.entity-table-row-actions-layout > button'));
    expect(first.marginRight).toBe('-12px');
    expect(first.marginLeft).toBe('0px');
  });

  it('lays the facts out as a grid of label-over-value cells, two across at 700px, values wrapping', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('.wrapper__details');
    const gridStyles = getComputedStyle(grid);
    expect(gridStyles.display).toBe('grid');
    expect(gridStyles.columnGap).toBe('24px');
    expect(gridStyles.rowGap).toBe('14px');
    expect(gridStyles.gridTemplateColumns.split(' ').length).toBe(2);

    const [first, second, third] = ['widget', 'second', 'third'].map((name) => fixture.nativeElement.querySelector(`.detail-${name}`).getBoundingClientRect());
    expect(second.top).toBe(first.top);
    expect(second.left).toBeGreaterThan(first.right);
    expect(third.left).toBe(first.left);
    expect(third.top).toBeGreaterThan(first.bottom);
    expect(third.right).toBeLessThanOrEqual(grid.getBoundingClientRect().right + 1);

    const cell = fixture.nativeElement.querySelector('.detail-second');
    expect(getComputedStyle(cell).flexDirection).toBe('column');
    const label = getComputedStyle(cell.querySelector('h4'));
    expect(label.textTransform).toBe('uppercase');
    expect(label.fontSize).toBe('12px');
    expect(label.marginBottom).toBe('0px');
    const value = getComputedStyle(cell.querySelector('p'));
    expect(value.lineHeight).toBe('20px');
    expect(value.overflowWrap).toBe('anywhere');
  });

  it('keeps the widget trigger beside its value with no hidden menu host in the cell', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.detail-widget .entity-table-row-detail-value-layout');
    expect(getComputedStyle(row).display).toBe('flex');
    expect(getComputedStyle(row).columnGap).toBe('4px');
    expect(row.querySelector('mat-icon').getBoundingClientRect().width).toBe(20);
    expect(row.querySelector('mat-menu, hlm-dropdown-menu')).toBeNull();
    expect(row.children.length).toBe(2);

    fixture.componentInstance.widget = false;
    fixture.detectChanges();
    expect(row.querySelector('mat-icon')).toBeNull();
    expect(row.children.length).toBe(1);
  });
});
