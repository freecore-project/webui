import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

@Component({
  standalone: false,
  selector: 'entity-row-details-layout-test-host',
  template: `
    <section class="entity-row-details-layout entity-row-details-summary-layout summary-ltr">
      <div class="summary-first">First</div>
      <div class="summary-last">Last</div>
    </section>
    <hlm-separator class="details-separator" />
    <section class="entity-row-details-layout entity-row-details-actions-layout actions-ltr">
      <button class="entity-row-details-action-layout action-first" hlmBtn variant="ghost" type="button"><mat-icon>edit</mat-icon><span>First</span></button>
      <button class="entity-row-details-action-layout action-last" hlmBtn variant="ghost" type="button">Last</button>
    </section>
    <section dir="rtl" class="entity-row-details-layout entity-row-details-summary-layout summary-rtl">
      <div class="summary-rtl-first">First</div>
      <div class="summary-rtl-last">Last</div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-row-details.component.css'],
})
class EntityRowDetailsLayoutTestHostComponent {}

describe('entity row-details strip layout', () => {
  let fixture: ComponentFixture<EntityRowDetailsLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityRowDetailsLayoutTestHostComponent],
      imports: [MatButtonModule, MatIconModule, HlmButtonImports, HlmSeparatorImports],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EntityRowDetailsLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('preserves both start-centered row contracts', () => {
    const rows = fixture.nativeElement.querySelectorAll('.entity-row-details-layout');

    expect(rows.length).toBe(3);
    rows.forEach((row: Element) => {
      const styles = getComputedStyle(row);

      expect(styles.display).toBe('flex');
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flexDirection).toBe('row');
      expect(styles.flexWrap).toBe('nowrap');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('flex-start');
    });
  });

  it('preserves both LTR gaps and final-child resets', () => {
    const summaryFirst = getComputedStyle(fixture.nativeElement.querySelector('.summary-first'));
    const summaryLast = getComputedStyle(fixture.nativeElement.querySelector('.summary-last'));
    const actionFirst = getComputedStyle(fixture.nativeElement.querySelector('.action-first'));
    const actionLast = getComputedStyle(fixture.nativeElement.querySelector('.action-last'));

    expect(summaryFirst.marginLeft).toBe('0px');
    expect(summaryFirst.marginRight).toBe('48px');
    expect(summaryLast.marginLeft).toBe('0px');
    expect(summaryLast.marginRight).toBe('0px');
    expect(actionFirst.marginLeft).toBe('0px');
    expect(actionFirst.marginRight).toBe('8px');
    expect(actionLast.marginLeft).toBe('0px');
    expect(actionLast.marginRight).toBe('0px');
  });

  it('preserves direction-aware summary spacing under RTL', () => {
    const first = getComputedStyle(fixture.nativeElement.querySelector('.summary-rtl-first'));
    const last = getComputedStyle(fixture.nativeElement.querySelector('.summary-rtl-last'));

    expect(first.marginLeft).toBe('48px');
    expect(first.marginRight).toBe('0px');
    expect(last.marginLeft).toBe('0px');
    expect(last.marginRight).toBe('0px');
  });

  it('preserves the centered action-button contract on the ghost tier (the internal development record)', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.action-first');
    const styles = getComputedStyle(button);

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.alignItems).toBe('center');
    expect(styles.justifyContent).toBe('center');
    expect(button.getBoundingClientRect().height).toBe(32);
    expect(styles.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(button.querySelector('mat-icon').getBoundingClientRect().width).toBe(16);
    const sep = fixture.nativeElement.querySelector('hlm-separator.details-separator');
    expect(getComputedStyle(sep).display).toBe('block');
    expect(sep.getBoundingClientRect().height).toBe(1);
  });
});
