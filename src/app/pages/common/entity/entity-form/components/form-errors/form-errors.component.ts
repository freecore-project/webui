import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { FieldConfig } from '../../models/field-config.interface';

@Component({
  standalone: false,
  selector: 'form-errors',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './form-errors.component.html',
  // the internal development record: shares the renderers' stylesheet so `.form-error-line` resolves inside this view.
  styleUrls: ['../dynamic-field/dynamic-field.css'],
})
export class FormErrorsComponent {
  @Input()control: UntypedFormControl;
  @Input()config: FieldConfig;
}
