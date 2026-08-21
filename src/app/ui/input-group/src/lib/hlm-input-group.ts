import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmInputGroup],hlm-input-group',
  host: {
    'data-slot': 'input-group',
    role: 'group',
  },
})
export class HlmInputGroup {
  constructor() {
    // the internal development record: the #351 box drawn once around control + addons (see hlm-input).
    classes(() => 'group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-field outline-none transition-[border-color,box-shadow] duration-[120ms] hover:border-input-hover has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/25 has-[[data-slot][data-matches-spartan-invalid=true]]:border-destructive has-[[data-slot][data-matches-spartan-invalid=true]]:hover:border-destructive has-[[data-slot][data-matches-spartan-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:ring-destructive/25 has-[[data-slot=input-group-control]:disabled]:pointer-events-none has-[[data-slot=input-group-control]:disabled]:opacity-50 in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[>textarea]:h-auto has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5');
  }
}
