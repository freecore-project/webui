import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// the internal development record: the shared sheet, loaded unscoped as production loads it.
@Component({
  standalone: false,
  selector: 'review-notice-host',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/freecore-ui.css'],
  template: `
    <div class="fc-ui" style="width: 1440px">
      <section class="review-panel" style="width: 1160px"><div class="fc-page-notice fc-page-notice--warn">x</div></section>
      <div class="page-notice fc-page-notice">y</div>
    </div>`,
})
class ReviewNoticeHostComponent {}

describe('Applications: the review panel notice width (the internal development record)', () => {
  it('spans the review panel, while a page notice keeps the 1120px measure', () => {
    TestBed.configureTestingModule({ declarations: [ReviewNoticeHostComponent] });
    const fixture = TestBed.createComponent(ReviewNoticeHostComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const inPanel = fixture.nativeElement.querySelector('.review-panel .fc-page-notice') as HTMLElement;
    const onPage = fixture.nativeElement.querySelector('.page-notice') as HTMLElement;
    expect(getComputedStyle(inPanel).maxWidth).toBe('none');
    expect(inPanel.getBoundingClientRect().width).toBeCloseTo(1160, 0);
    expect(getComputedStyle(onPage).maxWidth).toBe('1120px');
    fixture.nativeElement.remove();
  });
});
