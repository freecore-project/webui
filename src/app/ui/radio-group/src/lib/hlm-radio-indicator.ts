import { ChangeDetectionStrategy, Component } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-radio-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'radio-group-indicator',
  },
  template: `
		<div class="group-data-[checked=true]:bg-primary size-2 rounded-full bg-transparent"></div>
	`,
})
export class HlmRadioIndicator {
  constructor() {
    // the internal development record: the #352 ring -- 16px, fg2/70 hairline, checked = fg1 ring + 8px fg1 dot.
    classes(
      () =>
        'relative flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border bg-transparent border-[color-mix(in_srgb,var(--sp-muted-foreground)_70%,transparent)] group-hover:border-muted-foreground transition-[border-color,box-shadow] duration-[120ms] group-data-[checked=true]:border-primary group-has-[:focus-visible]:border-ring group-has-[:focus-visible]:ring-3 group-has-[:focus-visible]:ring-ring/25 group-data-[matches-spartan-invalid=true]:border-destructive group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50',
    );
  }
}
