import { Directive, ElementRef, forwardRef } from '@angular/core';
import { CdkVirtualScrollable, VIRTUAL_SCROLLABLE } from '@angular/cdk/scrolling';

/** Reporting virtualizes against the ordinary shell scroller, without restyling other routes. */
@Directive({
  selector: '[reportsPageScroll]',
  standalone: true,
  providers: [{ provide: VIRTUAL_SCROLLABLE, useExisting: forwardRef(() => ReportsPageScrollDirective) }],
})
export class ReportsPageScrollDirective extends CdkVirtualScrollable {
  private previousOverflowAnchor: string;
  private previousOverflowAnchorPriority: string;

  override ngOnInit(): void {
    const shell = this.elementRef.nativeElement.closest<HTMLElement>('.rightside-content-hold');
    if (!shell) { throw new Error('Reporting requires the page scroll container.'); }
    // Both are public protected extension points in CdkScrollable: measurement
    // and the event listener must refer to the same external element before CDK attaches.
    this.elementRef = new ElementRef(shell);
    this._scrollElement = shell;
    this.previousOverflowAnchor = shell.style.getPropertyValue('overflow-anchor');
    this.previousOverflowAnchorPriority = shell.style.getPropertyPriority('overflow-anchor');
    // CDK's standard external adapter also disables native anchoring. Its broad
    // overflow/containment class is deliberately not applied to the shared shell.
    shell.style.setProperty('overflow-anchor', 'none', 'important');
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.previousOverflowAnchor !== undefined) {
      const style = this.elementRef.nativeElement.style;
      if (this.previousOverflowAnchor) {
        style.setProperty('overflow-anchor', this.previousOverflowAnchor, this.previousOverflowAnchorPriority);
      } else {
        style.removeProperty('overflow-anchor');
      }
    }
  }

  override measureBoundingClientRectWithScrollOffset(from: 'left' | 'top' | 'right' | 'bottom'): number {
    return this.elementRef.nativeElement.getBoundingClientRect()[from] - this.measureScrollOffset(from);
  }
}
