import { ChangeDetectionStrategy, Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { escape } from 'lodash';
import { of, Subject, TimeoutError } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap, timeout } from 'rxjs/operators';
import { DialogService, WebSocketService } from '../../../services';
import { T } from '../../../translate-marker';
import { EntityJobComponent } from '../../common/entity/entity-job/entity-job.component';
import { EntityTableAction, InputTableConf } from '../../common/entity/entity-table/entity-table.component';
import { bastilleJob } from './bastille-job';
import { openBastilleSettings } from './bastille-settings';

/**
 * One row of bastille.query. The fields the internal development record added are optional so
 * an older middleware still renders the static columns.
 */
export interface BastilleJail {
  name: string;
  state: 'up' | 'down' | 'UNKNOWN';
  release: string | null;
  ip4_addr: string;
  ip6_addr?: string;
  boot: boolean | null;
  jid?: number | null;
  disk_used?: number | null;
  address_source?: 'live' | 'config';
  operable?: boolean;
  running_error?: string | null;
  validation_error?: string | null;
  interface?: string;
  path?: string;
}


// the internal development record: the GUI observes Bastille; the CLI configures each jail. The
// service is configured through Bastille Settings. the internal development record ports #422's
// per-jail Start, Restart and Stop actions, backed by the internal development record jobs.
@Component({
  standalone: false,
  selector: 'app-bastille-management',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './bastille-management.component.html',
  styleUrls: ['./bastille-management.component.scss'],
})
export class BastilleManagementComponent implements InputTableConf, OnDestroy {
  @ViewChild('logDialog') logDialog: TemplateRef<unknown>;
  title = T('Bastille Jails');
  queryCall = 'bastille.query';
  rowIdentifier = 'name';
  autoFillWindowHeight = true;
  // the internal development record: the same shape as the iocage list (the 13.3 jail list): JID, Name, State
  // and Release visible; Boot, IPv4 and IPv6 in the row details. The live CPU / memory / process
  // figures live on the dashboard's Guests card, not in a jail list.
  columns = [
    { name: T('JID'), prop: 'jid' },
    { name: T('Name'), prop: 'name', always_display: true },
    { name: T('Boot'), prop: 'boot_label', hidden: true },
    { name: T('State'), prop: 'state_label' },
    { name: T('Release'), prop: 'release' },
    { name: T('IPv4'), prop: 'ip4_addr', hidden: true },
    { name: T('IPv6'), prop: 'ip6_addr', hidden: true },
  ];
  sortKey = 'name'; // the twin sorts by name (its deleteMsg key); JID first must not become the sort
  config = { paging: true, sorting: { columns: this.columns }, multiSelect: false };
  // The cog is a menu (the mechanism the internal development record added) so the page is left the
  // way it was entered: Jails page → cog → Bastille Jails → cog → iocage Jails.
  globalConfig = {
    id: 'bastille-config',
    tooltip: T('Settings'),
    actions: [
      { id: 'settings', label: T('Bastille Settings'), onClick: () => this.configureBastille() },
      { id: 'iocage', label: T('iocage Jails'), onClick: () => this.router.navigate(['/jails']) },
    ],
  };
  custActions = [
    { id: 'refresh', name: T('Refresh'), function: () => this.refresh() },
    { id: 'releases', name: T('Releases'), function: () => this.router.navigate(['/jails', 'bastille', 'releases']) },
  ];
  serviceConfig: any;
  jails: BastilleJail[] = [];
  entityList: any;
  loading = false;
  busy = false;
  error = '';
  logName = '';
  logContent = '';
  logTruncated = false;
  logError = '';
  logsLoading = false;
  private jobDialog: MatDialogRef<EntityJobComponent>;
  private logDialogRef: MatDialogRef<unknown>;
  private preserveError = false;
  private destroyed = new Subject<void>();

