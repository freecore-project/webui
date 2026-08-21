import { Directive, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputGroupAddonVariants = cva(
  // the internal development record: an addon is a 16px fg2 glyph (or a text unit) on the box row, brightening on hover of its button.
  "text-muted-foreground h-auto gap-2 py-1.5 text-sm font-[400] group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>ng-icon:not([class*='text-'])]:text-[length:--spacing(4)] [&_.material-icons]:text-[16px] [&_.material-icons]:leading-4 [&_.material-icons]:opacity-80 flex cursor-text items-center justify-center select-none",
  {
    variants: {
      align: {
        'inline-start': 'ps-2 has-[>button]:ms-[-0.3rem] has-[>kbd]:ms-[-0.15rem] order-first',
        'inline-end': 'pe-2 has-[>button]:me-[-0.3rem] has-[>kbd]:me-[-0.15rem] order-last',
        'block-start': 'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2 order-first w-full justify-start',
        'block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2 order-last w-full justify-start',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

type InputGroupAddonVariants = VariantProps<typeof inputGroupAddonVariants>;

@Directive({
  selector: '[hlmInputGroupAddon],hlm-input-group-addon',
  host: {
    role: 'group',
    'data-slot': 'input-group-addon',
    '[attr.data-align]': 'align()',
  },
})
export class HlmInputGroupAddon {
  readonly align = input<InputGroupAddonVariants['align']>('inline-start');

  constructor() {
    classes(() => inputGroupAddonVariants({ align: this.align() }));
  }
}
