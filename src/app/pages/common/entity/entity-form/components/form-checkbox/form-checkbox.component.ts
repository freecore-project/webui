import { Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

@Component({
  selector: 'form-checkbox',
  styleUrls:
  ['form-checkbox.component.scss', '../dynamic-field/dynamic-field.css'],
  templateUrl: './form-checkbox.component.html',
  })
export class FormCheckboxComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;

  constructor(public translate: TranslateService) {}

  checkboxUpdate() {
    if (this.config.updater && this.config.parent) {
      this.config.updater(this.config.parent);
    }
  }
}