  constructor(
    private ws: WebSocketService,
    private dialog: DialogService,
    private matDialog: MatDialog,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnDestroy(): void {
    // Unsubscribing stops progress tracking, not the server-side job.
    this.busy = false;
    this.destroyed.next();
    this.destroyed.complete();
    this.jobDialog?.close();
    this.logDialogRef?.close();
  }

  get ready(): boolean {
    return !!(this.serviceConfig?.installed && this.serviceConfig?.configured && this.serviceConfig?.configuration_valid);
  }

  get status(): string {
    if (!this.serviceConfig) { return ''; }
    if (!this.serviceConfig.installed) { return T('The supported Bastille package is unavailable.'); }
    if (!this.serviceConfig.configured) { return T('Select a data pool in Bastille Settings.'); }
    if (!this.serviceConfig.configuration_valid) {
      return this.serviceConfig.configuration_error || T('Bastille configuration needs attention.');
    }
    if (this.serviceConfig.running_jails_error) { return this.serviceConfig.running_jails_error; }
    if (!this.loading && !this.error && this.jails.length === 0) {
      return T('No Bastille jails yet. Create one on the console with the bastille command; it appears here after Refresh.');
    }
    return '';
  }

  isCustActionVisible(id: string): boolean {
    return id !== 'releases' || this.ready;
  }

  callGetFunction(entity: any): void {
    this.entityList = entity;
    this.loading = true;
    const retainedError = this.preserveError ? this.error : '';
    this.preserveError = false;
    entity.getFunction = this.ws.call('bastille.config').pipe(
      tap(() => { this.error = retainedError; }),
      switchMap((config: any) => {
        this.serviceConfig = config;
        return this.ready ? this.ws.call('bastille.query', [[], {}]) : of([]);
      }),
      tap((jails: BastilleJail[]) => { this.jails = jails; }),
      catchError((error) => {
        this.error = [retainedError, this.describeError(error)].filter(Boolean).join('\n');
        this.serviceConfig = undefined;
        this.jails = [];
        return of([]);
      }),
      takeUntil(this.destroyed),
      finalize(() => { this.loading = false; }),
    );
    entity.callGetFunction();
  }

  /** By name, as the iocage list sorts (the internal development record); State is a sortable column. */
  resourceTransformIncomingRestData(jails: BastilleJail[]): any[] {
    return jails.map((jail) => this.decorate(jail)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  private decorate(jail: BastilleJail): any {
    // The raw state the iocage list shows (up / down / UNKNOWN). A CLI-created jail is the ordinary
    // case now, so the ownership reasons an older middleware attaches to one are not a detail worth
    // showing. A jail that cannot be observed at all still says why.
    const detail = jail.running_error || (jail.operable === false ? jail.validation_error : '') || '';
    const address = (value: string | null | undefined, auto: string): string => (value || '')
      .split(',').map((part) => part.trim()).filter(Boolean)
      .map((part) => (part.includes('|') ? part.split('|').pop() : part))
      .map((part) => (part === auto ? 'Auto' : part))
      .join(', ');
    return {
      ...jail,
      state_label: detail ? `${jail.state} — ${detail}` : jail.state,
      boot_label: jail.boot === null || jail.boot === undefined ? this.translate.instant(T('Unknown')) : jail.boot ? 'on' : 'off',
      ip4_addr: address(jail.ip4_addr, ''), // the twin strips the interface: `vnet0|192.0.2.51/24` reads 192.0.2.51/24
      ip6_addr: address(jail.ip6_addr, 'SLAAC'),
    };
  }

  refresh(): void {
    if (!this.busy && !this.loading) { this.entityList?.getData(); }
  }

  configureBastille(): void {
    if (this.loading || this.busy) { return; }
    this.loading = true;
    openBastilleSettings(this.ws, this.dialog, this.router).pipe(
      takeUntil(this.destroyed),
      finalize(() => { this.loading = false; }),
    ).subscribe({
      next: (settings) => {
        this.loading = false;
        this.runJob('bastille.configure', [settings], T('Configuring Bastille'));
      },
      error: (error) => { this.error = this.describeError(error); },
    });
  }

  canObserve(jail: BastilleJail): boolean {
    return this.ready && !this.loading && jail.operable !== false;
  }

  /** Console Log reads; the iocage lifecycle actions use the internal development record jobs. */
  getActions(jail: BastilleJail): EntityTableAction[] {
    return [
      { id: 'logs', icon: 'description', label: T('Console Log'), onClick: () => this.showLogs(jail) },
      { id: 'start', icon: 'play_arrow', label: T('Start'), onClick: () => this.runLifecycle(jail, 'start') },
      { id: 'restart', icon: 'cached', label: T('Restart'), onClick: () => this.runLifecycle(jail, 'restart') },
      { id: 'stop', icon: 'stop', label: T('Stop'), onClick: () => this.confirmStop(jail) },
    ];
  }

  /** The iocage rule: no Start on a running jail, no Stop or Restart on a stopped one. */
  isActionVisible(action: string, jail: BastilleJail): boolean {
    if (!this.canObserve(jail)) { return false; }
    switch (action) {
      case 'logs': return true;
      case 'start': return jail.state !== 'up';
      case 'stop':
      case 'restart': return jail.state !== 'down';
      default: return false;
    }
  }

  runLifecycle(jail: BastilleJail, action: 'start' | 'stop' | 'restart'): void {
    if (!this.canObserve(jail)) { return; }
    const title = { start: T('Starting '), stop: T('Stopping '), restart: T('Restarting ') }[action];
    this.runJob(`bastille.${action}`, [jail.name], this.translate.instant(title) + jail.name);
  }

  confirmStop(jail: BastilleJail): void {
    if (!this.canObserve(jail)) { return; }
    this.dialog.confirm(T('Stop Jail'), this.translate.instant(T('Stop ')) + jail.name + '?', true, T('Stop')).pipe(
      takeUntil(this.destroyed),
    ).subscribe((confirmed) => {
      if (confirmed) { this.runLifecycle(jail, 'stop'); }
    });
  }

  showLogs(jail: BastilleJail): void {
    if (!this.canObserve(jail) || this.logsLoading) { return; }
    this.logName = jail.name;
    this.logDialogRef = this.matDialog.open(this.logDialog, { width: '800px' });
    this.refreshLogs();
  }

  refreshLogs(): void {
    if (this.logsLoading) { return; }
    this.logsLoading = true;
    this.logContent = '';
    this.logError = '';
    this.logTruncated = false;
    this.ws.call('bastille.logs', [this.logName, 65536]).pipe(
      timeout(15000),
      takeUntil(this.logDialogRef.afterClosed()),
      takeUntil(this.destroyed), finalize(() => { this.logsLoading = false; }),
    ).subscribe({
      next: (result: any) => { this.logContent = result.content; this.logTruncated = result.truncated; },
      error: (error) => {
        this.logError = error instanceof TimeoutError
          ? T('The console log request timed out. Bastille may be busy. Try Refresh when the current operation finishes.')
          : this.describeError(error);
      },
    });
  }

  private runJob(method: string, args: any[], title: string): void {
    if (this.busy || this.loading || (!this.ready && method !== 'bastille.configure')) { return; }
    this.busy = true;
    this.error = '';
    const ref = this.jobDialog = this.matDialog.open(EntityJobComponent, { data: { title }, disableClose: true });
    const view = ref.componentInstance;
    view.job = { state: 'RUNNING' };
    // Keep the standard job dialog, including RPC transport errors that do not produce a job result.
    const failed = (message: string, refreshState = false) => {
      this.busy = false;
      this.serviceConfig = undefined;
      this.error = message;
      view.job = { state: 'FAILED' };
      view.setDescription(escape(message));
      view.showCloseButton = true;
      if (refreshState) {
        this.preserveError = true;
        this.entityList?.getData();
      }
    };
    bastilleJob(this.ws, method, args).pipe(takeUntil(this.destroyed)).subscribe({
      next: (job: any) => {
        view.job = job;
        view.progressTotalPercent = Math.max(0, Math.min(100, job.progress?.percent || 0));
        view.setDescription(escape(job.progress?.description || ''));
        if (job.state === 'SUCCESS') {
          this.busy = false;
          this.refresh();
          ref.close(true);
        } else if (['FAILED', 'ABORTED'].includes(job.state)) {
          failed(job.state === 'ABORTED' ? T('The operation was aborted.') : this.describeError(job), true);
        }
      },
      error: (error) => failed(this.describeError(error)),
      complete: () => {
        if (this.busy) { failed(T('Unable to read the job status. Check Jobs before retrying.')); }
      },
    });
  }

  private describeError(error: any): string {
    return error?.reason || error?.message || error?.error || T('Unable to complete the Bastille operation.');
  }
}
