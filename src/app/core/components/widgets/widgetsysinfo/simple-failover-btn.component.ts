import {
  Component, Input, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { helptext_system_failover } from 'app/helptext/system/failover';
import { DialogService } from 'app/services/dialog.service';

// the internal development record: the private SimpleFailoverBtnDialog went. It was the
// shared ConfirmDialog's twin (title, message, Confirm checkbox, Cancel,
// Failover), so the button asks DialogService.confirm the same question and
// navigates on true exactly as before.
@Component({
  standalone: false,
  selector: 'simple-failover-button',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<button type="button" hlmBtn variant="outline" [disabled]="disabled" (click)="openDialog()"
    ix-auto ix-auto-type="button" ix-auto-identifier="INITIATE FAILOVER">{{ 'INITIATE FAILOVER' | translate }}</button>`,
})

export class SimpleFailoverBtnComponent implements OnDestroy {
  @Input() color = 'default';
  @Input() disabled?: boolean = false;
  constructor(
    private dialogService: DialogService,
    private router: Router,
    public translate: TranslateService,
  ) {}

  afterInit() {
  }

  openDialog(): void {
    this.dialogService.confirm({
      title: helptext_system_failover.dialog_initiate_failover_title,
      message: helptext_system_failover.dialog_initiate_failover_message,
      buttonMsg: helptext_system_failover.dialog_initiate_action,
      cancelMsg: helptext_system_failover.dialog_initiate_cancel,
    }).subscribe((res) => {
      if (res) {
        this.router.navigate(['/others/reboot'], { skipLocationChange: true });
      }
    });
  }

  ngOnDestroy() {
  }
}
