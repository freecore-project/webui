import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

@Component({
  standalone: false,
  selector: 'form-checkbox',
  styleUrls:
  ['form-checkbox.component.scss', '../dynamic-field/dynamic-field.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './form-checkbox.component.html',
})
export class FormCheckboxComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;

  /** the internal development record: the box's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-checkbox`;
  }

  constructor(public translate: TranslateService) {}

  checkboxUpdate() {
    if (this.config.updater && this.config.parent) {
      this.config.updater(this.config.parent);
    }
  }
}
