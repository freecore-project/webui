import { Directive, effect, EffectRef, inject, input, OnDestroy } from '@angular/core';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmFieldDescription],hlm-field-description',
  host: {
    'data-slot': 'field-description',
    '[attr.id]': 'id()',
  },
})
export class HlmFieldDescription implements OnDestroy {
  private static _id = 0;

  private readonly _a11y = inject(BrnFieldA11yService, { optional: true, host: true });

  readonly id = input<string>(`hlm-field-description-${HlmFieldDescription._id++}`);

  private _registeredId?: string;

  private readonly _cleanup: EffectRef | null = this._a11y
    ? effect(() => {
      const a11y = this._a11y;
      if (!a11y) return;

      const id = this.id();
      if (this._registeredId && this._registeredId !== id) {
        a11y.unregisterDescription(this._registeredId);
      }

      if (this._registeredId !== id) {
        a11y.registerDescription(id);
        this._registeredId = id;
      }
    })
    : null;

  constructor() {
    // the internal development record: #351 subscript -- 12/16 fg2, 2px under the box.
    classes(() => 'mt-0.5 text-start text-xs leading-4 font-[400] text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground');
  }

  ngOnDestroy() {
    this._cleanup?.destroy();

    if (this._registeredId) {
      this._a11y?.unregisterDescription(this._registeredId);
    }
  }
}
