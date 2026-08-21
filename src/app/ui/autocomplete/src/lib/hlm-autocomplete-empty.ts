import { Directive } from '@angular/core';
import { BrnAutocompleteEmpty } from '@spartan-ng/brain/autocomplete';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmAutocompleteEmpty],hlm-autocomplete-empty',
  hostDirectives: [BrnAutocompleteEmpty],
  host: { 'data-slot': 'autocomplete-empty' },
})
export class HlmAutocompleteEmpty {
  constructor() {
    // the internal development record: centred text as an arbitrary property (its stock name is an app template class).
    classes(() => 'text-muted-foreground hidden w-full items-center justify-center py-2 [text-align:center] text-sm group-data-empty/autocomplete-content:flex');
  }
}
