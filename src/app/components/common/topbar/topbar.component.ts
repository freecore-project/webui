import {
  Component, EventEmitter, Input, OnDestroy, OnInit, Output,
} from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ViewControllerComponent } from 'app/core/components/viewcontroller/viewcontroller.component';
import { CoreEvent } from 'app/core/services/core.service';
import { Subscription, interval, Subject } from 'rxjs';
import * as domHelper from '../../../helpers/dom.helper';
import network_interfaces_helptext from '../../../helptext/network/interfaces/interfaces-list';
import helptext from '../../../helptext/topbar';
import { EntityJobComponent } from '../../../pages/common/entity/entity-job/entity-job.component';
import { EntityUtils } from '../../../pages/common/entity/utils';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DialogService } from '../../../services/dialog.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationAlert, NotificationsService } from '../../../services/notifications.service';
import { SystemGeneralService } from '../../../services/system-general.service';
import { Theme, ThemeService } from '../../../services/theme/theme.service';
import { WebSocketService } from '../../../services/ws.service';
import { T } from '../../../translate-marker';
import { AboutModalDialog } from '../dialog/about/about-dialog.component';
import { DirectoryServicesMonitorComponent } from '../dialog/directory-services-monitor/directory-services-monitor.component';
import { TaskManagerComponent } from '../dialog/task-manager/task-manager.component';
import { DialogFormConfiguration } from '../../../pages/common/entity/entity-dialog/dialog-form-configuration.interface';
import { ResilverProgressDialogComponent } from '../dialog/resilver-progress/resilver-progress.component';

@Component({
  selector: 'topbar',
  styleUrls: ['./topbar.component.css'],
  templateUrl: './topbar.template.html',
  })
export class TopbarComponent extends ViewControllerComponent implements OnInit, OnDestroy {
  @Input() sidenav;
  @Input() notificPanel;

  notifications: NotificationAlert[] = [];
  @Output() onLangChange = new EventEmitter<any>();

  interval: any;
  updateIsDone: Subscription;

  showResilvering = false;
  pendingNetworkChanges = false;
  waitingNetworkCheckin = false;
  resilveringDetails;
  themesMenu: Theme[] = this.themeService.themesMenu;
  currentTheme = 'ix-blue';
  createThemeLabel = 'Create Theme';
  isTaskMangerOpened = false;
  isDirServicesMonitorOpened = false;
  taskDialogRef: MatDialogRef<TaskManagerComponent>;
  dirServicesMonitor: MatDialogRef<DirectoryServicesMonitorComponent>;
  dirServicesStatus = [];
  showDirServicesIcon = false;
  hostname: string;
  showWelcome: boolean;
  checkin_remaining: any;
  checkin_interval: any;
  updateIsRunning = false;
  systemWillRestart = false;
  updateNotificationSent = false;
  private user_check_in_prompted = false;
  mat_tooltips = helptext.mat_tooltips;
  systemType: string;
  isWaiting = false;
  target: Subject<CoreEvent> = new Subject();

  protected dialogRef: any;

  constructor(
    public themeService: ThemeService,
    private router: Router,
    private notificationsService: NotificationsService,
    private ws: WebSocketService,
    public language: LanguageService,
    private dialogService: DialogService,
    public sysGenService: SystemGeneralService,
    public dialog: MatDialog,
    public translate: TranslateService,
    protected loader: AppLoaderService,
  ) {
    super();
    this.sysGenService.updateRunningNoticeSent.subscribe(() => {
      this.updateNotificationSent = true;
    });
  }

