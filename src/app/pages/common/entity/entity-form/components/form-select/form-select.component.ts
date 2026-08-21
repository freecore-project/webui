import { Component, OnInit, OnDestroy, DoCheck, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

@Component({
  standalone: false,
  selector: 'form-select',
  styleUrls: ['form-select.component.scss', '../dynamic-field/dynamic-field.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './form-select.component.html',
})
export class FormSelectComponent implements Field, OnInit, DoCheck, OnDestroy {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  control: any;

  private valueChangesSubscription: Subscription;
  private seenOptions: any[];
  private seenOptionCount = -1;

  /** the internal development record: the trigger's id -- the config's own, else derived so the label's `for` has a target. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-select`;
  }

  constructor(public translate: TranslateService) {
  }

  ngOnInit() {
    this.control = this.group.controls[this.config.name];
    // the internal development record: the select is a ControlValueAccessor now, so the value is the control's;
    // what survives from the Material renderer is the guard that surfaces an initial multi value
    // no option knows, as "<value>(invalid)", so it is visible instead of silently dropped.
    if (this.config.multiple && this.config.asyncValidation && Array.isArray(this.control.value)) {
      for (const v of this.control.value) {
        if (_.find(this.config.options, { value: v }) === undefined) {
          this.config.options.push({ label: v + '(invalid)', value: v });
        }
      }
    }
  }

  /**
   * the internal development record: the select names its value when the value is written, through itemToString; it
   * does not look again when the options change. Forms that load their options on their own call (System
   * -> General pushes the GUI certificate choices in place, after the value) then showed the raw value
   * ("1"). A new options array or a new length hands the select a new labelOf, so it names the value again.
   */
  ngDoCheck() {
    const options = this.config ? this.config.options : undefined;
    const count = options ? options.length : -1;
    if (options !== this.seenOptions || count !== this.seenOptionCount) {
      this.seenOptions = options;
      this.seenOptionCount = count;
      this.labelOf = this.labelFor();
    }
  }

  ngOnDestroy() {
    this.valueChangesSubscription?.unsubscribe();
  }

  /** The option label for a value, for the closed trigger (the panel's items only exist while open). */
  labelOf = this.labelFor();

  private labelFor(): (value: any) => string {
    return (value: any): string => {
      const option = _.find(this.config.options, (item) => item.value === value);
      if (option) {
        // ngx-translate throws on an empty or non-string key; inherited options carry numbers and ''.
        const key = option.label === null || option.label === undefined ? '' : String(option.label);
        return key ? this.translate.instant(key) : '';
      }
      return value === null || value === undefined ? '' : String(value);
    };
  }

  /** The multiple trigger: the selected labels, comma-joined, as the custom trigger used to render them. */
  labelsOf(values: any[]): string {
    return (values || []).map((value) => this.labelOf(value)).join(', ');
  }

  onChangeOption(value: any) {
    if (this.config.onChangeOption !== undefined && this.config.onChangeOption != null) {
      // The Material renderer passed the MatSelectChange; keep the `{ event: { value } }` shape.
      this.config.onChangeOption({ event: { value } });
    }
  }
}
