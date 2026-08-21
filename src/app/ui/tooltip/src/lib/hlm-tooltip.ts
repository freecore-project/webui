import { Directive, ElementRef, inject } from '@angular/core';
import { BrnTooltip, provideBrnTooltipDefaultOptions } from '@spartan-ng/brain/tooltip';

// the internal development record: the tooltip surface is the #354 panel -- bg2, the --line hairline at 1px,
// 6px corners -- at 12px/1.5, left-aligned, inset 6px 10px, capped at 200px, no caret; it opens
// after 150 ms, closes after 100 ms, with the panel's fade. The brain writes these classes onto
// its own [role=tooltip] host, which it mounts straight into the CDK pane with no data-slot, so
// the two base-layer defaults the other copies inherit (the box model and the hairline's line
// style) are spelled out here. The caret span the brain always renders is switched off by class.
// Options are provided on this element as upstream does; BrnTooltip reads them through the
// element injector. No data-slot on the trigger: the base layer would re-box every Material
// control that carries a tooltip.
export const HLM_TOOLTIP_CONTENT_CLASSES =
  'bg-popover text-popover-foreground border border-solid border-border rounded-lg box-border px-[10px] py-[6px] text-xs leading-normal text-left max-w-[200px] wrap-anywhere z-50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-100';

@Directive({
  selector: '[hlmTooltip]',
  providers: [
    provideBrnTooltipDefaultOptions({
      showDelay: 150,
      hideDelay: 100,
      position: 'top',
      svgClasses: '',
      arrowClasses: () => 'hidden',
      tooltipContentClasses: HLM_TOOLTIP_CONTENT_CLASSES,
    }),
  ],
  hostDirectives: [
    {
      directive: BrnTooltip,
      inputs: ['brnTooltip: hlmTooltip', 'position', 'hideDelay', 'showDelay', 'tooltipDisabled'],
    },
  ],
  host: {
    '(focus)': '_onFocus()',
    '(blur)': '_reset()',
    '(pointerenter)': '_reset()',
  },
})
export class HlmTooltip {
  private readonly _brn = inject(BrnTooltip, { self: true });
  private readonly _element = inject<ElementRef<HTMLElement>>(ElementRef);

  // The brain opens on any focus, but a dialog or a menu hands focus back to its opener when it
  // closes -- a mouse-closed Task Manager would leave the opener's tooltip hanging with no pointer
  // to leave it. Keyboard-origin focus (:focus-visible) opens the tooltip; other focus does not.
  // The brain reads the disabled flag when the show delay elapses, so the order of the two focus
  // listeners does not matter; hover and blur restore the consumer's own setting.
  protected _onFocus(): void {
    if (!this._element.nativeElement.matches(':focus-visible')) {
      this._brn.mutableTooltipDisabled.set(true);
    }
  }

  protected _reset(): void {
    this._brn.mutableTooltipDisabled.set(this._brn.tooltipDisabled());
  }
}