  ngOnInit() {
    // the internal development record: this fork is CORE-only and ships no HA -- failover/fenced
    // live in the enterprise overlay, absent from the CORE plugin set
    // (the internal development record). product_type is always CORE here, so the ENTERPRISE arm
    // that set is_ha / sysName and called checkEULA() could never run.
    window.localStorage.setItem('alias_ips', '0');
    this.ws.subscribe('core.get_jobs').subscribe((res) => {
      if (res && res.fields.method === 'update.update') {
        this.updateIsRunning = true;
        if (res.fields.state === 'FAILED' || res.fields.state === 'ABORTED') {
          this.updateIsRunning = false;
          this.systemWillRestart = false;
        }

        if (res && res.fields && res.fields.arguments[0] && res.fields.arguments[0].reboot) {
          this.systemWillRestart = true;
          if (res.fields.state === 'SUCCESS') {
            this.router.navigate(['/others/reboot'], { skipLocationChange: true });
          }
        }

        if (!this.updateNotificationSent) {
          this.updateInProgress();
          this.updateNotificationSent = true;
        }
      }
    });
    const theme = this.themeService.currentTheme();
    this.currentTheme = theme.name;
    this.core.register({ observerClass: this, eventName: 'ThemeListsChanged' }).subscribe((evt: CoreEvent) => {
      this.themesMenu = this.themeService.themesMenu;
    });

    const notifications = this.notificationsService.getNotificationList();

    notifications.forEach((notificationAlert: NotificationAlert) => {
      if (notificationAlert.dismissed === false && notificationAlert.level !== 'INFO') {
        this.notifications.push(notificationAlert);
      }
    });
    this.notificationsService.getNotifications().subscribe((notifications1) => {
      this.notifications = [];
      notifications1.forEach((notificationAlert: NotificationAlert) => {
        if (notificationAlert.dismissed === false && notificationAlert.level !== 'INFO') {
          this.notifications.push(notificationAlert);
        }
      });
    });
    this.checkNetworkChangesPending();
    this.checkNetworkCheckinWaiting();
    this.getDirServicesStatus();
    this.core.register({ observerClass: this, eventName: 'NetworkInterfacesChanged' }).subscribe((evt: CoreEvent) => {
      if (evt && evt.data.commit) {
        this.pendingNetworkChanges = false;
        this.checkNetworkCheckinWaiting();
      } else {
        this.checkNetworkChangesPending();
      }
      if (evt && evt.data.checkin) {
        if (this.checkin_interval) {
          clearInterval(this.checkin_interval);
        }
      }
    });

    this.core.register({
      observerClass: this,
      eventName: 'Resilvering',
    }).subscribe((evt: CoreEvent) => {
      if (evt.data.scan.state == 'FINISHED') {
        this.showResilvering = false;
        this.resilveringDetails = '';
      } else {
        this.resilveringDetails = evt.data;
        this.showResilvering = true;
      }
    });

    this.core.register({
      observerClass: this,
      eventName: 'SysInfo',
    }).subscribe((evt: CoreEvent) => {
      this.hostname = evt.data.hostname;
    });

    this.ws.call('system.product_type').subscribe((res) => {
      this.systemType = res;
    });

    this.core.emit({ name: 'SysInfoRequest', sender: this });

    this.core.register({ observerClass: this, eventName: 'UserPreferences' }).subscribe((evt: CoreEvent) => {
      this.preferencesHandler(evt);
    });
    this.core.register({ observerClass: this, eventName: 'UserPreferencesReady' }).subscribe((evt: CoreEvent) => {
      this.preferencesHandler(evt);
    });
    this.core.emit({ name: 'UserPreferencesRequest', sender: this });
  }

  preferencesHandler(evt: CoreEvent) {
    if (this.isWaiting) {
      this.target.next({ name: 'SubmitComplete', sender: this });
      this.isWaiting = false;
    }
  }

  ngOnDestroy() {
    if (typeof (this.interval) !== 'undefined') {
      clearInterval(this.interval);
    }

    this.ws.unsubscribe('failover.disabled_reasons');

    this.core.unregister({ observerClass: this });
  }

  toggleNotific() {
    this.notificPanel.toggle();
  }

  toggleSidenav() {
    this.sidenav.toggle();
    this.core.emit({ name: 'SidenavStatus', data: { isOpen: this.sidenav.opened, mode: this.sidenav.mode, isCollapsed: this.getCollapsedState() }, sender: this });
  }

  toggleCollapse() {
    const appBody = document.body;

    domHelper.toggleClass(appBody, 'collapsed-menu');
    domHelper.removeClass(document.getElementsByClassName('has-submenu'), 'open');
    this.core.emit({ name: 'SidenavStatus', data: { isOpen: this.sidenav.opened, mode: this.sidenav.mode, isCollapsed: this.getCollapsedState() }, sender: this });
  }

  // the internal development record: topbar identity mark follows the active theme, like the sidenav's.
  get mascot(): string {
    return this.themeService.currentTheme()?.mascot || 'FreeCORE_mascot.png';
  }

  getCollapsedState(): boolean {
    const isCollapsed = document.getElementsByClassName('collapsed-menu').length == 1;
    return isCollapsed;
  }

  onShowAbout() {
    this.dialog.open(AboutModalDialog, {
      maxWidth: '600px',
      data: {
        extraMsg: this.showWelcome,
        systemType: this.systemType,
      },
      disableClose: true,
    });
  }

  signOut() {
    this.ws.logout();
  }

  onShutdown() {
    this.translate.get('Shut down').subscribe((shutdown: string) => {
      this.translate.get('Shut down the system?').subscribe((shutdown_prompt: string) => {
        this.dialogService.confirm({
          title: shutdown,
          message: shutdown_prompt,
          hideCheckBox: false,
          buttonMsg: T('Shut Down'),
        }).subscribe((res) => {
          if (res) {
            this.router.navigate(['/others/shutdown'], { skipLocationChange: true });
          }
        });
      });
    });
  }

  onReboot() {
    this.translate.get('Restart').subscribe((reboot: string) => {
      this.translate.get('Restart the system?').subscribe((reboot_prompt: string) => {
        this.dialogService.confirm(reboot, reboot_prompt, false, T('Restart')).subscribe((res) => {
          if (res) {
            this.router.navigate(['/others/reboot'], { skipLocationChange: true });
          }
        });
      });
    });
  }

  checkNetworkChangesPending() {
    this.ws.call('interface.has_pending_changes').subscribe((res) => {
      this.pendingNetworkChanges = res;
    });
  }

