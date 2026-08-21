import { MatDialogRef } from '@angular/material/dialog';
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../translate-marker';

@Component({
  standalone: false,
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  // the internal development record: the checkbox rows are the engine's #394 row (dynamic-field.css).
  styleUrls: ['../entity/entity-form/components/dynamic-field/dynamic-field.css', './confirm-dialog.component.css'],
})
export class ConfirmDialog {
  title: string;
  message: string;
  buttonMsg: string = T('Continue');
  cancelMsg: string = T('Cancel');
  hideCheckBox = false;
  isSubmitEnabled = false;
  secondaryCheckBox = false;
  secondaryCheckBoxMsg = '';
  method: string;
  data: string;
  tooltip: string;
  hideCancel = false;
  customSumbit;

  @Output() switchSelectionEmitter = new EventEmitter<any>();

  constructor(public dialogRef: MatDialogRef < ConfirmDialog >, protected translate: TranslateService) {
  }

  toggleSubmit(checked: boolean) {
    this.isSubmitEnabled = checked;
  }
  secondaryCheckBoxEvent(_checked: boolean) {
    this.switchSelectionEmitter.emit(this.secondaryCheckBox);
  }
  isDisabled() {
    if (!this.hideCheckBox) {
      return !this.isSubmitEnabled && !this.hideCheckBox;
    }
    return this.secondaryCheckBox ? !this.isSubmitEnabled : false;
  }
}
