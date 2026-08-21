import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

/**
 * the internal development record / #395: the #387 chevron -- border-drawn, 16px, fg2 at .8 -- so every spartan
 * trigger (select, combobox) shows the same glyph. Drawn once here; the Material copy in
 * freecore-ui.css went with the last mat-select (#472, #473).
 */
@Directive({
  selector: '[hlmSelectChevron]',
  host: { 'aria-hidden': 'true', 'data-slot': 'select-chevron' },
})
export class HlmSelectChevron {
  constructor() {
    classes(
      () => "text-muted-foreground relative size-4 shrink-0 opacity-80 after:absolute after:top-[2px] after:left-[4px] after:size-[6px] after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-current after:content-['']",
    );
  }
}
