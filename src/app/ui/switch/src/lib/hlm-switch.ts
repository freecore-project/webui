import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  numberAttribute,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ChangeFn, TouchFn } from '@spartan-ng/brain/forms';
import { BrnSwitch, type BrnSwitchSize, BrnSwitchThumb } from '@spartan-ng/brain/switch';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';
import { HlmSwitchThumb } from './hlm-switch-thumb';

export const HLM_SWITCH_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => HlmSwitch),
  multi: true,
};

@Component({
  selector: 'hlm-switch',
  imports: [BrnSwitchThumb, BrnSwitch, HlmSwitchThumb],
  providers: [HLM_SWITCH_VALUE_ACCESSOR],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'switch',
    class: 'contents',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
  },
  template: `
		<brn-switch
			[class]="_computedClass()"
			[size]="size()"
			[checked]="checked()"
			(checkedChange)="handleChange($event)"
			(touched)="_onTouched?.()"
			[disabled]="_disabled()"
			[tabIndex]="tabIndex()"
			[id]="inputId()"
			[aria-label]="ariaLabel()"
			[aria-labelledby]="ariaLabelledby()"
			[aria-describedby]="ariaDescribedby()"
		>
			<brn-switch-thumb hlm />
		</brn-switch>
	`,
})
export class HlmSwitch implements ControlValueAccessor {
  readonly userClass = input<ClassValue>('', { alias: 'class' });

  // the internal development record: the S1 switch (the operator's pick) -- a 32x18 track on the checkbox law:
  // off = the --line hairline on a transparent track with a fg2 thumb, on = the fg1 track with a
  // bg0 thumb. One size; the spartan `size` input is kept for the brain but paints the same.
  protected readonly _computedClass = computed(() =>
    hlm(
      'group/switch inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border border-input bg-transparent px-px outline-none transition-[background-color,border-color,box-shadow] duration-[120ms] hover:border-muted-foreground data-checked:border-primary data-checked:bg-primary data-checked:hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:ring-3 data-[matches-spartan-invalid=true]:ring-destructive/25 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
      this.userClass(),
    ),
  );

  /** The checked state of the switch. */
  readonly checkedInput = input<boolean, BooleanInput>(false, { alias: 'checked', transform: booleanAttribute });
  readonly checked = linkedSignal(this.checkedInput);

  /** Emits when the checked state of the switch changes. */
  readonly checkedChange = output<boolean>();

  /** The disabled state of the switch. */
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  /** The size of the switch. */
  readonly size = input<BrnSwitchSize>('default');

  /** Used to set the id on the underlying brn element. */
  readonly inputId = input<string | null>(null);

  /** the internal development record: the tab index of the switch button (-1 for a display-only switch behind
   * an overlay that carries the accessible control). */
  readonly tabIndex = input<number, unknown>(0, { transform: numberAttribute });

  /** Used to set the aria-label attribute on the underlying brn element. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /** Used to set the aria-labelledby attribute on the underlying brn element. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });

  /** Used to set the aria-describedby attribute on the underlying brn element. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  protected readonly _disabled = linkedSignal(this.disabled);

  protected _onChange?: ChangeFn<boolean>;
  protected _onTouched?: TouchFn;

  protected handleChange(value: boolean): void {
    this.checked.set(value);
    this._onChange?.(value);
    this.checkedChange.emit(value);
  }

  /** CONTROL VALUE ACCESSOR */
  writeValue(value: boolean): void {
    this.checked.set(Boolean(value));
  }

  registerOnChange(fn: ChangeFn<boolean>): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: TouchFn): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }
}
