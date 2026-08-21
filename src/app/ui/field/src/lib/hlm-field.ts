import { Directive, input } from '@angular/core';
import { BrnField } from '@spartan-ng/brain/field';
import { classes } from '@spartan-ng/helm/utils';
import { cva, VariantProps } from 'class-variance-authority';

// the internal development record: #351 stacks label row / box / hint with the label and the hint carrying
// their own leads; an invalid field paints its border and error line red, never its label.
const fieldVariants = cva('gap-0 group/field flex w-full', {
  variants: {
    orientation: {
      vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
      horizontal: [
        'flex-row items-center',
        '*:data-[slot=field-label]:flex-auto',
        'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ],
      responsive: [
        'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto [&>.sr-only]:w-auto',
        '@md/field-group:*:data-[slot=field-label]:flex-auto',
        '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ],
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

export type FieldVariants = VariantProps<typeof fieldVariants>;

@Directive({
  selector: '[hlmField],hlm-field',
  hostDirectives: [{ directive: BrnField, inputs: ['data-invalid', 'forceInvalid'] }],
  host: {
    role: 'group',
    'data-slot': 'field',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class HlmField {
  readonly orientation = input<FieldVariants['orientation']>('vertical');

  constructor() {
    classes(() => fieldVariants({ orientation: this.orientation() }));
  }
}
