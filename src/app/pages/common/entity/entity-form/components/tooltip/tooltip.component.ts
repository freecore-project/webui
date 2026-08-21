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
  tooltipMsgStyle: any;
  isWizard = false;

  positionString = 'Default';
  /** The panel's 400px plus its 42px offset and a 16px margin to the viewport edge. */
  static readonly PANEL_SPAN = 458;
  isMoved = false;

  constructor(public translate: TranslateService) {}

  showTooltip($event) {
    this.isShowTooltip = $event;
    const formParent = this.findParent();
    const posRight = this.tooltip.nativeElement.offsetLeft + this.tooltip.nativeElement.offsetWidth;
    this.tooltipMsgStyle = {
      right: '32px',
      top: '-32px',
      'min-height': '64px',
    };

    const insideJob = formParent ? (formParent.clientWidth - posRight > 300) : null;
    // the internal development record: the glyph sits at the right end of a full-width field
    // (the internal development record), so room inside the form says nothing about the viewport --
    // the panel (400px, offset 42px) opens to the right only when it fits there.
    const glyphRight = this.tooltip.nativeElement.getBoundingClientRect().right;
    const fitsRight = window.innerWidth - glyphRight >= TooltipComponent.PANEL_SPAN;

    if (this.positionOverride) {
      this.positionString = this.positionOverride;
    } else {
      this.positionString = insideJob && fitsRight ? 'right' : 'left';
    }
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
    // Clears any open tooltip from screen
    const tooltips: any = document.getElementsByClassName('tooltip-container');
    for (let i = 0; i < tooltips.length; i++) {
      tooltips[i].firstChild.classList.remove('show');
    }

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
    let card;
    if (this.tooltip.nativeElement.closest('mat-dialog-container')) {
      card = this.tooltip.nativeElement.closest('mat-dialog-container');
      this.positionOverride = 'right';
    } else {
      // the internal development record: the scheduler's custom-cron popup is its own container (an overlay).
      card = this.tooltip.nativeElement.closest('mat-card, .form-card, .advanced-date-picker');
    }

    if (card && card.parentNode.nodeName.toLowerCase() == 'entity-wizard') {
      this.isWizard = true;
    }

    return card;
  }

  hideTail(evt?) {
    this.isMoved = true;
  }
}
