import { Component, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { EntityFormService } from '../../services/entity-form.service';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  standalone: false,
  selector: 'form-readfile',
  templateUrl: './form-readfile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../dynamic-field/dynamic-field.css'],
})
export class FormReadFileComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  fileString;

  constructor(private entityFormService: EntityFormService,
    public translate: TranslateService) {}

  /** the internal development record: the input's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }

  changeListener($event): void {
    this.readFile($event.target);
  }

  readFile(inputValue: any): any {
    const file: File = inputValue.files[0];
    const fReader: FileReader = new FileReader();
    fReader.onloadend = (e) => {
      this.fileString = fReader.result;
      this.contents(fReader.result);
    };
    return fReader.readAsText(file);
  }

  contents(result: any) {
    this.group.controls[this.config.name].setValue(result);
  }
}
