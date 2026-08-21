import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnInput } from '@spartan-ng/brain/input';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmInput]',
  hostDirectives: [{ directive: BrnInput, inputs: ['id', 'forceInvalid'] }, BrnFieldControlDescribedBy],
  host: { 'data-slot': 'input' },
})
export class HlmInput {
  constructor() {
    // the internal development record: the #351 field box -- 32px on the bg1 fill, --line hairline, 6px radius,
    // 13/18 text, fg2/40 hover border, accent focus border + 3px 25% ring, red when invalid.
    classes(() => 'h-8 w-full min-w-0 rounded-lg border border-input bg-field px-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-muted-foreground/70 hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:hover:border-destructive data-[matches-spartan-invalid=true]:focus-visible:ring-destructive/25 disabled:pointer-events-none disabled:opacity-50 read-only:text-muted-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground');
  }
}
