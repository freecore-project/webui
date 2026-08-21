import { MatDialogRef } from '@angular/material/dialog';
import {
  Component, AfterViewChecked, ViewChild, ElementRef, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { WebSocketService } from '../../../../services';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'consolepanel-dialog',
  styleUrls: [
    '../../../../pages/common/entity/entity-form/components/dynamic-field/dynamic-field.css',
    './consolepanel-dialog.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './consolepanel-dialog.component.html',
})
export class ConsolePanelModalDialog {
  refreshMsg: String = 'Check to stop refresh';
  intervalPing;
  consoleMsg: String = 'Loading...';
  @ViewChild('footerBarScroll', { static: true }) private footerBarScroll: ElementRef;
  onEventEmitter = new EventEmitter();

  constructor(
    protected translate: TranslateService,
    public dialogRef: MatDialogRef<ConsolePanelModalDialog>,
  ) { }

  ngOnInit() {
    this.getLogConsoleMsg();
  }

  ngAfterViewChecked() {
  }

  scrollToBottomOnFooterBar(): void {
    try {
      this.footerBarScroll.nativeElement.scrollTop = this.footerBarScroll.nativeElement.scrollHeight;
    } catch (err) { }
  }

  getLogConsoleMsg() {
    this.intervalPing = setInterval(() => {
      let isScrollBottom = false;
      const delta = 3;

      if (this.footerBarScroll.nativeElement.scrollTop + this.footerBarScroll.nativeElement.offsetHeight + delta >= this.footerBarScroll.nativeElement.scrollHeight) {
        isScrollBottom = true;
      }
      this.onEventEmitter.emit();
      if (isScrollBottom) {
        const timeout = setTimeout(() => {
          this.scrollToBottomOnFooterBar();
          clearTimeout(timeout);
        }, 500);
      }
    }, 1000);

    // First, will load once.
    const timeout = setTimeout(() => {
      this.scrollToBottomOnFooterBar();
      clearTimeout(timeout);
    }, 1500);
  }

  // the internal development record: the #394 row's hlm-checkbox emits the boolean itself (checkedChange).
  onStopRefresh(checked: boolean) {
    if (checked) {
      clearInterval(this.intervalPing);
      this.refreshMsg = 'Uncheck to restart refresh';
    } else {
      this.getLogConsoleMsg();
      this.refreshMsg = 'Check to stop refresh';
    }
  }
}
