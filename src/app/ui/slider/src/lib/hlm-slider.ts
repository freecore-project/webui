import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrnSlider, BrnSliderImports, injectBrnSlider } from '@spartan-ng/brain/slider';
import { classes } from '@spartan-ng/helm/utils';

// the internal development record: the helm slider (spartan's 1.4.1 template, horizontal and tick-less) on the FreeCORE mono
// controls (#377): a 2px hairline track, a 2px fg2 fill up to the knob, a 14px round fg1 knob with no shadow, the
// kit's focus ring. The row runs 7px (half the knob) past the track at each end, so the knob centre travels the
// track end to end, as Material's did (brain keeps a knob inside its row); a 24px band around the track takes the
// click.
@Component({
  selector: 'hlm-slider, brn-slider [hlm]',
  imports: [BrnSliderImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BrnSlider,
      inputs: ['id', 'value', 'disabled', 'min', 'max', 'step', 'inverted', 'aria-label', 'aria-labelledby'],
      outputs: ['valueChange'],
    },
  ],
  template: `
		<div class="relative -mx-[7px] flex items-center px-[7px]">
			<div
				brnSliderTrack
				class="relative h-0.5 grow cursor-pointer bg-(--fc-line) before:absolute before:inset-x-0 before:-inset-y-[11px] before:content-['']"
			>
				<div brnSliderRange class="absolute h-full bg-(--fg2) select-none"></div>
			</div>

			@for (i of _slider.thumbIndexes(); track i) {
				<span
					brnSliderThumb
					class="absolute block size-3.5 shrink-0 cursor-pointer rounded-full bg-(--fg1) outline-none select-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/25"
				></span>
			}
		</div>
	`,
})
export class HlmSlider {
  protected readonly _slider = injectBrnSlider();

  constructor() {
    classes(() => [
      'group flex w-full touch-none flex-col justify-center select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    ]);
  }
}
