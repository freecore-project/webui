import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

// the internal development record: the S1 switch's thumb -- 14px, fg2 off, bg0 on, sliding the track's inner
// width (32 - 2 borders - 2 padding - 14 = 14px). The spartan template keyed this on a `.spartan-switch-thumb`
// class from its global style file, which this app does not ship; the utilities are written here.
@Directive({
  selector: 'brn-switch-thumb[hlm],[hlmSwitchThumb]',
  host: { 'data-slot': 'switch-thumb' },
})
export class HlmSwitchThumb {
  constructor() {
    classes(() => 'pointer-events-none block size-3.5 rounded-full bg-muted-foreground ring-0 transition-transform duration-[120ms] data-unchecked:translate-x-0 data-checked:translate-x-[14px] data-checked:bg-primary-foreground');
  }
}
