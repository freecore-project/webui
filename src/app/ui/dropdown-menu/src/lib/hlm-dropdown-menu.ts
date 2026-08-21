import { type NumberInput } from '@angular/cdk/coercion';
import { type FocusKeyManager } from '@angular/cdk/a11y';
import { ESCAPE, hasModifierKey } from '@angular/cdk/keycodes';
import { CdkMenu, type CdkMenuItem, FocusNext } from '@angular/cdk/menu';
import { type AfterContentInit, DestroyRef, Directive, ElementRef, inject, input, numberAttribute, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { deriveMenuSideFromTransformOrigin, MENU_SIDE, type MenuSide } from '@spartan-ng/brain/core';
import { classes } from '@spartan-ng/helm/utils';

// the internal development record: the M1 menu -- the #354 panel (bg2, the --line hairline, 6px, 4px padding, no
// shadow), as the select's. Spartan's `.spartan-dropdown-menu-*` classes live in its global style
// file, which this app does not ship; the utilities are written into each copy. The padding is the
// arbitrary `p-[4px]`: the one-unit padding helper carries !important in fn-styles, so its name may
// not appear in this scanned file (#392). The panel is capped at the viewport (less 16px) so a tall
// picker scrolls inside itself: CDK's menu strategy has no flexible dimensions, so without the cap
// a panel taller than the viewport would be clipped.
@Directive({
  selector: '[hlmDropdownMenu],hlm-dropdown-menu',
  hostDirectives: [CdkMenu],
  host: {
    'data-slot': 'dropdown-menu',
    '[attr.data-state]': '_state()',
    '[attr.data-side]': '_side()',
    '[style.--side-offset]': 'sideOffset()',
  },
})
export class HlmDropdownMenu implements AfterContentInit {
  private readonly _host = inject(CdkMenu);
  private readonly _elementRef = inject(ElementRef<HTMLElement>);
  // The trigger provides its configured side; CDK parents this content's injector under the trigger's.
  private readonly _menuSide = inject(MENU_SIDE, { optional: true });

  protected readonly _state = signal('open');
  protected readonly _side = signal<MenuSide>(this._menuSide?.side() ?? 'bottom');

  readonly sideOffset = input<number, NumberInput>(1, { transform: numberAttribute });

  constructor() {
    classes(
      () =>
        'bg-popover text-popover-foreground border border-border rounded-lg shadow-none p-[4px] min-w-36 max-h-[calc(100vh-16px)] my-[--spacing(var(--side-offset))] overflow-x-hidden overflow-y-auto outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-100',
    );

    this.shieldEscape();
    this.setSideFromTransformOrigin();
    // this is a best effort, but does not seem to work currently
    // TODO: figure out a way for us to know the host is about to be closed. might not be possible with CDK
    this._host.closed.pipe(takeUntilDestroyed()).subscribe(() => this._state.set('closed'));
  }

  // Escape must close this menu and stop there: CDK's own keydown handler closes it but lets the
  // event travel on to the overlay dispatcher, where a dialog beneath would close with it. A host
  // listener cannot shield it -- CDK's handler destroys this view first and Angular drops the
  // later listeners with it -- so a native capture listener (first to run) does both.
  private shieldEscape(): void {
    const element = this._elementRef.nativeElement;
    const shield = (event: KeyboardEvent): void => {
      if ((event.key !== 'Escape' && event.keyCode !== ESCAPE) || hasModifierKey(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this._host.menuStack.close(this._host, { focusNextOnEmpty: FocusNext.currentItem, focusParentTrigger: true });
    };
    element.addEventListener('keydown', shield, true);
    inject(DestroyRef).onDestroy(() => element.removeEventListener('keydown', shield, true));
  }

  // The mat-menu skipped disabled rows when walking with the arrow keys; CDK's key manager keeps
  // them (`skipPredicate(() => false)`), and a disabled <button> row refuses focus, so every disabled
  // row would cost a dead keypress and a disabled FIRST row could never be stepped past. Host
  // directives run their hooks before this one, so the key manager exists here.
  ngAfterContentInit(): void {
    (this._host as unknown as { keyManager?: FocusKeyManager<CdkMenuItem> }).keyManager?.skipPredicate((item) => item.disabled);
  }

  private setSideFromTransformOrigin() {
    const side = this._menuSide?.side() ?? 'bottom';
    // CDK sets transform-origin on this element synchronously on attach; read it next tick and derive side
    setTimeout(() => {
      this._side.set(deriveMenuSideFromTransformOrigin(this._elementRef.nativeElement.style.transformOrigin, side));
    });
  }
}
