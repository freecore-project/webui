import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the standalone band -- actions first on the ghost tier, then the
// facts as a grid of label-over-value cells, as many across as 220px columns fit.
// the internal development record (forum t/92): the facts are one list again, a fact per line, labels in their own column.
// the internal development record: 13.3's 16px glyph before the label; an action without an icon stays text-only.
@Component({
  standalone: false,
  selector: 'entity-row-details-layout-test-host',
  template: `
    <section class="entity-row-details-layout entity-row-details-actions-layout actions-ltr">
      <button class="entity-row-details-action-layout action-first" hlmBtn variant="ghost" type="button"><mat-icon class="entity-row-details-action-glyph" aria-hidden="true">edit</mat-icon><span>First</span></button>
      <button class="entity-row-details-action-layout action-last button-delete" hlmBtn variant="ghost" type="button"><mat-icon class="entity-row-details-action-glyph" aria-hidden="true">delete</mat-icon><span>Delete</span></button>
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
      imports: [MatButtonModule, MatIconModule, HlmButtonImports],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EntityRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('lays the actions out as a wrapping row of glyph + text buttons on the ghost tier, starting on the band edge', () => {
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
    expect(getComputedStyle(fixture.nativeElement.querySelector('.action-last')).marginLeft).toBe('0px');
    // the internal development record: the glyph first, 16px, 6px before the label; the rtl button has no icon and no glyph
    const glyph = first.querySelector('mat-icon');
    expect(first.firstElementChild).toBe(glyph);
    expect(glyph.getBoundingClientRect().width).toBe(16);
    expect(glyph.getBoundingClientRect().height).toBe(16);
    expect(styles.columnGap).toBe('6px');
    expect(fixture.nativeElement.querySelector('.action-rtl-first mat-icon')).toBeNull();
    // the label and its glyph read in fg1, a destructive one in red
    fixture.nativeElement.style.setProperty('--fg1', 'rgb(220, 227, 230)');
    expect(getComputedStyle(first.querySelector('span')).color).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(glyph).color).toBe('rgb(220, 227, 230)');
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

  // the internal development record (forum t/92): one fact per line, labels in their own column, every value at the same x.
  it('lays the facts out as one list: a fact per line, labels in a column, values starting at the same x, long values wrapping', () => {
    const band = fixture.nativeElement.querySelector('.summary-ltr');
    const list = getComputedStyle(band);
    expect(list.display).toBe('grid');
    expect(list.columnGap).toBe('28px');
    expect(list.rowGap).toBe('10px');
    expect(list.gridTemplateColumns.split(' ').length).toBe(2);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.summary-first')).display).toBe('contents');

    const names = ['first', 'second', 'third', 'fourth'];
    const labels = names.map((name) => fixture.nativeElement.querySelector(`.summary-${name} p`).getBoundingClientRect());
    const values = names.map((name) => fixture.nativeElement.querySelector(`.summary-${name} h4`).getBoundingClientRect());
    for (let i = 0; i < names.length; i++) {
      expect(labels[i].left).toBe(labels[0].left);
      expect(values[i].left).toBe(values[0].left);
      expect(values[i].left).toBeGreaterThan(labels[i].right);
      expect(Math.abs(values[i].top - labels[i].top)).toBeLessThanOrEqual(2);
      if (i > 0) {
        expect(labels[i].top).toBeGreaterThanOrEqual(values[i - 1].bottom);
      }
    }
    // narrow the band: the long value wraps inside its own column instead of pushing the band wider
    band.style.width = '300px';
    const narrow = fixture.nativeElement.querySelector('.summary-fourth h4').getBoundingClientRect();
    expect(narrow.height).toBeGreaterThan(values[0].height);
    expect(narrow.right).toBeLessThanOrEqual(band.getBoundingClientRect().right + 1);
    band.style.width = '700px';
    expect(values[3].right).toBeLessThanOrEqual(band.getBoundingClientRect().right + 1);

    const label = getComputedStyle(fixture.nativeElement.querySelector('.summary-first p'));
    const value = getComputedStyle(fixture.nativeElement.querySelector('.summary-first h4'));
    expect(label.textTransform).toBe('none');
    expect(label.fontSize).toBe('13px');
    expect(value.fontSize).toBe('13px');
    expect(value.lineHeight).toBe('20px');
    expect(value.overflowWrap).toBe('anywhere');
  });
});
