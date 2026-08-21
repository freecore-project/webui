import {
  ComponentRef,
  Directive,
  Input,
  OnChanges,
  OnInit,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { FormButtonComponent } from '../form-button/form-button.component';
import { FormCheckboxComponent } from '../form-checkbox/form-checkbox.component';
import { FormInputComponent } from '../form-input/form-input.component';
import { FormPermissionsComponent } from '../form-permissions/form-permissions.component';
import { FormSelectComponent } from '../form-select/form-select.component';
import { FormTextareaComponent } from '../form-textarea/form-textarea.component';
import { FormUploadComponent } from '../form-upload/form-upload.component';
import { FormExplorerComponent } from '../form-explorer/form-explorer.component';
import { FormRadioComponent } from '../form-radio/form-radio.component';
import { FormReadFileComponent } from '../form-readfile/form-readfile.component';
import { FormColorpickerComponent } from '../form-colorpicker/form-colorpicker.component';
import { FormComboboxComponent } from '../form-combobox/form-combobox.component';
import { FormParagraphComponent } from '../form-paragraph/form-paragraph.component';
import { FormSchedulerComponent } from '../form-scheduler/form-scheduler.component';
import { FormIpWithNetmaskComponent } from '../form-ipwithnetmask/form-ipwithnetmask.component';
import { FormListComponent } from '../form-list/form-list.component';
import { FormChipComponent } from '../form-chip/form-chip.component';

const components: { [type: string]: Type<Field> } = {
  button: FormButtonComponent,
  input: FormInputComponent,
  select: FormSelectComponent,
  checkbox: FormCheckboxComponent,
  textarea: FormTextareaComponent,
  permissions: FormPermissionsComponent,
  upload: FormUploadComponent,
  explorer: FormExplorerComponent,
  radio: FormRadioComponent,
  readfile: FormReadFileComponent,
  colorpicker: FormColorpickerComponent,
  combobox: FormComboboxComponent,
  paragraph: FormParagraphComponent,
  scheduler: FormSchedulerComponent,
  ipwithnetmask: FormIpWithNetmaskComponent,
  list: FormListComponent,
  chip: FormChipComponent,
};

@Directive({ standalone: false, selector: '[dynamicField]' })
export class DynamicFieldDirective implements Field, OnChanges, OnInit {
  @Input() config: FieldConfig;

  @Input() group: UntypedFormGroup;

  @Input() fieldShow: string;

  component: ComponentRef<Field>;

  constructor(private container: ViewContainerRef) {}

  ngOnChanges() {
    if (this.component) {
      this.component.instance.config = this.config;
      this.component.instance.group = this.group;
      this.component.instance.fieldShow = this.fieldShow;
    }
  }

  ngOnInit() {
    if (!components[this.config.type]) {
      const supportedTypes = Object.keys(components).join(', ');
      throw new Error(`Trying to use an unsupported type (${this.config.type}).
        Supported types: ${supportedTypes}`);
    }
    this.component = this.container.createComponent(components[this.config.type]);
    this.component.instance.config = this.config;
    this.component.instance.group = this.group;
    this.component.instance.fieldShow = this.fieldShow;
  }
}
