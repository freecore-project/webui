import { MatDialogRef } from '@angular/material/dialog';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'info-dialog',
  templateUrl: './info-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class InfoDialog {
  title: string;
  info: string;
  icon: string;
  is_html: boolean;

  // the internal development record: a plain-text report is a sentence in the body voice unless it carries
  // line breaks (a listing, a log), which take the mono pane.
  get isMultiline(): boolean {
    return typeof this.info === 'string' && this.info.includes('\n');
  }

  constructor(public dialogRef: MatDialogRef < InfoDialog >, protected translate: TranslateService) {

  }
}
