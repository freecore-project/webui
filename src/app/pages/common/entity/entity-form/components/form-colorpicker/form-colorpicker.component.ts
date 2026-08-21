import {
  Component, AfterViewInit, OnInit, OnChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  standalone: false,
  selector: 'form-colorpicker',
  templateUrl: './form-colorpicker.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../dynamic-field/dynamic-field.css', './form-colorpicker.component.css'],
})
export class FormColorpickerComponent implements Field, OnInit, OnChanges {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  picker = false;
  private _textInput = '';

  get textInput() {
    return this._textInput;
  }

  set textInput(val: string) {
    this._textInput = val;
    console.log('TEXT INPUT CHANGED!!');
    console.log(val);
  }

  /** the internal development record: the text input's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }

  get colorProxy() {
    return this.group.value[this.config.name];
  }

  set colorProxy(val: string) {
    this.group.controls[this.config.name].setValue(val);
  }

  constructor() {}

  ngOnChanges(changes) {
    if (changes.group) {
    }
  }

  ngOnInit() {
    this.config.value = this.group.value[this.config.name];
  }

  cpListener(evt: string, data: any): void {
    this.group.value[this.config.name] = data;
  }

  inputListener(evt: string, data: any): void {
    console.log(evt);
    this.group.value[this.config.name] = data;
  }

  onChangeColor(color: string): any {
    // console.log(color);
  }

  togglePicker() {
    this.picker = !this.picker;
  }
}
