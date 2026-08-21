import { MatDialog } from '@angular/material/dialog';
import { escape } from 'lodash';
import { EntityJobComponent } from '../common/entity/entity-job/entity-job.component';
import { T } from '../../translate-marker';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of, Subscription } from 'rxjs';
import { finalize, switchMap, take } from 'rxjs/operators';

import { WebSocketService } from '../../services/ws.service';
import {
  ApplicationReconfigurePayload,
  OwnedDataset,
  ApplicationCatalogDetail,
  ApplicationCatalogEntry,
  ApplicationCatalogInstallPayload,
  ApplicationImportPayload,
  ApplicationInstallPayload,
  ApplicationJobState,
  ApplicationPool,
  ApplicationsConfig,
  ApplicationsExperimentalFlags,
  ApplicationsProvider,
  CertificateChoice,
  ComposeImportResult,
  ConvertDetection,
  ConvertPlan,
  ConvertPortChoice,
  ConvertSource,
  ExportPlan,
  ExportRunOptions,
  InstalledApplication,
  ApplicationNetwork,
} from './applications.types';

import { applicationsJob } from './applications-job';

const DEFAULT_SUBNET = '10.88.0.0/16';

// the internal development record: containers log in colour (s6, Node, Go loggers); the panel is a
// <pre>, so the escape sequences came out as text. Strip CSI and other ESC sequences;
// the middleware keeps returning exactly what the container wrote.
export function stripAnsi(text: string): string {
  if (typeof text !== 'string') { return text; }
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g, '');
}

/** the internal development record: the network block a payload carries, normalized. */
export function applicationNetworkPayload(network?: ApplicationNetwork | null): ApplicationNetwork {
  if (!network || network.mode !== 'lan') { return { mode: 'managed' }; }
  return {
    mode: 'lan',
    interface: network.interface || null,
    address: (network.address || '').trim() || null,
    gateway: (network.gateway || '').trim() || null,
    // the internal development record: the flag travels; the assigned address never does.
    managed_access: !!network.managed_access,
  };
}

@Injectable()
export class ApplicationsStore {
  config: ApplicationsConfig = null;
  providers: ApplicationsProvider[] = [];
  catalog: ApplicationCatalogEntry[] = [];
  // the internal development record: null means no core response yet; table subscribers live until the tab is destroyed.
  readonly installed$ = new BehaviorSubject<InstalledApplication[] | null>(null);
  get installed(): InstalledApplication[] { return this.installed$.value || []; }
  set installed(applications: InstalledApplication[]) { this.installed$.next(applications); }
  /** the internal development record: app-owned datasets no installed application maps. */
  orphans: OwnedDataset[] = [];
  pools: ApplicationPool[] = [];
  selectedDetail: ApplicationCatalogDetail = null;
  catalogLoading = false;
  coreLoading = false;
  detailLoading = false;
  providerError = '';
  coreError = '';
  detailError = '';
  operationError = '';
  activeJob: ApplicationJobState = null;
  logs = '';
  logsApplication = '';
  private logsRequestId = 0;

  constructor(private ws: WebSocketService, private matDialog: MatDialog) {}

  load(): void {
    this.loadCore();
    this.loadCatalog();
  }

  loadCore(): void {
    this.coreLoading = true;
    this.coreError = '';
    forkJoin({
      config: this.ws.call('applications.config'),
      installed: this.ws.call('applications.query', [[], {}]),
      pools: this.ws.call('pool.query', [[], {}]),
    }).subscribe(({ config, installed, pools }) => {
      this.config = config;
      this.pools = pools.filter((pool) => (
        pool.status === 'ONLINE' && pool.healthy && pool.is_decrypted
      ));
      this.coreLoading = false;
      this.installed = installed;
    }, (error) => {
      this.coreError = this.errorMessage(error);
      this.coreLoading = false;
      this.installed$.next(this.installed);
    });
    this.loadOrphans();
  }

  /** Its own call, so a middleware without it (or a store without a pool) never breaks the page. */
  loadOrphans(): void {
    this.ws.call('applications.orphaned_data').subscribe(
      (orphans: OwnedDataset[]) => { this.orphans = Array.isArray(orphans) ? orphans : []; },
      () => { this.orphans = []; },
    );
  }

  /** What a Remove keeps and what an install under this name reattaches (the internal development record). */
  ownedDatasets(name: string): Observable<OwnedDataset[]> {
    return this.ws.call('applications.owned_datasets', [name]);
  }

