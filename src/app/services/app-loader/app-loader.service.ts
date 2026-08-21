import { EventEmitter, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AppLoaderComponent } from './app-loader.component';
import { T } from '../../translate-marker';

@Injectable()
export class AppLoaderService {
  dialogRef: MatDialogRef<AppLoaderComponent>;

  constructor(private dialog: MatDialog) { }

  open(title: string = T('Working'), presentation: { message?: string; detail?: string; fullscreen?: boolean; copyrightYear?: string | number } = {}): Observable<boolean> {
    this.dialogRef = this.dialog.open(AppLoaderComponent, { disableClose: true, panelClass: presentation.fullscreen ? ['fc-status-dialog', 'fc-status-fullscreen'] : 'fc-status-dialog', maxWidth: 'calc(100vw - 32px)' });
    this.dialogRef.updateSize('366px', 'auto');
    this.dialogRef.componentInstance.title = title;
    this.dialogRef.componentInstance.message = presentation.message;
    this.dialogRef.componentInstance.detail = presentation.detail;
    this.dialogRef.componentInstance.fullscreen = !!presentation.fullscreen;
    this.dialogRef.componentInstance.copyrightYear = presentation.copyrightYear;
    return this.dialogRef.afterClosed();
  }

  close() {
    this.dialogRef.close();
  }

  // These pass signals from various components to entity form component to start/stop progress spinner
  callStarted = new EventEmitter<string>();
  callDone = new EventEmitter<string>();
}
