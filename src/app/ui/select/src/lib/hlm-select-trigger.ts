import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnSelectTrigger } from '@spartan-ng/brain/select';
import { HlmSelectChevron } from './hlm-select-chevron';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Component({
  selector: 'hlm-select-trigger',
  imports: [BrnSelectTrigger, BrnFieldControlDescribedBy, HlmSelectChevron],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
		<button
			brnSelectTrigger
			brnFieldControlDescribedBy
			[forceInvalid]="forceInvalid()"
			[id]="buttonId()"
			[class]="_computedClass()"
			[attr.data-size]="size()"
			data-slot="select-trigger"
		>
			<ng-content />
			<span hlmSelectChevron class="ms-auto"></span>
		</button>
	`,
})
export class HlmSelectTrigger {
  private static _id = 0;

  readonly userClass = input<ClassValue>('', { alias: 'class' });
  // the internal development record: the #351 field box (see hlm-input), as a button.
  protected readonly _computedClass = computed(() =>
    hlm(
      'h-8 w-full min-w-0 rounded-lg border border-input bg-field px-2.5 text-sm text-foreground outline-none flex items-center justify-between gap-2 whitespace-nowrap transition-[border-color,box-shadow] duration-[120ms] data-placeholder:text-muted-foreground/70 hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:hover:border-destructive data-[matches-spartan-invalid=true]:focus-visible:ring-destructive/25 disabled:pointer-events-none disabled:opacity-50 *:data-[slot=select-value]:truncate *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:text-start *:data-[slot=select-placeholder]:text-muted-foreground/70 data-[size=sm]:h-7',
      this.userClass(),
    ),
  );

  readonly buttonId = input<string>(`hlm-select-trigger-${HlmSelectTrigger._id++}`);

  readonly size = input<'default' | 'sm'>('default');

  /** Whether to force the trigger into an invalid state. */
  readonly forceInvalid = input<boolean, BooleanInput>(false, { transform: booleanAttribute });
}
