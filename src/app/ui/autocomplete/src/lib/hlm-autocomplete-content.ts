import { Directive } from '@angular/core';
import { BrnAutocompleteContent } from '@spartan-ng/brain/autocomplete';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmAutocompleteContent],hlm-autocomplete-content',
  hostDirectives: [BrnAutocompleteContent],
})
export class HlmAutocompleteContent {
  constructor() {
    classes(
      () => 'bg-popover text-popover-foreground border border-border rounded-lg shadow-none py-1 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-100 group/autocomplete-content flex max-h-72 min-w-36 w-(--brn-autocomplete-width) flex-col overflow-hidden',
    );
  }
}
