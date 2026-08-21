import { MatDialogRef } from '@angular/material/dialog';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

import { WebSocketService } from '../../../services/ws.service';
import { StorageService } from '../../../services/storage.service';
import { EntityUtils } from '../entity/utils';

@Component({
  standalone: false,
  selector: 'error-dialog',
  templateUrl: './error-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ErrorDialog {
  title: string;
  message: string;
  backtrace: string;
  isCloseMoreInfo: Boolean = true;
  logs;

  constructor(public dialogRef: MatDialogRef < ErrorDialog >, public translate: TranslateService,
    private ws: WebSocketService, public http: HttpClient, public storage: StorageService) {}

  // the internal development record: 'More info...' is a <details> disclosure; the dialog widens to the
  // log-pane width while the backtrace is open and returns to the message width when folded.
  toggleOpen(event: Event) {
    this.isCloseMoreInfo = !(event.target as HTMLDetailsElement).open;
    this.dialogRef.updateSize(this.isCloseMoreInfo ? '420px' : '800px');
  }

  downloadLogs() {
    this.ws.call('core.download', ['filesystem.get', [this.logs.logs_path], this.logs.id + '.log']).subscribe(
      (res) => {
        const url = res[1];
        const mimetype = 'text/plain';
        let failed = false;
        this.storage.streamDownloadFile(this.http, url, this.logs.id + '.log', mimetype).subscribe((file) => {
          this.storage.downloadBlob(file, this.logs.id + '.log');
          if (this.dialogRef) {
            this.dialogRef.close();
          }
        }, (err) => {
          failed = true;
          if (this.dialogRef) {
            this.dialogRef.close();
          }
          new EntityUtils().handleWSError(this, err);
        });
      },
      (err) => {
        new EntityUtils().handleWSError(this, err);
      },
    );
  }
}
