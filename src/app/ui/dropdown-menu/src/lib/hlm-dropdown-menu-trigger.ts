import { CdkMenuTrigger, MENU_STACK } from '@angular/cdk/menu';
import { computed, Directive, effect, forwardRef, HOST_TAG_NAME, inject, input } from '@angular/core';
import { createMenuPosition, MENU_SIDE, type MenuAlign, type MenuSide } from '@spartan-ng/brain/core';
import { injectHlmDropdownMenuConfig } from './hlm-dropdown-menu-token';

@Directive({
  selector: '[hlmDropdownMenuTrigger]',
  providers: [{ provide: MENU_SIDE, useExisting: forwardRef(() => HlmDropdownMenuTrigger) }],
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: ['cdkMenuTriggerFor: hlmDropdownMenuTrigger', 'cdkMenuTriggerData: hlmDropdownMenuTriggerData'],
      outputs: ['cdkMenuOpened: hlmDropdownMenuOpened', 'cdkMenuClosed: hlmDropdownMenuClosed'],
    },
  ],
  host: {
    'data-slot': 'dropdown-menu-trigger',
    '(keydown.escape)': '_onEscape($event)',
    '(keydown.space)': '_onSpace($event)',
  },
})
export class HlmDropdownMenuTrigger {
  private readonly _cdkTrigger = inject(CdkMenuTrigger, { host: true });
  private readonly _config = injectHlmDropdownMenuConfig();
  private readonly _isButton = inject(HOST_TAG_NAME) === 'button';
  // the stack the CDK trigger provides on this element; closing through it keeps CDK's bookkeeping
  private readonly _menuStack = inject(MENU_STACK);

  readonly align = input<MenuAlign>(this._config.align);
  readonly side = input<MenuSide>(this._config.side);

  private readonly _menuPosition = computed(() => createMenuPosition(this.align(), this.side()));

  constructor() {
    // CDK sets transform-origin on the menu content from the resolved position; the content reads it to
    // animate from the anchored corner and to derive its data-side. Cast tolerates @angular/cdk < 21.2
    // (we still support >=21.0), where the property is absent and the assignment is a harmless no-op.
    (this._cdkTrigger as { transformOriginSelector?: string }).transformOriginSelector = '[data-slot="dropdown-menu"]';

    effect(() => {
      this._cdkTrigger.menuPosition = this._menuPosition();
    });
  }

  // the internal development record: CDK handles Escape only on the menu element. Focus stays on the trigger
  // after a click when the menu has no focusable row (a widget panel, every row disabled), and
  // the mat-menu closed from anywhere; so the trigger closes its own menu too. The event stops
  // here for the same reason as on the panel (a dialog beneath must not close with it).
  protected _onEscape(event: Event): void {
    if (!this._cdkTrigger.isOpen()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this._menuStack.closeAll({ focusParentTrigger: true });
  }

  // Space toggles a non-button trigger (the widget glyph) through CDK without preventing the
  // page scroll a bare Space causes.
  protected _onSpace(event: Event): void {
    if (!this._isButton) {
      event.preventDefault();
    }
  }
}
