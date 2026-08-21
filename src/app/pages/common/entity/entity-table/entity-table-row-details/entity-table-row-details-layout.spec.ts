import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

@Component({
  standalone: false,
  selector: 'entity-table-row-details-layout-test-host',
  template: `
    <section [dir]="direction">
      <div class="entity-table-row-detail-layout">
        <h4>Label</h4>
        <div class="entity-table-row-detail-value-layout">
          @if (widget) {
            <mat-icon [hlmDropdownMenuTrigger]="menu" role="button" tabindex="0">schedule</mat-icon>
            <ng-template #menu><hlm-dropdown-menu><button hlmDropdownMenuItem type="button">Menu</button></hlm-dropdown-menu></ng-template>
            <p>Value</p>
          } @else {
            <p>Value</p>
          }
        </div>
      </div>
      <hlm-separator class="details-separator" />
      <div class="entity-table-row-actions-layout">
        @for (action of actions; track action) {
          @if (action.visible) {
            <button hlmBtn variant="ghost" type="button" class="row-action">
              <div class="entity-table-row-action-layout">
                <mat-icon>edit</mat-icon><p>{{ action.name }}</p>
              </div>
            </button>
          }
        }
      </div>
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

describe('entity-table row-details layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityTableRowDetailsLayoutTestHostComponent],
      imports: [CommonModule, MatButtonModule, MatIconModule, HlmButtonImports, HlmDropdownMenuImports, HlmSeparatorImports],
    }).compileComponents();
  }));

  it('preserves all four single-row alignment contracts', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const startSelectors = [
      '.entity-table-row-detail-layout',
      '.entity-table-row-detail-value-layout',
      '.entity-table-row-actions-layout',
    ];

    startSelectors.forEach((selector) => {
      const styles = getComputedStyle(root.querySelector(selector));
      expect(styles.display).withContext(selector).toBe('flex');
      expect(styles.boxSizing).withContext(selector).toBe('border-box');
      expect(styles.flexDirection).withContext(selector).toBe('row');
      expect(styles.flexWrap).withContext(selector).toBe('nowrap');
      expect(styles.justifyContent).withContext(selector).toBe('flex-start');
      expect(styles.alignItems).withContext(selector).toBe('center');
      expect(styles.alignContent).withContext(selector).toBe('center');
    });

    const actionStyles = getComputedStyle(root.querySelector('.entity-table-row-action-layout'));
    expect(actionStyles.display).toBe('flex');
    expect(actionStyles.boxSizing).toBe('border-box');
    expect(actionStyles.flexDirection).toBe('row');
    expect(actionStyles.flexWrap).toBe('nowrap');
    expect(actionStyles.justifyContent).toBe('center');
    expect(actionStyles.alignItems).toBe('center');
    expect(actionStyles.alignContent).toBe('center');
  });

  it('preserves the detail label/value gap', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.entity-table-row-detail-layout');
    expect(getComputedStyle(row.querySelector('h4')).marginRight).toBe('16px');
    expect(getComputedStyle(row.querySelector('.entity-table-row-detail-value-layout')).marginRight).toBe('0px');
  });

  // the internal development record: the widget menu is an ng-template on the helm dropdown-menu -- no hidden host.
  it('preserves widget/value gaps with no hidden menu host in the row', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const row = root.querySelector('.entity-table-row-detail-value-layout');
    expect(getComputedStyle(row.querySelector('mat-icon')).marginRight).toBe('4px');
    expect(row.querySelector('mat-menu, hlm-dropdown-menu')).toBeNull();
    expect(row.children.length).toBe(2);
    expect(getComputedStyle(row.querySelector('p')).marginRight).toBe('0px');

    fixture.componentInstance.widget = false;
    fixture.detectChanges();

    expect(row.querySelector('mat-icon')).toBeNull();
    expect(row.children.length).toBe(1);
    expect(getComputedStyle(row.querySelector('p')).marginRight).toBe('0px');
  });

  it('preserves visible action and icon/label gaps', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();

    const actionRow = fixture.nativeElement.querySelector('.entity-table-row-actions-layout');
    const buttons = actionRow.querySelectorAll(':scope > button');
    expect(buttons.length).toBe(2);
    expect(getComputedStyle(buttons[0]).marginRight).toBe('8px');
    expect(getComputedStyle(buttons[1]).marginRight).toBe('0px');
    // the internal development record: ghost buttons on the 32px line, the separator a 1px block line
    expect(buttons[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(buttons[0]).paddingLeft).toBe('12px');
    expect(getComputedStyle(buttons[0]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(buttons[0].querySelector('mat-icon').getBoundingClientRect().width).toBe(16);
    const sep = fixture.nativeElement.querySelector('hlm-separator.details-separator');
    expect(getComputedStyle(sep).display).toBe('block');
    expect(sep.getBoundingClientRect().height).toBe(1);

    const content = buttons[0].querySelector('.entity-table-row-action-layout');
    expect(getComputedStyle(content.querySelector('mat-icon')).marginRight).toBe('8px');
    expect(getComputedStyle(content.querySelector('p')).marginRight).toBe('0px');
  });

  it('moves every gap to the logical end in RTL', () => {
    const fixture = TestBed.createComponent(EntityTableRowDetailsLayoutTestHostComponent);
    fixture.componentInstance.direction = 'rtl';
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const label = getComputedStyle(root.querySelector('.entity-table-row-detail-layout > h4'));
    const widget = getComputedStyle(root.querySelector('.entity-table-row-detail-value-layout > mat-icon'));
    const action = getComputedStyle(root.querySelector('.entity-table-row-actions-layout > button'));
    const icon = getComputedStyle(root.querySelector('.entity-table-row-action-layout > mat-icon'));

    [
      { styles: label, gap: '16px' },
      { styles: widget, gap: '4px' },
      { styles: action, gap: '8px' },
      { styles: icon, gap: '8px' },
    ].forEach(({ styles, gap }) => {
      expect(styles.marginLeft).toBe(gap);
      expect(styles.marginRight).toBe('0px');
    });
  });
});
