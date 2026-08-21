import { BrnProgress, BrnProgressIndicator, injectBrnProgress } from '@spartan-ng/brain/progress';
import { Directionality } from '@angular/cdk/bidi';
import { Directive, computed, inject } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

// the internal development record: the linear progress the ix themes painted on Material -- a square 4px bar, the indicator in
// the theme's own --primary (not the kit's mono tier), the track the same colour at half strength. No value =
// indeterminate: one segment sweeping (the keyframes live in freecore-spartan.css).
@Directive({
  selector: '[hlmProgressIndicator],hlm-progress-indicator',
  hostDirectives: [BrnProgressIndicator],
  host: {
    'data-slot': 'progress-indicator',
    '[class.animate-indeterminate]': '_indeterminate()',
    '[style.transform]': '_transform()',
  },
})
export class HlmProgressIndicator {
  private readonly _progress = injectBrnProgress();
  private readonly _dir = inject(Directionality);
  // Offset the indicator by the unfilled remainder. In RTL the bar fills from the inline-start
  // (visually the right), so translate the opposite way to keep the fill on the correct side.
  protected readonly _transform = computed(() => {
    const offset = 100 - (this._progress.value() ?? 100);
    return `translateX(${this._dir.valueSignal() === 'rtl' ? '' : '-'}${offset}%)`;
  });
  protected readonly _indeterminate = computed(
    () => this._progress.value() === null || this._progress.value() === undefined,
  );

  constructor() {
    classes(() => 'bg-(--primary) h-full w-full flex-1 transition-transform');
  }
}

@Directive({
  selector: 'hlm-progress,[hlmProgress]',
  hostDirectives: [{ directive: BrnProgress, inputs: ['value', 'max', 'getValueLabel'] }],
  host: { 'data-slot': 'progress' },
})
export class HlmProgress {
  constructor() {
    classes(() => 'bg-(--primary)/50 h-1 relative flex w-full overflow-hidden');
  }
}

