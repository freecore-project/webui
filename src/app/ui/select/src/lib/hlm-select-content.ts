import { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BrnSelectContent } from '@spartan-ng/brain/select';
import { classes, hlm } from '@spartan-ng/helm/utils';
import { HlmSelectScrollDown } from './hlm-select-scroll-down';
import { HlmSelectScrollUp } from './hlm-select-scroll-up';

@Component({
  selector: 'hlm-select-content',
  imports: [HlmSelectScrollUp, HlmSelectScrollDown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnSelectContent],
  template: `
		@if (showScroll()) {
			<hlm-select-scroll-up />
		}

		<div role="listbox" [class]="_computedListboxClasses()">
			<ng-content />
		</div>

		@if (showScroll()) {
			<hlm-select-scroll-down />
		}
	`,
})
export class HlmSelectContent {
  protected readonly _computedListboxClasses = computed(() => hlm('flex flex-col'));

  readonly showScroll = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  constructor() {
    // the internal development record: the #354 panel -- bg2 on a --line hairline, 6px, no shadow, 4px vertical padding.
    classes(() => 'bg-popover text-popover-foreground border border-border rounded-lg shadow-none py-1 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-100 relative flex max-h-72 min-w-36 w-(--brn-select-width) flex-col overflow-x-hidden overflow-y-auto no-scrollbar');
  }
}
