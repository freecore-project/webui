import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-select-dialog',
  templateUrl: './select-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../entity/entity-form/components/dynamic-field/dynamic-field.css'],
})
export class SelectDialogComponent {
  title: string;
  options: { label: string; value: string }[];
  optionPlaceHolder: string;
  method: string;
  params: string;
  DisplaySelection: string;
  @Output() switchSelectionEmitter = new EventEmitter<any>();

  constructor(public dialogRef: MatDialogRef < SelectDialogComponent >, protected translate: TranslateService) {}

  switchSelection() {
    this.switchSelectionEmitter.emit(this.DisplaySelection);
  }

  /** The option label for a value, for the closed trigger (the panel's items only exist while open). */
  labelOf = (value: any): string => {
    const option = (this.options || []).find((item) => item.value === value);
    if (option) {
      return option.label ? this.translate.instant(String(option.label)) : '';
    }
    return value === null || value === undefined ? '' : String(value);
  };
}
