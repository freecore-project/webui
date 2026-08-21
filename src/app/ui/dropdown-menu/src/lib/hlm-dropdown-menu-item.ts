import { type BooleanInput } from '@angular/cdk/coercion';
import { hasModifierKey, SPACE } from '@angular/cdk/keycodes';
import { CdkMenuItem } from '@angular/cdk/menu';
import { booleanAttribute, Directive, HOST_TAG_NAME, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmDropdownMenuFocusOnHover } from './hlm-dropdown-menu-focus-on-hover';

/** @internal. Use HlmDropdownMenuItem instead.
 * the internal development record: the plain item takes `keepOpen` as the checkbox item does, so a picker's
 * Select All / Reset rows can act without closing it. A row that disables itself on its own
 * trigger must not keep open: focus would be stranded on a disabled row (or dropped to body,
 * which closes the menu without refocusing the trigger).
 * the internal development record: Space on an anchor row clicks it. CDK dispatches no native click for Space
 * on an `A` (only Enter), so the key fell through to `trigger()` and merely dismissed the menu;
 * a `(keydown.space)` template listener would not do -- a separate DOM listener that the CDK
 * `(keydown)` handler's view teardown removes before it runs. */
@Directive({
  selector: '[hlmDropdownMenuItemCdk]',
  providers: [{ provide: CdkMenuItem, useExisting: HlmDropdownMenuItemCdk }],
})
export class HlmDropdownMenuItemCdk extends CdkMenuItem {
  readonly keepOpen = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  override trigger(options?: { keepOpen: boolean }) {
    super.trigger({ ...options, keepOpen: this.keepOpen() || !!options?.keepOpen });
  }

  override _onKeydown(event: KeyboardEvent) {
    if (event.keyCode === SPACE && !hasModifierKey(event) && this._elementRef.nativeElement.nodeName === 'A' && !this.disabled) {
      event.preventDefault();
      this._elementRef.nativeElement.click();
      return;
    }
    super._onKeydown(event);
  }
}

// the internal development record: #354 rows -- 32px, 12px sides, 13px fg1, the hover surface, disabled .4,
// a leading 16px fg2 glyph (the Material icon's 24px box shrunk with it), the destructive tier in
// red. The focus surface is `focus-visible`, not `focus`: CDK focuses the first row on a mouse open
// and the mat-menu never pre-highlighted a row; the keyboard walk still paints where it lands.
@Directive({
  selector: '[hlmDropdownMenuItem],hlm-dropdown-menu-item',
  hostDirectives: [
    {
      directive: HlmDropdownMenuItemCdk,
      inputs: ['cdkMenuItemDisabled: disabled', 'keepOpen'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
    HlmDropdownMenuFocusOnHover,
  ],
  host: {
    'data-slot': 'dropdown-menu-item',
    '[attr.disabled]': '_isButton && disabled() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-inset]': 'inset() ? "" : null',
  },
})
export class HlmDropdownMenuItem {
  protected readonly _isButton = inject(HOST_TAG_NAME) === 'button';

  readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  readonly variant = input<'default' | 'destructive'>('default');

  readonly inset = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  constructor() {
    classes(
      () =>
        'group/dropdown-menu-item relative flex h-8 w-full cursor-default items-center gap-2 rounded-[4px] px-3 text-sm text-foreground outline-hidden select-none hover:bg-accent focus-visible:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-40 data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:focus-visible:bg-destructive/10 data-inset:ps-8 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0 [&_ng-icon:not([class*=\'text-\'])]:text-[length:--spacing(4)] [&_.material-icons]:size-4 [&_.material-icons]:text-[16px] [&_.material-icons]:leading-4 [&_.material-icons]:text-muted-foreground',
    );
  }
}
