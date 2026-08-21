import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  model,
  output,
  viewChild,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { BrnCheckbox } from '@spartan-ng/brain/checkbox';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import type { ChangeFn, TouchFn } from '@spartan-ng/brain/forms';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

export const HLM_CHECKBOX_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => HlmCheckbox),
  multi: true,
};

@Component({
  selector: 'hlm-checkbox',
  imports: [BrnCheckbox, NgIcon],
  providers: [HLM_CHECKBOX_VALUE_ACCESSOR],
  viewProviders: [provideIcons({ lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnFieldControlDescribedBy],
  host: {
    class: 'contents peer',
    'data-slot': 'checkbox',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.data-disabled]': '_disabled() ? "" : null',
  },
  template: `
		<brn-checkbox
			[id]="inputId()"
			[name]="name()"
			[class]="_computedClass()"
			[checked]="checked()"
			[(indeterminate)]="indeterminate"
			[disabled]="_disabled()"
			[required]="required()"
			[aria-label]="ariaLabel()"
			[aria-labelledby]="ariaLabelledby()"
			[aria-describedby]="ariaDescribedby()"
			[forceInvalid]="forceInvalid()"
			(checkedChange)="_handleChange($event)"
			(touched)="_onTouched?.()"
		>
			@if (checked() || indeterminate()) {
				<span class="[&>ng-icon]:text-[length:--spacing(3)] flex items-center justify-center text-current transition-none">
					<ng-icon name="lucideCheck" />
				</span>
			}
		</brn-checkbox>
	`,
})
export class HlmCheckbox implements ControlValueAccessor {
  readonly userClass = input<ClassValue>('', { alias: 'class' });

  // the internal development record: the #352 box -- 16px, 4px radius, fg2/70 hairline, checked = fg1 fill + bg0 mark.
  protected readonly _computedClass = computed(() =>
    hlm(
      'peer flex size-4 shrink-0 cursor-default items-center justify-center rounded-[4px] border bg-transparent outline-none border-[color-mix(in_srgb,var(--sp-muted-foreground)_70%,transparent)] hover:border-muted-foreground transition-[background-color,border-color,box-shadow] duration-[120ms] data-checked:bg-primary data-checked:border-primary data-checked:text-primary-foreground data-checked:hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:ring-destructive/25 data-[matches-spartan-invalid=true]:ring-3 disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50',
      this.userClass(),
      this._errorStateClass(),
    ),
  );

  /** Used to set the id on the underlying brn element. */
  readonly inputId = input<string | null>(null);

  /** Used to set the aria-label attribute on the underlying brn element. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /** Used to set the aria-labelledby attribute on the underlying brn element. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });

  /** Used to set the aria-describedby attribute on the underlying brn element. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  /** The checked state of the checkbox. */
  readonly checkedInput = input<boolean, BooleanInput>(false, { alias: 'checked', transform: booleanAttribute });
  readonly checked = linkedSignal(this.checkedInput);

  /** Emits when checked state changes. */
  readonly checkedChange = output<boolean>();

  /**
	 * The indeterminate state of the checkbox.
	 * For example, a "select all/deselect all" checkbox may be in the indeterminate state when some but not all of its sub-controls are checked.
	 */
  readonly indeterminate = model<boolean>(false);

  /** The name attribute of the checkbox. */
  readonly name = input<string | null>(null);

  /** Whether the checkbox is required. */
  readonly required = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /** Whether the checkbox is disabled. */
  readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /** Whether to force the checkbox into an invalid state. */
  readonly forceInvalid = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  protected readonly _disabled = linkedSignal(this.disabled);

  private readonly _brnCheckbox = viewChild.required(BrnCheckbox);

  private readonly _spartanInvalid = computed(() => this.forceInvalid() || this._brnCheckbox().spartanInvalid?.());
  protected readonly _errorStateClass = computed(() =>
    this._spartanInvalid()
      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40'
      : '',
  );

  protected _onChange?: ChangeFn<boolean>;
  protected _onTouched?: TouchFn;

  protected _handleChange(value: boolean): void {
    if (this._disabled()) return;
    this.checked.set(value);
    this.checkedChange.emit(value);
    this._onChange?.(value);
  }

  /** CONTROL VALUE ACCESSOR */
  writeValue(value: boolean): void {
    this.checked.set(value);
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
