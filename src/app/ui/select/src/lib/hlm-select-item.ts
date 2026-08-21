import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { BrnSelectItem } from '@spartan-ng/brain/select';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-select-item',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: BrnSelectItem, inputs: ['id', 'disabled', 'value'] }],
  host: { 'data-slot': 'select-item' },
  template: `
		<ng-content />
		@if (_active()) {
			<ng-icon name="lucideCheck" class="absolute end-2 flex items-center justify-center text-[length:--spacing(4)]" aria-hidden="true" />
		}
	`,
})
export class HlmSelectItem {
  private readonly _brnSelectItem = inject(BrnSelectItem);

  protected readonly _active = this._brnSelectItem.active;

  constructor() {
    // the internal development record: #354 rows -- 32px, 12px padding, 13px fg1, hover surface, disabled .4.
    classes(
      () =>
        'relative flex h-8 w-full cursor-default items-center gap-1.5 ps-3 pe-8 text-sm text-foreground outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-40 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0',
    );
  }
}
