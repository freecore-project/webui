import { Directive, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

// the internal development record (owed since #391): the three button tiers of the internal development record, expressed
// here once. Tier 1 = `default` (fg1 ground, bg0 text, hover fg1 86% over bg0), tier 2 = `outline`
// (transparent on a --line hairline, hover surface + fg2/40 border), tier 3 = `ghost` (fg2 text,
// hover surface + fg1), danger = `destructive` (transparent, red text, red/45 outline, red/10 hover).
// 32px / 6px / 13px / 500 / 14px padding, no ripple, disabled .4, focus = the 25% accent ring.
// the internal development record: the dimming also keys on the native :disabled state -- ipmi writes
// `button.disabled` straight to the DOM and BrnButton only mirrors its own input into data-disabled.
// (A button bound disabled that a page later enables by hand keeps data-disabled, exactly as it kept
// Material's disabled class -- the three volume-key forms, pre-existing.) The pointer cursor arrives
// on hover, which is where Material's `.mdc-button:hover` put it.
export const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:ring-destructive/20 data-[matches-spartan-invalid=true]:border-destructive rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 data-[matches-spartan-invalid=true]:ring-3 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)] group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-[background-color,border-color,color] duration-[120ms] outline-none select-none hover:cursor-pointer data-disabled:pointer-events-none data-disabled:opacity-40 disabled:pointer-events-none disabled:opacity-40 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--sp-primary)_86%,var(--sp-primary-foreground))]',
        outline: 'border-border bg-transparent text-foreground hover:bg-accent hover:border-input-hover aria-expanded:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground',
        destructive: 'border-destructive/45 bg-transparent text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/25 focus-visible:border-destructive/45',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 gap-1.5 px-3.5 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3)]",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3.5)]",
        lg: 'h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3',
        // the internal development record: no preflight here, so the icon sizes zero the UA button padding
        // themselves (as the input-group button does) or the glyph sits off-centre -- written as
        // two axes because the app CSS owns the one-word name (the #392 trap).
        icon: 'size-8 px-0 py-0',
        'icon-xs': "size-6 px-0 py-0 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3)]",
        'icon-sm': 'size-7 px-0 py-0 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9 px-0 py-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
  selector: 'button[hlmBtn], a[hlmBtn]',
  exportAs: 'hlmBtn',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: { 'data-slot': 'button' },
})
export class HlmButton {
  private readonly _config = injectBrnButtonConfig();

  private readonly _additionalClasses = signal<ClassValue>('');

  readonly variant = input<ButtonVariants['variant']>(this._config.variant);

  readonly size = input<ButtonVariants['size']>(this._config.size);

  constructor() {
    classes(() => [buttonVariants({ variant: this.variant(), size: this.size() }), this._additionalClasses()]);
  }

  setClass(classes: string): void {
    this._additionalClasses.set(classes);
  }
}
