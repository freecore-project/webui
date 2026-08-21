import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

@Component({
  standalone: false,
  selector: 'form-paragraph',
  templateUrl: './form-paragraph.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-paragraph.component.scss', '../dynamic-field/dynamic-field.css'],
})
export class FormParagraphComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;

  constructor(public translate: TranslateService) {}
}
