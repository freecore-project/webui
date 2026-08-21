import { Directive, input } from '@angular/core';
import { HlmButton, provideBrnButtonConfig } from '@spartan-ng/helm/button';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputGroupAddonVariants = cva('gap-2 text-sm flex items-center shadow-none', {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>ng-icon:not([class*='text-'])]:text-[length:--spacing(3.5)]",
      sm: '',
      'icon-xs': 'size-6 rounded-[calc(var(--radius)-3px)] px-0 py-0 has-[>ng-icon]:px-0 has-[>ng-icon]:py-0',
      'icon-sm': 'size-8 px-0 py-0 has-[>ng-icon]:px-0 has-[>ng-icon]:py-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

type InputGroupAddonVariants = VariantProps<typeof inputGroupAddonVariants>;

@Directive({
  selector: 'button[hlmInputGroupButton]',
  providers: [
    provideBrnButtonConfig({
      variant: 'ghost',
    }),
  ],
  hostDirectives: [
    {
      directive: HlmButton,
      inputs: ['variant'],
    },
  ],
  host: {
    '[attr.data-size]': 'size()',
    '[type]': 'type()',
  },
})
export class HlmInputGroupButton {
  readonly size = input<InputGroupAddonVariants['size']>('xs');
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  constructor() {
    classes(() => inputGroupAddonVariants({ size: this.size() }));
  }
}
