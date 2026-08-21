import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the standalone band -- actions first as text on the ghost tier, then the
// facts as a grid of label-over-value cells, as many across as 220px columns fit.
@Component({
  standalone: false,
  selector: 'entity-row-details-layout-test-host',
  template: `
    <section class="entity-row-details-layout entity-row-details-actions-layout actions-ltr">
      <button class="entity-row-details-action-layout action-first" hlmBtn variant="ghost" type="button"><span>First</span></button>
      <button class="entity-row-details-action-layout action-last button-delete" hlmBtn variant="ghost" type="button"><span>Delete</span></button>
    </section>
    <section class="entity-row-details-layout entity-row-details-summary-layout summary-ltr" style="width: 700px">
      <div class="summary-first"><p>First</p><h4>one</h4></div>
      <div class="summary-second"><p>Second</p><h4>two</h4></div>
      <div class="summary-third"><p>Third</p><h4>three</h4></div>
      <div class="summary-fourth"><p>Fourth</p><h4>a value long enough to wrap inside its own cell instead of pushing the band wider</h4></div>
    </section>
    <section dir="rtl" class="entity-row-details-layout entity-row-details-actions-layout actions-rtl">
      <button class="entity-row-details-action-layout action-rtl-first" hlmBtn variant="ghost" type="button"><span>First</span></button>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-row-details.component.css'],
})
class EntityRowDetailsLayoutTestHostComponent {}

describe('entity row-details band layout (the internal development record)', () => {
  let fixture: ComponentFixture<EntityRowDetailsLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityRowDetailsLayoutTestHostComponent],
      imports: [MatButtonModule, HlmButtonImports],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EntityRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('lays the actions out as a wrapping row of text buttons on the ghost tier, starting on the band edge', () => {
    const row = getComputedStyle(fixture.nativeElement.querySelector('.actions-ltr'));
    expect(row.display).toBe('flex');
    expect(row.flexWrap).toBe('wrap');
    expect(row.justifyContent).toBe('flex-start');
    expect(row.columnGap).toBe('12px');
    expect(row.rowGap).toBe('4px');

    const first: HTMLButtonElement = fixture.nativeElement.querySelector('.action-first');
    const styles = getComputedStyle(first);
    expect(first.getBoundingClientRect().height).toBe(32);
    expect(styles.paddingLeft).toBe('12px');
    expect(styles.marginLeft).toBe('-12px');
    expect(styles.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(styles.fontSize).toBe('13px');
    expect(first.querySelector('mat-icon')).toBeNull();
    expect(getComputedStyle(fixture.nativeElement.querySelector('.action-last')).marginLeft).toBe('0px');
    // the label reads in fg1, a destructive one in red
    fixture.nativeElement.style.setProperty('--fg1', 'rgb(220, 227, 230)');
    expect(getComputedStyle(first.querySelector('span')).color).toBe('rgb(220, 227, 230)');
    // the strip is boxed by a hairline under it
    expect(row.borderBottomWidth).toBe('1px');
    expect(row.borderBottomStyle).toBe('solid');
    expect(row.marginBottom).toBe('16px');
    expect(row.paddingBottom).toBe('8px');
  });

  it('starts the actions on the band edge under RTL too', () => {
    const first = getComputedStyle(fixture.nativeElement.querySelector('.action-rtl-first'));
    expect(first.marginRight).toBe('-12px');
    expect(first.marginLeft).toBe('0px');
  });

  it('lays the facts out as a grid: label over value, two across at 700px, wrapping values', () => {
    const grid = getComputedStyle(fixture.nativeElement.querySelector('.summary-ltr'));
    expect(grid.display).toBe('grid');
    expect(grid.columnGap).toBe('24px');
    expect(grid.rowGap).toBe('14px');
    expect(grid.gridTemplateColumns.split(' ').length).toBe(2);

    const cells = ['first', 'second', 'third', 'fourth'].map((name) => fixture.nativeElement.querySelector(`.summary-${name}`).getBoundingClientRect());
    expect(cells[1].top).toBe(cells[0].top);
    expect(cells[1].left).toBeGreaterThan(cells[0].right);
    expect(cells[2].left).toBe(cells[0].left);
    expect(cells[2].top).toBeGreaterThan(cells[0].bottom);
    expect(cells[3].right).toBeLessThanOrEqual(fixture.nativeElement.querySelector('.summary-ltr').getBoundingClientRect().right + 1);

    const label = getComputedStyle(fixture.nativeElement.querySelector('.summary-first p'));
    const value = getComputedStyle(fixture.nativeElement.querySelector('.summary-first h4'));
    expect(label.textTransform).toBe('uppercase');
    expect(label.fontSize).toBe('12px');
    expect(value.fontSize).toBe('14px');
    expect(value.lineHeight).toBe('20px');
    expect(value.overflowWrap).toBe('anywhere');
  });
});
