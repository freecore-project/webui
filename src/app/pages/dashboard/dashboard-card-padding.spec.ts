import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

// the internal development record: inline padding on the card content must stay inside the widget width.
// the internal development record: the frame is a plain .fc-card now (no MDC padding of its own), so the host
// supplies the 16px inline padding and the global `.widget .fc-card-content` rule keeps the contract.
@Component({
  standalone: false,
  selector: 'dashboard-card-padding-test-host',
  template: `
    <div class="widget" style="width: 320px !important; margin: 0; left: 0">
      <div class="fc-card">
        <div class="fc-card-content issue-277-content">Dashboard content</div>
      </div>
    </div>
  `,
  styles: ['.issue-277-content { width: 100%; padding: 0 16px; }'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
class DashboardCardPaddingTestHostComponent {}

describe('dashboard card content padding', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardCardPaddingTestHostComponent],
    }).compileComponents();
  }));

  it('includes the inline padding inside the widget width', () => {
    const fixture = TestBed.createComponent(DashboardCardPaddingTestHostComponent);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.fc-card') as HTMLElement;
    const content = fixture.nativeElement.querySelector('.fc-card-content') as HTMLElement;
    const contentStyles = getComputedStyle(content);
    const cardBounds = card.getBoundingClientRect();
    const contentBounds = content.getBoundingClientRect();

    expect(contentStyles.boxSizing).toBe('border-box');
    expect(contentStyles.paddingLeft).toBe('16px');
    expect(contentStyles.paddingRight).toBe('16px');
    expect(contentBounds.width).toBeCloseTo(cardBounds.width, 1);
    expect(contentBounds.right).toBeLessThanOrEqual(cardBounds.right);
  });
});
