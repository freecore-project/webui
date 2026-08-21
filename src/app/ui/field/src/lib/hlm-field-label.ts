import { Directive } from '@angular/core';
import { HlmLabel } from '@spartan-ng/helm/label';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmFieldLabel],hlm-field-label',
  hostDirectives: [HlmLabel],
  host: { 'data-slot': 'field-label' },
})
export class HlmFieldLabel {
  constructor() {
    // the internal development record: the #351 label row -- 12/16 fg2, static, 4px above the box (a 20px row).
    // The 4px is an arbitrary value on purpose: fn-styles.css defines egret helpers with the names
    // of the one-unit margin/padding utilities (with !important), and Tailwind scans this file --
    // comments included -- so those names may not even be written here. The shadow check lists them.
    classes(() => 'group/field-label peer/field-label mb-[4px] flex h-4 w-fit items-center gap-2 text-xs leading-4 font-[400] text-muted-foreground group-data-[disabled=true]/field:opacity-50');
  }
}
