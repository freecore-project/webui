import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnTextarea } from '@spartan-ng/brain/textarea';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmTextarea]',
  hostDirectives: [{ directive: BrnTextarea, inputs: ['id', 'forceInvalid'] }, BrnFieldControlDescribedBy],
  host: { 'data-slot': 'textarea' },
})
export class HlmTextarea {
  constructor() {
    // the internal development record: the #351 textarea -- the input box that grows, three 18px rows minimum.
    classes(() => 'min-h-[68px] w-full min-w-0 rounded-lg border border-input bg-field px-2.5 py-1.5 text-sm leading-[18px] text-foreground outline-none resize-y transition-[border-color,box-shadow] duration-[120ms] placeholder:text-muted-foreground/70 hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:hover:border-destructive data-[matches-spartan-invalid=true]:focus-visible:ring-destructive/25 disabled:pointer-events-none disabled:opacity-50 read-only:text-muted-foreground');
  }
}
