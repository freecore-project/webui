import { Component, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { TooltipComponent } from '../tooltip/tooltip.component';
import globalHelptext from '../../../../../../helptext/global-helptext';

@Component({
  standalone: false,
  selector: 'form-textarea',
  templateUrl: './form-textarea.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../dynamic-field/dynamic-field.css'],
})
export class FormTextareaComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;

  /** the internal development record: the control's id -- the config's own (the theme and e2e key on some, like
   * `#password`), else one derived from the name so the label's `for` always has a target. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }
  private hasPasteEvent = false;
  fileString;

  constructor(public translate: TranslateService) {}

  blurEvent() {
    if (this.config.blurStatus) {
      this.config.blurEvent(this.config.parent);
    }
  }

  onPaste(event: ClipboardEvent) {
    this.hasPasteEvent = true;
    const clipboardData = event.clipboardData;
    const pastedText = clipboardData.getData('text');
    if (pastedText.startsWith(' ')) {
      this.config.warnings = globalHelptext.pasteValueStartsWithSpace;
    } else if (pastedText.endsWith(' ')) {
      this.config.warnings = globalHelptext.pasteValueEndsWithSpace;
    }
  }

  onInput() {
    if (this.hasPasteEvent) {
      this.hasPasteEvent = false;
    } else {
      this.config.warnings = null;
    }
  }

  changeListener($event): void {
    this.readFile($event.target);
  }

  readFile(inputValue: any) {
    var file: File = inputValue.files[0];
    var fReader: FileReader = new FileReader();

    fReader.onloadend = (e) => {
      this.fileString = fReader.result;
      this.contents(fReader.result);
    };
    if (this.config.fileType == 'binary') {
      fReader.readAsBinaryString(file);
    } else {
      fReader.readAsText(file);
    }
  }

  contents(result: any) {
    if (this.config.fileType == 'binary') {
      this.group.controls[this.config.name].setValue(btoa(result));
    } else {
      this.group.controls[this.config.name].setValue(result);
    }
  }
}