  /**
   * the internal development record: the certificates that may be mounted into an application.
   * Its own call, so a middleware without it never breaks the form. The query names the fields
   * the entry binds to and the ones that say whether a certificate is usable: unselected, it
   * returns every certificate's private key, and this page has no use for one.
   */
  certificateChoices(): Observable<CertificateChoice[]> {
    return this.ws.call('certificate.query', [[], {
      select: ['id', 'name', 'fingerprint', 'until', 'revoked', 'cert_type_CSR', 'key_length', 'chain_list'],
    }]);
  }

  /** the internal development record: the host interfaces a LAN attachment may join. */
  interfaceChoices(): Observable<Record<string, string>> {
    return this.ws.call('interface.choices', [{ exclude: ['epair', 'tap', 'vnet', 'lo', 'pflog'] }]);
  }

  reconfigure(payload: ApplicationReconfigurePayload): void {
    this.runApplicationJob('applications.reconfigure', [payload], T('Edit Application'));
  }

  pruneData(): void {
    this.runApplicationJob('applications.prune', [{ data: true }], T('Delete Orphaned Data'));
  }

  loadCatalog(force = false): void {
    if (force && this.activeJob) { return; }
    this.catalogLoading = true;
    this.providerError = '';
    const catalogCall = force
      ? this.ws.call('applications.catalog.refresh')
      : this.ws.call('applications.catalog.query', [[], {}]);
    forkJoin({
      providers: this.ws.call('applications.catalog.providers'),
      catalog: catalogCall,
    }).subscribe(({ providers, catalog }) => {
      this.providers = providers;
      this.catalog = catalog;
      const staleEntry = catalog.find((entry) => entry.provider_error);
      this.providerError = staleEntry ? staleEntry.provider_error : '';
      this.catalogLoading = false;
    }, (error) => {
      this.providerError = this.errorMessage(error);
      this.catalogLoading = false;
    });
  }

  reviewCatalog(entry: ApplicationCatalogEntry, refresh = false): Observable<ApplicationCatalogDetail> {
    this.detailLoading = true;
    this.detailError = '';
    return new Observable((observer) => {
      this.ws.call('applications.catalog.details', [entry.id, { refresh }]).subscribe((detail) => {
        this.selectedDetail = detail;
        this.detailLoading = false;
        observer.next(detail);
        observer.complete();
      }, (error) => {
        this.detailError = this.errorMessage(error);
        this.detailLoading = false;
        observer.error(error);
      });
    });
  }

  reviewReplacement(application: InstalledApplication): Observable<ApplicationCatalogDetail> {
    this.detailLoading = true;
    this.detailError = '';
    return this.ws.call('applications.catalog.details', [application.catalog.id, { refresh: true }]).pipe(
      finalize(() => { this.detailLoading = false; }),
    );
  }

  replace(application: InstalledApplication, detail: ApplicationCatalogDetail, recreate: boolean): void {
    this.runApplicationJob('applications.catalog.update', [{
      id: detail.id,
      compose_sha256: detail.catalog.compose_sha256,
      name: application.name,
      recreate,
    }], recreate ? T('Recreate Application') : T('Update Application'));
  }

  clearReview(): void {
    this.selectedDetail = null;
    this.detailError = '';
  }

  /**
   * the internal development record: the configure call carries both experimental flags.
   * When the caller does not name them they repeat the current configuration, so
   * a plain pool or subnet change never flips a lane on or off.
   */
  configurePayload(pool: string, subnet: string, flags?: Partial<ApplicationsExperimentalFlags>): any {
    return {
      pool,
      subnet,
      linux_compat_enabled: flags?.linux_compat_enabled ?? this.config?.linux_compat_enabled ?? false,
      convert_enabled: flags?.convert_enabled ?? this.config?.convert_enabled ?? false,
    };
  }

  configure(pool: string, subnet = DEFAULT_SUBNET, flags?: Partial<ApplicationsExperimentalFlags>): void {
    if (this.activeJob) { return; }
    this.operationError = '';
    this.finalJob(
      'applications.configure', [this.configurePayload(pool, subnet, flags)], T('Configure Applications'),
    ).subscribe(() => {
      this.activeJob = null;
      this.loadCore();
    }, (error) => {
      this.operationError = this.errorMessage(error);
      this.activeJob = null;
      this.loadCore();
    });
  }

