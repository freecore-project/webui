import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { BrnAutocompleteItem } from '@spartan-ng/brain/autocomplete';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-autocomplete-item',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: BrnAutocompleteItem, inputs: ['id', 'disabled', 'value'] }],
  host: { 'data-slot': 'autocomplete-item' },
  template: `
		<ng-content />
		@if (_active()) {
			<ng-icon name="lucideCheck" class="absolute end-2 flex items-center justify-center text-[length:--spacing(4)]" aria-hidden="true" />
		}
	`,
})
export class HlmAutocompleteItem {
  private readonly _brnAutocompleteItem = inject(BrnAutocompleteItem);

  protected readonly _active = this._brnAutocompleteItem.active;

  constructor() {
    classes(
      () =>
        'relative flex h-8 w-full cursor-default items-center gap-1.5 ps-3 pe-3 text-sm text-foreground outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-40 data-hidden:hidden [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0',
    );
  }
}
