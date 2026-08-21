import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import helptext from '../../helptext/shell/shell';

@Component({
  standalone: false,
  selector: 'app-copy-paste-message',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
      <h2 mat-dialog-title>{{title | translate}}</h2>
      <div mat-dialog-content [innerHtml]="messageHtml"></div>
      <div mat-dialog-actions>
        <button hlmBtn variant="outline" type="button" (click)="dialogRef.close(true)"
        ix-auto ix-auto-type="button" ix-auto-identifier="CLOSE"
        >{{"Close" | translate}}</button>
      </div>
  `,
})
export class CopyPasteMessageComponent {
  title = helptext.dialog_title;
  messageHtml = helptext.copy_paste_message;

  constructor(public dialogRef: MatDialogRef<CopyPasteMessageComponent>,
    protected translate: TranslateService) {}
}