  install(
    payload: ApplicationInstallPayload,
    pool: string,
    subnet = DEFAULT_SUBNET,
    detail: ApplicationCatalogDetail = null,
    // the internal development record: the page's after-install step (the Installed tab), run once the job dialog
    // closed and before the reload; never on failure.
    onSuccess?: () => void,
  ): void {
    if (this.activeJob) { return; }
    this.operationError = '';
    if (!detail || !detail.catalog_app || !detail.catalog || !detail.catalog.compose_sha256) {
      this.operationError = 'Review the current catalog entry before installing it.';
      return;
    }
    const request: ApplicationCatalogInstallPayload = {
      id: detail.id,
      compose_sha256: detail.catalog.compose_sha256,
      name: payload.name,
      ports: payload.ports.map((port) => ({
        host_port: port.host_port,
        container_port: port.container_port,
        protocol: port.protocol,
      })),
      environment: payload.environment.map((item) => ({
        name: item.name,
        value: item.value,
      })),
      volumes: payload.volumes.map((volume) => ({
        name: volume.name,
        dataset: volume.dataset || null,
      })),
      // the internal development record: the operator's labels, prefilled from the contract.
      labels: (payload.labels || []).map((item) => ({ name: item.name, value: item.value })),
      // the internal development record: mounted system certificates; a catalog entry declares none.
      certificates: (payload.certificates || []).map((item) => ({ ...item })),
      restart_policy: payload.restart_policy,
      health_timeout: payload.health_timeout,
      network: applicationNetworkPayload(payload.network),
    };
    const configure$ = this.config && this.config.configured
      ? of(null)
      : this.finalJob('applications.configure', [this.configurePayload(pool, subnet)], T('Configure Applications'));

    configure$.pipe(
      switchMap(() => this.finalJob(
        'applications.catalog.install', [request], T('Install Application'),
      )),
    ).subscribe(() => {
      this.activeJob = null;
      this.selectedDetail = null;
      if (onSuccess) { onSuccess(); }
      this.loadCore();
    }, (error) => {
      this.operationError = this.errorMessage(error);
      this.activeJob = null;
      this.loadCore();
    });
  }

  /**
   * the internal development record: the second install tier. Nothing here was reviewed by
   * anyone but the administrator; the payload carries their acknowledgement and
   * the record comes back marked as unreviewed.
   */
  importImage(payload: ApplicationImportPayload, pool: string, subnet = DEFAULT_SUBNET): void {
    if (this.activeJob) { return; }
    this.operationError = '';
    if (!payload.acknowledge_unreviewed) {
      this.operationError = 'Acknowledge that the image is not reviewed by FreeCORE before importing it.';
      return;
    }
    const configure$ = this.config && this.config.configured
      ? of(null)
      : this.finalJob('applications.configure', [this.configurePayload(pool, subnet)], T('Configure Applications'));

    configure$.pipe(
      switchMap(() => this.finalJob('applications.install', [payload], T('Import Image'))),
    ).subscribe(() => {
      this.activeJob = null;
      this.loadCore();
    }, (error) => {
      this.operationError = this.errorMessage(error);
      this.activeJob = null;
      this.loadCore();
    });
  }

  // -- Convert & Import (the internal development record, #446) ------------------------
  // Reads go straight to the middleware; only apply is a job, and it runs
  // through the same dialog every other application operation uses.

  convertSources(): Observable<ConvertSource[]> {
    return this.ws.call('applications.convert.sources');
  }

  convertDetect(source: { kind: 'jail'; jail: string; engine: 'iocage' | 'bastille' }): Observable<ConvertDetection> {
    return this.ws.call('applications.convert.detect', [source]);
  }

  convertPlan(
    source: { kind: 'jail'; jail: string; engine: 'iocage' | 'bastille' },
    options: { name?: string; mode?: 'lift' | 'native'; ports?: ConvertPortChoice[] },
  ): Observable<ConvertPlan> {
    return this.ws.call('applications.convert.plan', [source, options]);
  }

  convertDiscard(planId: string): Observable<boolean> {
    return this.ws.call('applications.convert.discard', [planId]);
  }

  convertApply(planId: string): void {
    this.runApplicationJob('applications.convert.apply', [planId, { confirm: true }], T('Convert Jail'));
  }

  /** the internal development record: what exporting an application for a Linux host would carry. Nothing runs. */
  exportPlan(name: string): Observable<ExportPlan> {
    return this.ws.call('applications.convert.export_plan', [name]);
  }

  exportRun(planId: string, options: ExportRunOptions): void {
    this.runApplicationJob('applications.convert.export', [planId, { ...options, confirm: true }], T('Export Application'));
  }

  readCompose(data: { url?: string | null; text?: string | null }): Observable<ComposeImportResult> {
    return this.ws.call('applications.convert.read_compose', [data]);
  }