  checkNetworkCheckinWaiting() {
    this.ws.call('interface.checkin_waiting').subscribe((res) => {
      if (res != null) {
        const seconds = res;
        if (seconds > 0 && this.checkin_remaining == null) {
          this.checkin_remaining = seconds;
          this.checkin_interval = setInterval(() => {
            if (this.checkin_remaining > 0) {
              this.checkin_remaining -= 1;
            } else {
              this.checkin_remaining = null;
              clearInterval(this.checkin_interval);
              window.location.reload(); // should just refresh after the timer goes off
            }
          }, 1000);
        }
        this.waitingNetworkCheckin = true;
        if (!this.user_check_in_prompted) {
          this.user_check_in_prompted = true;
          this.showNetworkCheckinWaiting();
        }
      } else {
        this.waitingNetworkCheckin = false;
        if (this.checkin_interval) {
          clearInterval(this.checkin_interval);
        }
      }
    });
  }

  showNetworkCheckinWaiting() {
    // only popup dialog if not in network/interfaces page
    if (this.router.url !== '/network/interfaces') {
      this.dialogService.confirm(
        network_interfaces_helptext.checkin_title,
        network_interfaces_helptext.pending_checkin_dialog_text,
        true, network_interfaces_helptext.checkin_button,
      ).subscribe((res) => {
        if (res) {
          this.user_check_in_prompted = false;
          this.loader.open();
          this.ws.call('interface.checkin').subscribe((success) => {
            this.core.emit({ name: 'NetworkInterfacesChanged', data: { commit: true, checkin: true }, sender: this });
            this.loader.close();
            this.dialogService.report(
              network_interfaces_helptext.checkin_complete_title,
              network_interfaces_helptext.checkin_complete_message,
              '500px', 'info',
            );
            this.waitingNetworkCheckin = false;
          }, (err) => {
            this.loader.close();
            new EntityUtils().handleWSError(null, err, this.dialogService);
          });
        }
      });
    }
  }

  showNetworkChangesPending() {
    if (this.waitingNetworkCheckin) {
      this.showNetworkCheckinWaiting();
    } else {
      this.dialogService.confirm(
        network_interfaces_helptext.pending_changes_title,
        network_interfaces_helptext.pending_changes_message,
        true, T('Continue'),
      ).subscribe((res) => {
        if (res) {
          this.router.navigate(['/network/interfaces']);
        }
      });
    }
  }

  showResilveringDetails() {
    this.dialogRef = this.dialog.open(ResilverProgressDialogComponent);
  }

  onShowTaskManager() {
    if (this.isTaskMangerOpened) {
      this.taskDialogRef.close(true);
    } else {
      this.isTaskMangerOpened = true;
      this.taskDialogRef = this.dialog.open(TaskManagerComponent, {
        disableClose: false,
        width: '400px',
        hasBackdrop: true,
        position: {
          top: '48px',
          right: '0px',
        },
      });
    }

    this.taskDialogRef.afterClosed().subscribe(
      (res) => {
        this.isTaskMangerOpened = false;
      },
    );
  }

  onShowDirServicesMonitor() {
    if (this.isDirServicesMonitorOpened) {
      this.dirServicesMonitor.close(true);
    } else {
      this.isDirServicesMonitorOpened = true;
      this.dirServicesMonitor = this.dialog.open(DirectoryServicesMonitorComponent, {
        disableClose: false,
        width: '400px',
        hasBackdrop: true,
        position: {
          top: '48px',
          right: '0px',
        },
      });
    }

    this.dirServicesMonitor.afterClosed().subscribe(
      (res) => {
        this.isDirServicesMonitorOpened = false;
      },
    );
  }

  getDirServicesStatus() {
    this.ws.call('directoryservices.get_state').subscribe((res) => {
      for (const i in res) {
        this.dirServicesStatus.push(res[i]);
      }
      this.showDSIcon();
    });
    this.ws.subscribe('directoryservices.status').subscribe((res) => {
      this.dirServicesStatus = [];
      for (const i in res.fields) {
        this.dirServicesStatus.push(res.fields[i]);
      }
      this.showDSIcon();
    });
  }

  showDSIcon() {
    this.showDirServicesIcon = false;
    this.dirServicesStatus.forEach((item) => {
      if (item !== 'DISABLED') {
        this.showDirServicesIcon = true;
      }
    });
  }

  updateInProgress() {
    this.sysGenService.updateRunning.emit('true');
    if (!this.updateNotificationSent) {
      this.showUpdateDialog();
      this.updateNotificationSent = true;
    }
  }

  showUpdateDialog() {
    // the internal development record: was `this.is_ha || !this.systemWillRestart`. is_ha was
    // permanently false on this CORE-only fork, so the condition reduces to the
    // systemWillRestart arm with no behaviour change.
    const message = !this.systemWillRestart ? helptext.updateRunning_dialog.message
      : helptext.updateRunning_dialog.message + helptext.updateRunning_dialog.message_pt2;
    this.dialogService.confirm(helptext.updateRunning_dialog.title,
      message,
      true, T('Close'), false, '', '', '', '', true);
  }
}
