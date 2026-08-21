import { Directive } from '@angular/core';
import { BrnAutocompleteStatus } from '@spartan-ng/brain/autocomplete';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmAutocompleteStatus],hlm-autocomplete-status',
  hostDirectives: [BrnAutocompleteStatus],
  host: { 'data-slot': 'autocomplete-status' },
})
export class HlmAutocompleteStatus {
  constructor() {
    // the internal development record: the centred-text utility is written as an arbitrary property -- its stock
    // name is one three app templates use (shadow check).
    classes(() => 'text-muted-foreground gap-2 px-2.5 py-2 text-sm flex w-full items-center justify-center [text-align:center]');
  }
}