  start(application: InstalledApplication): void {
    this.runApplicationJob('applications.start', [application.name], T('Start Application'));
  }

  stop(application: InstalledApplication): void {
    this.runApplicationJob('applications.stop', [application.name], T('Stop Application'));
  }

  restart(application: InstalledApplication): void {
    this.runApplicationJob('applications.restart', [application.name], T('Restart Application'));
  }

  remove(application: InstalledApplication, removeData = false): void {
    this.runApplicationJob(
      'applications.remove',
      [application.name, { remove_data: removeData }],
      T('Delete Application'), // the internal development record
    );
  }

  /**
   * the internal development record: back to the never-configured state. The runtime
   * stops, the settings are forgotten, and the store on the pool goes unless
   * `keepData` leaves it for a later configure of the same pool to adopt.
   * Installed applications are removed only when `removeApplications` says so;
   * the middleware refuses otherwise and names them.
   */
  unconfigure(removeApplications: boolean, keepData: boolean): void {
    this.runApplicationJob(
      'applications.unconfigure',
      [{ remove_applications: removeApplications, keep_data: keepData }],
      T('Unconfigure Applications'),
    );
  }

  loadLogs(application: InstalledApplication, tail = 200): void {
    const requestId = ++this.logsRequestId;
    this.operationError = '';
    this.logs = '';
    this.logsApplication = application.name;
    this.ws.call('applications.logs', [application.name, tail]).subscribe((logs) => {
      if (requestId === this.logsRequestId) { this.logs = stripAnsi(logs); }
    }, (error) => {
      if (requestId === this.logsRequestId) { this.operationError = this.errorMessage(error); }
    });
  }

  clearLogs(): void {
    this.logsRequestId++;
    this.logs = '';
    this.logsApplication = '';
  }

  private runApplicationJob(method: string, params: any[], operation: string): void {
    if (this.activeJob) { return; }
    this.operationError = '';
    this.finalJob(method, params, operation).subscribe(() => {
      this.activeJob = null;
      this.loadCore();
    }, (error) => {
      this.operationError = this.errorMessage(error);
      this.activeJob = null;
      this.loadCore();
    });
  }

  private finalJob(method: string, params: any[], operation: string): Observable<any> {
    this.activeJob = {
      operation,
      state: 'WAITING',
      percent: 0,
      description: '',
    };
    return new Observable((observer) => {
      const subscriptions = new Subscription();
      const ref = this.matDialog.open(EntityJobComponent, { data: { title: operation }, disableClose: true });
      const view = ref.componentInstance;
      view.job = { state: 'RUNNING' };
      let terminal = false;
      let closed = false;
      let terminalError: Error;
      let terminalResult: any;
      const settle = () => {
        if (!closed || !terminal || observer.closed) { return; }
        if (terminalError) { observer.error(terminalError); } else { observer.next(terminalResult); observer.complete(); }
      };
      subscriptions.add(ref.afterClosed().pipe(take(1)).subscribe(() => {
        closed = true;
        settle();
      }));
      const finish = (error?: Error, result?: any) => {
        if (terminal) { return; }
        terminal = true;
        terminalError = error;
        terminalResult = result;
        if (error && !closed) {
          view.job = { state: 'FAILED' };
          view.setDescription(escape(error.message));
          view.showCloseButton = true;
        }
        // A successful configure may immediately lead to install. Emit only
        // after this native dialog has restored focus and accessibility state.
        if (!error && !closed) { ref.close(true); }
        settle();
      };
      subscriptions.add(applicationsJob(this.ws, method, params).subscribe({
        next: (job) => {
          const progress = job.progress || {};
          this.activeJob = { operation, state: job.state, percent: progress.percent || 0, description: progress.description || '' };
          view.job = job;
          view.progressTotalPercent = Math.max(0, Math.min(100, progress.percent || 0));
          view.setDescription(escape(progress.description || ''));
          if (job.state === 'ABORTED') { finish(new Error(T('The operation was aborted.'))); } else if (job.state === 'FAILED') { finish(new Error(job.error || T('The application operation failed.'))); } else if (job.state === 'SUCCESS') { finish(undefined, job.result); }
        },
        error: (error) => finish(new Error(this.errorMessage(error))),
      }));
      return () => {
        subscriptions.unsubscribe();
        if (!closed) { ref.close(); }
      };
    });
  }

  private errorMessage(error: any): string {
    if (!error) {
      return 'Unknown middleware error.';
    }
    return error.message || error.reason || error.error || String(error);
  }
}
