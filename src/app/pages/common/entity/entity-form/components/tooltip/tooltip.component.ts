import {
  Component, Input, ViewChild, ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Component({
  standalone: false,
  selector: 'tooltip',
  templateUrl: 'tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['tooltip.component.css'],
})
export class TooltipComponent {
  @Input('message') message: string;
  @Input('header') header?: string;
  @Input('position') positionOverride?: string;
  @ViewChild('tooltip', { static: true }) private tooltip: ElementRef;
  @ViewChild(CdkDrag, { static: true }) dragTarget: CdkDrag;
  @ViewChild('tooltiptext', { static: true }) private tooltiptext: ElementRef;

  isShowTooltip: boolean;
  isWizard = false;

  positionString = 'Default';
  /** The panel (tooltip.component.css): 400px wide, at most 90vw, drawn 42px from the glyph. */
  static readonly PANEL_WIDTH = 400;
  static readonly PANEL_OFFSET = 42;
  /** Kept free between the panel and the edge of the area it may paint in. */
  static readonly EDGE_MARGIN = 8;
  /** Narrower than this the panel is unreadable beside the glyph: it opens under it instead. */
  static readonly MIN_WIDTH = 200;
  /** The caret's default top (freecore-ui.css), moved with the panel when the panel is moved up. */
  static readonly CARET_TOP = 27;
  isMoved = false;

  constructor(public translate: TranslateService) {}

  // the internal development record: the side is chosen by measuring, not by finding a card. Through #388 the
  // panel opened right only inside a mat-card/.form-card with room in the viewport, and left
  // otherwise -- unchecked: every page-law page (.fc-page, #416/#417/#419) lost its card and opened
  // left under the sidebar, a left-column field below ~1100px went under it too, and dialogs were
  // forced right off the screen. Now: right if the panel fits there, else left if it fits there,
  // else the wider side with the panel narrowed to it, else under the glyph; then up if it runs
  // past the bottom. The area is the content hold (it clips at the sidebar), or the viewport for
  // the overlays (dialogs, the scheduler popup).
  showTooltip($event) {
    this.isShowTooltip = $event;
    this.findParent();
    const panel: HTMLElement = this.tooltiptext.nativeElement;
    ['max-width', 'left', 'right', 'top', '--fc-tt-caret-top'].forEach((prop) => panel.style.removeProperty(prop));
    if (!$event) {
      return;
    }
    if (this.positionOverride) {
      this.positionString = this.positionOverride;
      return;
    }

    const glyph = this.tooltip.nativeElement.getBoundingClientRect();
    const area = this.paintArea();
    const width = Math.min(TooltipComponent.PANEL_WIDTH, window.innerWidth * 0.9);
    const span = width + TooltipComponent.PANEL_OFFSET + TooltipComponent.EDGE_MARGIN;
    const roomRight = area.right - glyph.left; // the panel starts 42px right of the glyph's left edge
    const roomLeft = glyph.right - area.left; // and ends 42px left of its right edge
    const narrowed = Math.max(roomRight, roomLeft) - TooltipComponent.PANEL_OFFSET - TooltipComponent.EDGE_MARGIN;

    if (roomRight >= span) {
      this.positionString = 'right';
    } else if (roomLeft >= span) {
      this.positionString = 'left';
    } else if (narrowed >= TooltipComponent.MIN_WIDTH) {
      this.positionString = roomRight >= roomLeft ? 'right' : 'left';
      panel.style.setProperty('max-width', `${Math.floor(narrowed)}px`, 'important');
    } else {
      // Phone width: the whole area's width, under the glyph (left is relative to the glyph).
      this.positionString = 'under';
      const full = Math.min(TooltipComponent.PANEL_WIDTH, area.right - area.left - 2 * TooltipComponent.EDGE_MARGIN);
      panel.style.setProperty('max-width', `${Math.floor(full)}px`, 'important');
      panel.style.setProperty('left', `${Math.floor(area.left + TooltipComponent.EDGE_MARGIN - glyph.left)}px`, 'important');
    }
    // The side class lands with this change detection; measure the drawn panel on the next frame.
    requestAnimationFrame(() => this.keepInsideVertically(area));
  }

  /** Where the panel can be seen: the content hold clips it (overflow-x: hidden, its left edge is
   *  the sidebar's right edge); dialogs and the scheduler popup live in the CDK overlay, where only
   *  the viewport does. */
  paintArea(): { left: number; right: number; top: number; bottom: number } {
    const el: HTMLElement = this.tooltip.nativeElement;
    const viewport = { left: 0, right: document.documentElement.clientWidth, top: 0, bottom: window.innerHeight };
    const hold = el.closest('.cdk-overlay-container') ? null : el.closest('.rightside-content-hold') as HTMLElement;
    if (!hold) {
      return viewport;
    }
    const r = hold.getBoundingClientRect();
    return {
      left: Math.max(r.left, 0),
      right: Math.min(r.left + hold.clientWidth, viewport.right),
      top: Math.max(r.top, 0),
      bottom: Math.min(r.top + hold.clientHeight, viewport.bottom),
    };
  }

  /** Move the open panel up when it runs past the bottom of the area, never above its top; the
   *  caret moves down by the same amount so it still points at the glyph. */
  keepInsideVertically(area: { top: number; bottom: number }) {
    const panel: HTMLElement = this.tooltiptext.nativeElement;
    if (!this.isShowTooltip || !panel.classList.contains('show')) {
      return;
    }
    const r = panel.getBoundingClientRect();
    const over = r.bottom - (area.bottom - TooltipComponent.EDGE_MARGIN);
    if (over <= 0) {
      return;
    }
    const shift = Math.floor(Math.min(over, r.top - (area.top + TooltipComponent.EDGE_MARGIN)));
    if (shift <= 0) {
      return;
    }
    const top = parseFloat(getComputedStyle(panel).top) || 0;
    panel.style.setProperty('top', `${top - shift}px`, 'important');
    panel.style.setProperty('--fc-tt-caret-top', `${TooltipComponent.CARET_TOP + shift}px`);
  }

  toggleVis() {
    /* Resets 'isShowTooltip' for any tooltip closed by removing the class (below)
     so it will reopen on first click */
    const el = this.tooltiptext.nativeElement.classList;
    this.isShowTooltip = false;
    for (let i = 0; i < el.length; i++) {
      if (el[i] === 'show') {
        // Or, if tooltip is already open, close it
        this.isShowTooltip = true;
      }
    }
    // Clears any open tooltip from screen (by the panel itself: text-limiter-tooltip uses
    // .tooltip-container too, with another first child)
    document.querySelectorAll('.tooltip-container > .tooltiptext.show').forEach((open) => open.classList.remove('show'));

    if (!this.isShowTooltip) {
      this.isShowTooltip = true;
      el.add('show');
      this.dragTarget.reset();
      this.isMoved = false;
      this.showTooltip(true);
    } else {
      this.showTooltip(false);
      this.isShowTooltip = false;
    }
  }

  findParent() {
    // the internal development record: the form container is found by class, not tag -- entity-form's wrapper
    // is a div.form-card now (the wizard, dialogs and the other hosts keep their mat-card). The
    // old five-deep offsetParent ladder looked for the tag only and would have read every
    // entity-form popover as "outside a form", opening it to the left regardless of room.
    // the internal development record: the container no longer decides the side (showTooltip measures), and a
    // dialog is no longer forced right -- it gets the same fit test against the viewport.
    // the internal development record: the scheduler's custom-cron popup is its own container (an overlay).
    const el: HTMLElement = this.tooltip.nativeElement;
    const card = el.closest('mat-dialog-container, mat-card, .form-card, .fc-settings-form, .fc-page, .advanced-date-picker');
    this.isWizard = !!el.closest('entity-wizard');
    return card;
  }

  hideTail(evt?) {
    this.isMoved = true;
  }
}
