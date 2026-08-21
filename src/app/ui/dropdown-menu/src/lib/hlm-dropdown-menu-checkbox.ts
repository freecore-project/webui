import { type BooleanInput } from '@angular/cdk/coercion';
import { CdkMenuItem, CdkMenuItemCheckbox, CdkMenuItemSelectable } from '@angular/cdk/menu';
import { Directive, booleanAttribute, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmDropdownMenuFocusOnHover } from './hlm-dropdown-menu-focus-on-hover';

/** @internal. Use HlmDropdownMenuCheckbox instead. */
@Directive({
  selector: '[hlmDropdownMenuCheckboxCdk]',
  providers: [
    { provide: CdkMenuItemCheckbox, useExisting: HlmDropdownMenuCheckboxCdk },
    { provide: CdkMenuItemSelectable, useExisting: HlmDropdownMenuCheckboxCdk },
    { provide: CdkMenuItem, useExisting: CdkMenuItemSelectable },
  ],
})
export class HlmDropdownMenuCheckboxCdk extends CdkMenuItemCheckbox {
  readonly keepOpen = input<boolean, BooleanInput>(true, { transform: booleanAttribute });

  override trigger(options?: { keepOpen: boolean }) {
    super.trigger({ ...options, keepOpen: this.keepOpen() });
  }
}

@Directive({
  selector: '[hlmDropdownMenuCheckbox],[hlmDropdownMenuCheckboxItem]',
  hostDirectives: [
    {
      directive: HlmDropdownMenuCheckboxCdk,
      inputs: ['cdkMenuItemDisabled: disabled', 'cdkMenuItemChecked: checked', 'keepOpen'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
    HlmDropdownMenuFocusOnHover,
  ],
  host: {
    'data-slot': 'dropdown-menu-checkbox-item',
    '[attr.data-disabled]': '_cdkMenuItem.disabled ? "" : null',
    '[attr.data-checked]': '_cdkMenuItem.checked ? "" : null',
    '[attr.data-inset]': 'inset() ? "" : null',
  },
})
export class HlmDropdownMenuCheckbox {
  protected readonly _cdkMenuItem = inject(HlmDropdownMenuCheckboxCdk);

  readonly inset = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  constructor() {
    classes(
      () =>
        'group/dropdown-menu-checkbox relative flex h-8 w-full cursor-default items-center gap-2 rounded-[4px] px-3 text-sm text-foreground outline-hidden select-none hover:bg-accent focus-visible:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-40 data-inset:ps-8 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0',
    );
  }
}
