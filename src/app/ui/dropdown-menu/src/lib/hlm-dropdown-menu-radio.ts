import { type BooleanInput } from '@angular/cdk/coercion';
import { CdkMenuItem, CdkMenuItemRadio, CdkMenuItemSelectable } from '@angular/cdk/menu';
import { Directive, booleanAttribute, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmDropdownMenuFocusOnHover } from './hlm-dropdown-menu-focus-on-hover';

/** @internal. Use HlmDropdownMenuRadio instead. */
@Directive({
  selector: '[hlmDropdownMenuRadioCdk]',
  providers: [
    { provide: CdkMenuItemRadio, useExisting: HlmDropdownMenuRadioCdk },
    { provide: CdkMenuItemSelectable, useExisting: HlmDropdownMenuRadioCdk },
    { provide: CdkMenuItem, useExisting: CdkMenuItemSelectable },
  ],
})
export class HlmDropdownMenuRadioCdk extends CdkMenuItemRadio {
  readonly keepOpen = input<boolean, BooleanInput>(true, { transform: booleanAttribute });

  override trigger(options?: { keepOpen: boolean }) {
    super.trigger({ ...options, keepOpen: this.keepOpen() });
  }
}

@Directive({
  selector: '[hlmDropdownMenuRadio]',
  hostDirectives: [
    {
      directive: HlmDropdownMenuRadioCdk,
      inputs: ['cdkMenuItemDisabled: disabled', 'cdkMenuItemChecked: checked', 'keepOpen'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
    HlmDropdownMenuFocusOnHover,
  ],
  host: {
    'data-slot': 'dropdown-menu-radio-item',
    '[attr.data-disabled]': '_cdkMenuItem.disabled ? "" : null',
    '[attr.data-checked]': '_cdkMenuItem.checked ? "" : null',
  },
})
export class HlmDropdownMenuRadio {
  protected readonly _cdkMenuItem = inject(HlmDropdownMenuRadioCdk);

  constructor() {
    classes(
      () =>
        'group/dropdown-menu-radio relative flex h-8 w-full cursor-default items-center gap-2 rounded-[4px] px-3 text-sm text-foreground outline-hidden select-none hover:bg-accent focus-visible:bg-accent data-disabled:pointer-events-none data-disabled:opacity-40 data-inset:ps-8 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0',
    );
  }
}
