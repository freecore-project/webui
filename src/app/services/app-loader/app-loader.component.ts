import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConsolePanelModalDialog } from 'app/components/common/dialog/consolepanel/consolepanel-dialog.component';
import { Observable, Subscription } from 'rxjs';
import {
  filter, map, switchMap, take,
} from 'rxjs/operators';
import { WebSocketService } from '../ws.service';

@Component({
  standalone: false,
  selector: 'app-app-loader',
  templateUrl: './app-loader.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app-loader.component.css'],
})
export class AppLoaderComponent {
  title: string;
  message: string;
  detail: string;
  fullscreen = false;
  copyrightYear: string | number;

  consoleMsg: string;
  consoleMSgList: string[] = [];

  isShowConsole = false;

  consoleDialog: MatDialogRef<ConsolePanelModalDialog>;
  private _consoleSubscription: Subscription;

  constructor(
    public dialogRef: MatDialogRef<AppLoaderComponent>,
    private _dialog: MatDialog,
    private _ws: WebSocketService,
  ) {
    this._ws.call('system.advanced.config')
      .subscribe((res) => {
        if (res.consolemsg) {
          this.isShowConsole = true;
        }
      });
  }

  onOpenConsole(): void {
    this.consoleDialog = this._dialog.open(ConsolePanelModalDialog, { width: '80vw' });

    this._consoleSubscription = this.consoleDialog.componentInstance.onEventEmitter
      .pipe(switchMap(() => this._ws.consoleMessages))
      .subscribe((consoleMsg) => {
        this.consoleDialog.componentInstance.consoleMsg = consoleMsg;
      });

    this.consoleDialog.afterClosed().subscribe(() => {
      clearInterval(this.consoleDialog.componentInstance.intervalPing);
      this._consoleSubscription.unsubscribe();
    });
  }
}
