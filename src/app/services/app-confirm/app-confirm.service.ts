import { Observable } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';

import { AppComfirmComponent } from './app-confirm.component';

@Injectable()
export class AppConfirmService {
  constructor(private dialog: MatDialog) { }

  confirm(title: string, message: string, customButton: string): Observable<boolean> {
    const dialogRef = this.dialog.open(AppComfirmComponent, { disableClose: true });
    dialogRef.updateSize('380px');
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.customButton = customButton;
    return dialogRef.afterClosed();
  }
}
