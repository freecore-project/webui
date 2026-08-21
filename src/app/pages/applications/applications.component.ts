import { Component, OnInit, OnDestroy, AfterViewChecked, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { escape } from 'lodash';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { DialogService } from '../../services/dialog.service';
import { T } from '../../translate-marker';
import { DialogFormConfiguration } from '../common/entity/entity-dialog/dialog-form-configuration.interface';
import { FieldConfig } from '../common/entity/entity-form/models/field-config.interface';
import { showNoPoolDialog } from '../common/no-pool-dialog';
import {
  ApplicationAnnotation,
  ApplicationCertificate,
  ApplicationCatalogDetail,
  ApplicationCatalogEntry,
  ApplicationEnvironment,
  ApplicationImportPayload,
  ApplicationInstallPayload,
  ApplicationPort,
  ComposeImportResult,
  ConvertDetection,
  ConvertPlan,
  ConvertPlanEntry,
  ConvertPortChoice,
  ConvertSource,
  ExportPlan,
  InstalledApplication,
  OwnedDataset,
  ApplicationsProvider,
  CertificateChoice,
} from './applications.types';
import { CatalogStripComponent } from './catalog-strip/catalog-strip.component';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';
import * as catalogIcons from './catalog-icon';

export interface ApplicationImportDraft {
  image: string;
  image_os: 'freebsd' | 'linux';
  name: string;
  host_port: number | null;
  container_port: number | null;
  restart_policy: 'no' | 'on-failure' | 'always';
  acknowledged: boolean;
  // the internal development record: a compose file read into the form. The fields above stay
  // editable; ports, environment and volumes come from the file.
  compose: string;
  composeReading: boolean;
  composeError: string;
  prefill: Omit<ApplicationImportPayload, 'acknowledge_unreviewed'> | null;
  composeSummary: { service: string; ignored: string[]; catalog_app: string | null } | null;
}

/** the internal development record: the convert panel walks source -> target -> plan -> apply. */
export interface ConvertDraft {
  sources: ConvertSource[];
  loading: boolean;
  error: string;
  source: ConvertSource | null;
  detection: ConvertDetection | null;
  mode: 'lift' | 'native';
  name: string;
  ports: ConvertPortChoice[];
  // A port the detection did not propose (a stopped jail with no catalog match).
  newPort: { container_port: number | null; protocol: 'tcp' | 'udp'; host_port: number | null };
  plan: ConvertPlan | null;
  planning: boolean;
  reviewed: boolean;
}

/** the internal development record: an installed application written out for a Linux host. */
export interface ExportDraft {
  application: InstalledApplication;
  loading: boolean;
  error: string;
  plan: ExportPlan | null;
  destination: string;
  mode: 'bundle' | 'in-place';
  hostRoot: string;
  live: boolean;
  reviewed: boolean;
}

const APPLICATION_NAME = /^[a-z0-9][a-z0-9_.-]{0,62}$/;
const EXPORT_DESTINATION = /^\/mnt\/[^/\s:]+\/[^\s:]*[^/\s:]$/;
const EXPORT_HOST_ROOT = /^\/[^\s:]*[^/\s:]$/;
import { ApplicationsStore, applicationNetworkPayload } from './applications.store';

@Component({
  standalone: false,
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  // the internal development record: the catalog panels sit on the engine's settings grid (the jail-form precedent)
  styleUrls: ['../common/entity/entity-form/entity-form.component.scss', './applications.component.scss'],
})
export class ApplicationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  search = '';
  category = 'ALL';
  selectedTab = 0;
  /** the internal development record: the brain tab keys, by selectedTab (0 Catalog, 1 Installed). */
  readonly tabKeys = ['applications-catalog', 'applications-installed'];
  installDraft: ApplicationInstallPayload = null;
  /** the internal development record: the host interfaces a LAN attachment may join. */
  lanInterfaceChoices: { value: string; label: string }[] = [];
  private lanInterfaceChoicesLoaded = false;
  /** the internal development record (the internal development record): the certificates that may be mounted. */
  certificateChoices: CertificateChoice[] = [];
  certificateChoicesError = '';
  private certificateChoicesLoaded = false;
  selectedPool = '';
  selectedSubnet = '10.88.0.0/16';
  effectsReviewed = false;
  pendingRemoval: InstalledApplication = null;
  removeOwnedData = false;
  /** the internal development record: what a Remove keeps or deletes, listed where the box is ticked. */
  removalDatasets: OwnedDataset[] = [];
  /** the internal development record: the review form is editing this installed application. */
  editing: InstalledApplication = null;
  editDatasets: OwnedDataset[] = [];
  /** App-owned data an install under the typed name would reattach. */
  reattachDatasets: OwnedDataset[] = [];
  /**
   * the internal development record: the declared ports the form keeps on the Applications
   * bridge (sent with no host port), and the host port each gets back if published again.
   */
  private bridgePorts = new Set<ApplicationPort>();
  private bridgeHostPorts = new Map<ApplicationPort, number | null>();
  /** The container port the reviewed portal opens: a link on the host, so it stays published. */
  private portalContainerPort: number | null = null;
  private reattachTimer: ReturnType<typeof setTimeout> = null;
  pendingPrune = false;
  retirementNotice = false;
  importDraft: ApplicationImportDraft = null;
  convertDraft: ConvertDraft = null;
  exportDraft: ExportDraft = null;
  private destroyed = new Subject<void>();

  /** the internal development record: the catalog strip; Cancel hands focus back to the tile the review came from. */
  @ViewChild(CatalogStripComponent) strip: CatalogStripComponent;
  @ViewChild(InstalledApplicationsComponent) installedTable: InstalledApplicationsComponent;
  private reviewOriginId: string = null;
  /** the internal development record: the Catalog picker (one catalog at a time); only a control with two or more providers. */
  catalogProvider: string | null = null;
  private catalogMemo: { catalog: ApplicationCatalogEntry[]; search: string; category: string; provider: string | null; result: ApplicationCatalogEntry[] } = null;

  constructor(
    public store: ApplicationsStore,
    private route: ActivatedRoute,
    private dialog: DialogService,
    private router: Router,
    private translate: TranslateService,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.retirementNotice = this.route.snapshot.queryParamMap.get('legacy') === 'iocage-plugin-store';
    this.store.load();
    // The Jails page's "Convert to application" row action lands here with the jail named.
    const convert = this.route.snapshot.queryParamMap.get('convert');
    if (convert) {
      const engine = this.route.snapshot.queryParamMap.get('engine') === 'bastille' ? 'bastille' : 'iocage';
      this.openConvert({ name: convert, engine });
      // The link did its job; a reload must not reopen the panel.
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.store.clearLogs();
    this.destroyed.next();
    this.destroyed.complete();
  }

  get applicationCatalog(): ApplicationCatalogEntry[] {
    return this.store.catalog.filter((entry) => (
      (entry.category || '').toLowerCase() !== 'base' && entry.status !== 'UNAVAILABLE'
    ));
  }

  get categories(): string[] {
    return Array.from(new Set(this.applicationCatalog.map((entry) => entry.category))).sort();
  }

  get catalogProviders(): ApplicationsProvider[] {
    return this.store.providers || [];
  }

  /** The catalog in view: the picked one, else the provider's default, else the first. */
  get selectedProvider(): ApplicationsProvider | null {
    const list = this.catalogProviders;
    if (list.length < 2) { return list[0] || null; }
    return list.find((provider) => provider.id === this.catalogProvider)
      || list.find((provider) => provider.default) || list[0];
  }

  /**
   * the internal development record: memoised on the store's catalog reference + the three filters, so the
   * OnPush strip is not re-rendered on every check of this Eager page.
   */
  get filteredCatalog(): ApplicationCatalogEntry[] {
    const catalog = this.store.catalog;
    const provider = this.catalogProviders.length > 1 && this.selectedProvider ? this.selectedProvider.id : null;
    const memo = this.catalogMemo;
    if (memo && memo.catalog === catalog && memo.search === this.search && memo.category === this.category && memo.provider === provider) {
      return memo.result;
    }
    const search = this.search.trim().toLowerCase();
    const result = this.applicationCatalog.filter((entry) => (
      (this.category === 'ALL' || entry.category === this.category)
      && (!provider || entry.provider === provider)
      && (!search || [entry.title, entry.name, entry.description, entry.category]
        .some((value) => (value || '').toLowerCase().includes(search)))
    ));
    this.catalogMemo = { catalog, search: this.search, category: this.category, provider, result };
    return result;
  }

  catalogIcon(entry: ApplicationCatalogEntry): string | null {
    return catalogIcons.catalogIcon(entry);
  }

  catalogMaterialIcon(entry: ApplicationCatalogEntry): string {
    return catalogIcons.catalogMaterialIcon(entry);
  }

  // the internal development record: the closed hlm-select trigger renders itemToString(value), never the item's text.
  restartPolicyLabel = (value: string): string => {
    const key = ({ always: T('Always'), 'on-failure': T('On failure'), no: T('Do not restart automatically') })[value];
    return key ? this.translate.instant(key) : (value ?? '');
  };

  imageOsLabel = (value: string): string => {
    const key = ({ freebsd: T('FreeBSD native'), linux: T('Linux (experimental, requires the Linux setting)') })[value];
    return key ? this.translate.instant(key) : (value ?? '');
  };

  networkModeLabel = (value: string): string => {
    const key = ({ managed: T('Applications bridge'), lan: T('Attach to LAN') })[value];
    return key ? this.translate.instant(key) : (value ?? '');
  };

  lanInterfaceLabel = (value: string): string => {
    const choice = this.lanInterfaceChoices.find((item) => item.value === value);
    return choice ? choice.label : (value ?? '');
  };

  networkModeChanged(): void {
    if (this.installDraft?.network?.mode === 'lan') { this.ensureLanInterfaceChoices(); }
  }

  private ensureLanInterfaceChoices(): void {
    if (this.lanInterfaceChoicesLoaded) { return; }
    this.lanInterfaceChoicesLoaded = true;
    this.store.interfaceChoices().pipe(take(1), takeUntil(this.destroyed)).subscribe({
      next: (choices) => {
        this.lanInterfaceChoices = Object.entries(choices || {})
          .map(([value, label]) => ({ value, label: String(label) }))
          .sort((left, right) => left.value.localeCompare(right.value));
      },
      error: () => { this.lanInterfaceChoicesLoaded = false; },
    });
  }

  categoryLabel = (value: string): string => (value === 'ALL' ? this.translate.instant(T('All')) : (value ?? ''));

  providerLabel = (id: string): string => this.catalogProviders.find((provider) => provider.id === id)?.name || '';

  identityLabel = (value: unknown): string => (value == null ? '' : String(value));

  convertSourceLabel = (source: ConvertSource | null): string => (
    source ? [source.name, source.engine, source.state, source.release].filter(Boolean).join(' · ') : ''
  );

  healthLabel(health: string): string {
    return ({
      UNDECLARED: T('No health check'), HEALTHY: T('Healthy'), UNHEALTHY: T('Unhealthy'),
      STARTING: T('Starting'), UNKNOWN: T('Unknown'),
    })[(health || '').toUpperCase()] || health;
  }

  /**
   * the internal development record: an installed application reports two different observations and
   * the row showed one of them with no name. The catalog's declared endpoint is checked
   * once, while the application starts; the installed value comes from the container
   * runtime afterwards. A successful startup check and an Unknown runtime result are
   * therefore consistent, not contradictory, and neither says the process is running --
   * that is the state column. UNDECLARED is not a runtime result at all, so it keeps
   * reading as its own statement rather than gaining a label it does not answer to.
   */
  healthHint(health: string): string {
    return ({
      UNDECLARED: T('This application declares no health check.'),
      HEALTHY: T('Reported by the container runtime.'),
      UNHEALTHY: T('Reported by the container runtime.'),
      STARTING: T('The container runtime has not produced its first result yet.'),
      UNKNOWN: T('No runtime health result is available. This is not a failure, and it does not contradict a successful startup check.'),
    })[(health || '').toUpperCase()] || '';
  }

  /**
   * the internal development record: the review, import and convert panels share ONE slot right under the
   * catalog strip (the 13.3 shape: nothing to scroll to, no reveal); opening one closes the others.
   */
  review(entry: ApplicationCatalogEntry): void {
    if (this.store.activeJob || this.store.detailLoading) { return; }
    this.importDraft = null;
    this.forgetConvertPlan();
    this.convertDraft = null;
    this.closeExport();
    this.reviewOriginId = entry.id;
    this.store.reviewCatalog(entry).subscribe({
      next: (detail) => {
        this.prepareReview(detail);
      },
      // The store retains the failure for the page's native error notice.
      error: () => { this.reviewOriginId = null; },
    });
  }

  /** The review slot is taken by Import or Convert: drop the review state without a focus return. */
  private dropReview(): void {
    if (this.store.selectedDetail) { this.store.clearReview(); }
    this.installDraft = null;
    this.effectsReviewed = false;
    this.editing = null;
    this.editDatasets = [];
    this.reattachDatasets = [];
    this.reviewOriginId = null;
  }

  /** The log panel state last revealed: the application and whether its log had arrived; '' while closed. */
  private revealedLogs = '';

  /**
   * the internal development record: the log panel renders under the installed table, below the fold once a few
   * applications are listed, so a Logs click looked like it did nothing. Bring the panel into view when it
   * opens and once more when its log arrives (the page only grows tall enough to scroll it up then), and
   * move focus to the log (the pre is a tab stop, so the keyboard can scroll it).
   */
  ngAfterViewChecked(): void {
    const name = this.store.logsApplication;
    const state = name ? `${name}\n${this.store.logs ? 'loaded' : 'loading'}` : '';
    if (state === this.revealedLogs) { return; }
    this.revealedLogs = state;
    if (!name) { return; }
    const panel = this.host.nativeElement.querySelector('.logs-panel') as HTMLElement | null;
    if (!panel) { return; }
    if (typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    const log = panel.querySelector('pre') as HTMLElement | null;
    if (log) { log.focus({ preventScroll: true }); }
  }

  /** Scroll the control the panel came from back into view and return focus to it. */
  private restoreFocus(selector: string): void {
    setTimeout(() => {
      const origin = this.host.nativeElement.querySelector(selector) as HTMLElement | null;
      if (!origin) { return; }
      if (typeof origin.scrollIntoView === 'function') {
        origin.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      origin.focus({ preventScroll: true });
    });
  }

  /**
   * the internal development record: the catalog is the Daemonless organisation read
   * directly. FreeCORE wires the images in and does not review them; saying so
   * before a refresh is the whole trust statement there is.
   */
  updateCatalog(): void {
    if (this.store.activeJob || this.store.catalogLoading) { return; }
    this.dialog.confirm({
      title: T('Update application catalog'),
      // the internal development record: the sentence names the catalog in view (the picker's provider)
      message: this.translate.parser.interpolate(this.translate.instant(T(
        'This catalog is read from {{provider}}, which builds and patches the images. FreeCORE wires them into the appliance and does not review them.',
      )), { provider: escape((this.selectedProvider && this.selectedProvider.name) || 'Daemonless') }),
      hideCheckBox: true,
      buttonMsg: T('Update Catalog'),
    }).subscribe((confirmed) => {
      if (confirmed && !this.store.activeJob) {
        this.store.loadCatalog(true);
      }
    });
  }

  openSettings(): void {
    const config = this.store.config;
    if (!config || this.store.activeJob) {
      return;
    }

    const configured = config.configured;
    if (!configured && !this.store.pools.length) {
      showNoPoolDialog(this.dialog, this.router);
      return;
    }

    const selectedPool = config.pool || this.store.pools[0].name;
    const poolOptions = this.store.pools.map((pool) => ({
      label: pool.name,
      value: pool.name,
    }));
    if (config.pool && !poolOptions.some((pool) => pool.value === config.pool)) {
      poolOptions.unshift({ label: config.pool, value: config.pool });
    }

    let submitted: { pool: string; subnet: string; linux_compat_enabled: boolean; convert_enabled: boolean };
    // the internal development record: the way out sits beside the way in. The action closes
    // this dialog and opens its own, so the two never stack.
    let settingsDialog: any = null;
    const conf: DialogFormConfiguration = {
      title: T('Applications Settings'),
      afterInit: (entityDialog: any) => { settingsDialog = entityDialog; },
      custActions: configured ? [{
        id: 'unconfigure',
        name: T('Unconfigure Applications'),
        function: () => {
          if (settingsDialog) { settingsDialog.dialogRef.close(false); }
          this.openUnconfigure();
        },
      }] : [],
      fieldConfig: [
        {
          type: 'select',
          name: 'pool',
          showLabel: true, label: T('Data Pool'), placeholder: T('Data Pool'),
          options: poolOptions,
          value: selectedPool,
          disabled: false,
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'input',
          name: 'subnet',
          showLabel: true, label: T('Managed Container Subnet'), placeholder: T('Managed Container Subnet'),
          value: config.subnet || '10.88.0.0/16',
          disabled: false,
          required: true,
          validation: [Validators.required],
        },
        // the internal development record: the Convert & Import lane, off by default.
        {
          type: 'checkbox',
          name: 'convert_enabled',
          placeholder: T('Convert & Import (experimental)'),
          value: !!config.convert_enabled,
          tooltip: T('Guided conversion of stopped jails and Linux exports into applications.'),
        },
        // the internal development record: the Linux tier is host-wide, and the setting says so.
        {
          type: 'checkbox',
          name: 'linux_compat_enabled',
          placeholder: T('Linux binary compatibility (experimental)'),
          value: !!config.linux_compat_enabled,
          tooltip: T('Loads the Linux ABI for the whole host so Linux images can run as applications. Best effort, no compatibility promise; every jail on this host can then execute Linux binaries.'),
        },
      ],
      saveButtonText: configured ? T('Save') : T('Configure'),
      cancelButtonText: T('Cancel'),
      customSubmit: (entityDialog) => {
        const { pool, subnet } = entityDialog.formValue;
        const flags = {
          linux_compat_enabled: !!entityDialog.formValue.linux_compat_enabled,
          convert_enabled: !!entityDialog.formValue.convert_enabled,
        };
        const accept = () => {
          submitted = { pool, subnet, ...flags };
          entityDialog.dialogRef.close(true);
        };
        // the internal development record: applications.query only reports the configured pool, so leaving a pool that
        // still holds applications empties the Installed tab. Nothing is moved or destroyed, but
        // say so before it happens. The running-application refusal is enforced by the backend.
        const stranded = configured && config.pool && pool !== config.pool ? this.store.installed : [];
        if (!stranded.length) { accept(); return; }
        const question = this.translate.parser.interpolate(
          this.translate.instant(T('Applications installed on <b>{{current}}</b> will no longer be listed while <b>{{selected}}</b> is the data pool: {{names}}.')),
          {
            current: escape(config.pool),
            selected: escape(pool),
            names: stranded.map((application) => escape(application.name)).join(', '),
          },
        );
        const reassurance = this.translate.parser.interpolate(
          this.translate.instant(T('They are not deleted. Their data stays on {{current}}, and selecting {{current}} again lists them exactly as they were.')),
          { current: escape(config.pool) },
        );
        this.dialog.confirm({
          title: T('Change Applications Data Pool'),
          message: `<p>${question}</p><p>${reassurance}</p>`,
          buttonMsg: T('Change Data Pool'),
        }).pipe(take(1), takeUntil(this.destroyed)).subscribe((agreed) => {
          if (agreed) { accept(); }
        });
      },
    };
    this.dialog.dialogForm(conf).pipe(take(1), takeUntil(this.destroyed)).subscribe((confirmed) => {
      if (confirmed && submitted && !this.store.activeJob) {
        this.store.configure(submitted.pool, submitted.subnet, {
          linux_compat_enabled: submitted.linux_compat_enabled,
          convert_enabled: submitted.convert_enabled,
        });
      }
    });
  }

  /**
   * the internal development record (the internal development record): return the appliance to the state it had
   * before Applications was configured. The two boxes are the job's two options and
   * nothing else is decided here: removing the installed applications is required
   * while any exist (the middleware refuses otherwise and names them), and the
   * store's data is kept unless the operator unticks it — destroying data takes a
   * deliberate click, never the default.
   */
  openUnconfigure(): void {
    const config = this.store.config;
    if (!config || !config.configured || this.store.activeJob) {
      return;
    }
    const installed = this.store.installed;
    const pool = escape(config.pool);
    let message = `<p>${this.translate.parser.interpolate(
      this.translate.instant(T('This stops the Applications runtime, forgets the Applications settings, and removes the store on <b>{{pool}}</b>.')),
      { pool },
    )}</p>`;
    if (installed.length) {
      message += `<p>${this.translate.parser.interpolate(
        this.translate.instant(T('Installed applications: {{names}}.')),
        { names: installed.map((application) => escape(application.name)).join(', ') },
      )}</p>`;
    }

    let submitted: { remove_applications: boolean; keep_data: boolean };
    const fieldConfig: FieldConfig[] = [];
    if (installed.length) {
      fieldConfig.push({
        type: 'checkbox',
        name: 'remove_applications',
        placeholder: T('Remove the installed applications'),
        value: false,
        required: true,
        validation: [Validators.requiredTrue],
        tooltip: T('Required while any are installed. Each is removed as Delete would; whether its data stays follows the box below.'),
      });
    }
    fieldConfig.push({
      type: 'checkbox',
      name: 'keep_data',
      placeholder: T('Keep the store\'s data on the pool'),
      value: true,
      tooltip: T('Leaves the store datasets on the pool, where configuring Applications on the same pool again adopts them. Untick to destroy them.'),
    });
    const conf: DialogFormConfiguration = {
      title: T('Unconfigure Applications'),
      message,
      fieldConfig,
      saveButtonText: T('Unconfigure'),
      cancelButtonText: T('Cancel'),
      customSubmit: (entityDialog) => {
        submitted = {
          remove_applications: !!entityDialog.formValue.remove_applications,
          keep_data: !!entityDialog.formValue.keep_data,
        };
        entityDialog.dialogRef.close(true);
      },
    };
    this.dialog.dialogForm(conf).pipe(take(1), takeUntil(this.destroyed)).subscribe((confirmed) => {
      if (confirmed && submitted && !this.store.activeJob) {
        this.store.unconfigure(submitted.remove_applications, submitted.keep_data);
      }
    });
  }

  /** the internal development record: the catalog copy the review was built from, in words. */
  catalogSourceLabel(source: string | null | undefined): string {
    return ({
      live: T('live'),
      seed: T('seed shipped with the image'),
      empty: T('none'),
    })[source || 'empty'] || source;
  }

  // -- the second install tier (the internal development record, #444) ----------------

  openImport(): void {
    if (this.store.activeJob) { return; }
    this.store.operationError = '';
    this.forgetConvertPlan();
    this.convertDraft = null;
    this.closeExport();
    this.dropReview();
    this.importDraft = {
      image: '',
      image_os: 'freebsd',
      name: '',
      host_port: null,
      container_port: null,
      restart_policy: 'always',
      acknowledged: false,
      compose: '',
      composeReading: false,
      composeError: '',
      prefill: null,
      composeSummary: null,
    };
  }

  /**
   * the internal development record: read a compose file (a raw.githubusercontent.com URL or pasted
   * YAML) into the import form. The middleware parses it; this only copies the answer in.
   */
  readCompose(): void {
    const draft = this.importDraft;
    if (!draft || draft.composeReading) { return; }
    const text = draft.compose.trim();
    if (!text) { return; }
    const request = /^https?:\/\//i.test(text) ? { url: text, text: null } : { url: null, text };
    draft.composeReading = true;
    draft.composeError = '';
    this.store.readCompose(request).pipe(takeUntil(this.destroyed)).subscribe((result: ComposeImportResult) => {
      const install = result.install;
      const port = install.ports.find((item) => item.protocol === 'tcp') || null;
      Object.assign(draft, {
        composeReading: false,
        image: install.image,
        image_os: install.image_os,
        name: install.name,
        restart_policy: install.restart_policy,
        host_port: port ? port.host_port : null,
        container_port: port ? port.container_port : null,
        prefill: install,
        composeSummary: { service: result.service, ignored: result.ignored, catalog_app: result.catalog_app },
      });
    }, (error) => {
      draft.composeReading = false;
      draft.composeError = error && (error.reason || error.message) ? (error.reason || error.message) : String(error);
    });
  }

  cancelImport(): void {
    this.importDraft = null;
    this.restoreFocus('[data-applications-action="import"]');
  }

  /** The Linux choice needs the host-wide setting; without it the middleware refuses before any pull. */
  get importLinuxBlocked(): boolean {
    return !!this.importDraft && this.importDraft.image_os === 'linux'
      && !(this.store.config && this.store.config.linux_compat_enabled);
  }

  canImport(): boolean {
    const draft = this.importDraft;
    if (!draft || !draft.acknowledged || this.store.activeJob || this.importLinuxBlocked) {
      return false;
    }
    if (!draft.image || draft.image.trim() !== draft.image || /\s/.test(draft.image) || draft.image.startsWith('-')) {
      return false;
    }
    if (!APPLICATION_NAME.test(draft.name)) {
      return false;
    }
    if (!this.store.config || (!this.store.config.configured && !this.selectedPool)) {
      return false;
    }
    const portGiven = draft.host_port !== null || draft.container_port !== null;
    if (portGiven) {
      return [draft.host_port, draft.container_port].every((port) => Number.isInteger(port) && port >= 1 && port <= 65535);
    }
    return true;
  }

  importPayload(): ApplicationImportPayload {
    const draft = this.importDraft;
    const formPort = draft.host_port !== null && draft.container_port !== null
      ? { host_port: draft.host_port, container_port: draft.container_port, protocol: 'tcp' as const }
      : null;
    if (draft.prefill) {
      // The compose file's ports, environment and volumes carry; the form's single tcp
      // port replaces the file's first tcp port when the administrator changed it.
      const ports = draft.prefill.ports.map((port) => ({ ...port }));
      const first = ports.findIndex((port) => port.protocol === 'tcp');
      if (formPort && first >= 0) {
        ports[first] = formPort;
      } else if (formPort) {
        ports.push(formPort);
      }
      return {
        ...JSON.parse(JSON.stringify(draft.prefill)),
        name: draft.name,
        image: draft.image,
        image_os: draft.image_os,
        restart_policy: draft.restart_policy,
        ports,
        acknowledge_unreviewed: true,
      };
    }
    return {
      name: draft.name,
      image: draft.image,
      image_os: draft.image_os,
      ports: formPort ? [formPort] : [],
      environment: [],
      volumes: [],
      annotations: [],
      labels: [],
      restart_policy: draft.restart_policy,
      portal: null,
      healthcheck: null,
      health_timeout: 60,
      acknowledge_unreviewed: true,
    };
  }

  submitImport(): void {
    if (!this.canImport()) { return; }
    const pool = this.store.config && this.store.config.pool
      ? this.store.config.pool
      : (this.selectedPool || (this.store.pools[0] ? this.store.pools[0].name : ''));
    const subnet = this.store.config && this.store.config.subnet ? this.store.config.subnet : this.selectedSubnet;
    this.store.importImage(this.importPayload(), pool, subnet);
    this.importDraft = null;
  }

  // -- Convert a jail (the internal development record) ------------------------------------

  get convertEnabled(): boolean {
    return !!(this.store.config && this.store.config.convert_enabled);
  }

  openConvert(preselect: { name: string; engine: 'iocage' | 'bastille' } = null): void {
    if (this.store.activeJob) { return; }
    this.store.operationError = '';
    this.importDraft = null;
    this.closeExport();
    this.dropReview();
    this.convertDraft = {
      sources: [], loading: true, error: '', source: null, detection: null,
      mode: 'lift', name: '', ports: [], newPort: { container_port: null, protocol: 'tcp', host_port: null },
      plan: null, planning: false, reviewed: false,
    };
    const draft = this.convertDraft;
    this.store.convertSources().pipe(takeUntil(this.destroyed)).subscribe((sources) => {
      draft.sources = sources;
      draft.loading = false;
      const wanted = preselect
        ? sources.find((source) => source.name === preselect.name && source.engine === preselect.engine)
        : null;
      if (wanted) {
        this.selectConvertSource(wanted);
      }
    }, (error) => {
      draft.loading = false;
      draft.error = this.errorText(error);
    });
  }

  selectConvertSource(source: ConvertSource): void {
    const draft = this.convertDraft;
    if (!draft || draft.planning) { return; }
    this.forgetConvertPlan();
    Object.assign(draft, {
      source, detection: null, error: '', loading: true, reviewed: false,
      name: this.applicationNameFor(source.name), mode: 'lift', ports: [],
    });
    this.store.convertDetect({ kind: 'jail', jail: source.name, engine: source.engine })
      .pipe(takeUntil(this.destroyed)).subscribe((detection) => {
        draft.loading = false;
        draft.detection = detection;
        draft.ports = (detection.ports || []).map((port) => ({ ...port }));
        draft.mode = 'lift';
      }, (error) => {
        draft.loading = false;
        draft.error = this.errorText(error);
      });
  }

  addConvertPort(): void {
    const draft = this.convertDraft;
    if (!draft) { return; }
    const port = draft.newPort;
    const valid = (value: number | null) => Number.isInteger(value) && value >= 1 && value <= 65535;
    if (!valid(port.container_port) || (port.host_port !== null && !valid(port.host_port))) { return; }
    if (draft.ports.some((item) => item.container_port === port.container_port && item.protocol === port.protocol)) {
      return;
    }
    draft.ports.push({ container_port: port.container_port, protocol: port.protocol, host_port: port.host_port, command: null });
    draft.newPort = { container_port: null, protocol: 'tcp', host_port: null };
    this.forgetConvertPlan();
  }

  /** The recipe migration is offered only when a recipe recognised the jail. */
  get convertMigrationAvailable(): boolean {
    const detection = this.convertDraft && this.convertDraft.detection;
    return !!(detection && detection.recipe && detection.refusals.length === 0);
  }

  convertRefusals(): string[] {
    const detection = this.convertDraft && this.convertDraft.detection;
    if (!detection) { return []; }
    // A missing recipe only rules out the migration, never the lift.
    return detection.refusals.filter((reason) => !reason.startsWith('no recipe recognises'));
  }

  prepareConvertPlan(): void {
    const draft = this.convertDraft;
    if (!draft || !draft.source || draft.planning || !APPLICATION_NAME.test(draft.name)) { return; }
    this.forgetConvertPlan();
    draft.planning = true;
    draft.error = '';
    draft.reviewed = false;
    const options: { name: string; mode: 'lift' | 'native'; ports?: ConvertPortChoice[] } = {
      name: draft.name, mode: draft.mode,
    };
    if (draft.mode === 'lift') {
      options.ports = draft.ports.map((port) => ({
        container_port: port.container_port, protocol: port.protocol,
        host_port: Number.isInteger(port.host_port) ? port.host_port : null,
      }));
    }
    this.store.convertPlan({ kind: 'jail', jail: draft.source.name, engine: draft.source.engine }, options)
      .pipe(takeUntil(this.destroyed)).subscribe((plan) => {
        draft.planning = false;
        draft.plan = plan;
      }, (error) => {
        draft.planning = false;
        draft.error = this.errorText(error);
      });
  }

  planEntries(type: ConvertPlanEntry['type']): ConvertPlanEntry[] {
    const plan = this.convertDraft && this.convertDraft.plan;
    return plan ? plan.entries.filter((entry) => entry.type === type) : [];
  }

  canApplyConvert(): boolean {
    const draft = this.convertDraft;
    return !!(draft && draft.plan && draft.reviewed && !draft.planning && !this.store.activeJob
      && !draft.plan.entries.some((entry) => entry.type === 'refuse'));
  }

  applyConvert(): void {
    if (!this.canApplyConvert()) { return; }
    const planId = this.convertDraft.plan.plan_id;
    this.convertDraft = null;
    this.selectedTab = 1;
    this.store.convertApply(planId);
  }

  cancelConvert(): void {
    this.forgetConvertPlan();
    this.convertDraft = null;
    this.restoreFocus('[data-applications-action="convert"]');
  }

  /** A plan holds a snapshot of the source; leaving it behind means leaving the snapshot behind. */
  private forgetConvertPlan(): void {
    const draft = this.convertDraft;
    if (!draft || !draft.plan) { return; }
    const planId = draft.plan.plan_id;
    draft.plan = null;
    draft.reviewed = false;
    this.store.convertDiscard(planId).pipe(take(1)).subscribe(() => {}, () => {});
  }

  convertPackages(): string {
    const detection = this.convertDraft && this.convertDraft.detection;
    const names = (detection && detection.packages ? detection.packages : [])
      .filter((item) => !item.automatic).map((item) => `${item.name} ${item.version}`);
    return names.slice(0, 6).join(', ') + (names.length > 6 ? ` … (+${names.length - 6})` : '');
  }

  convertSizeLabel(bytes: number): string {
    if (!bytes) { return ''; }
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
  }

  // -- Export an application for a Linux host (the internal development record) -------------

  openExport(application: InstalledApplication): void {
    if (this.store.activeJob || !this.convertEnabled) { return; }
    this.store.operationError = '';
    this.importDraft = null;
    this.forgetConvertPlan();
    this.convertDraft = null;
    this.dropReview();
    this.closeExport();
    this.exportDraft = {
      application, loading: true, error: '', plan: null,
      destination: '', mode: 'bundle', hostRoot: '', live: false, reviewed: false,
    };
    // the internal development record: the panel lives under the catalog strip (the Catalog tab), as Edit's does.
    this.selectedTab = 0;
    this.loadExportPlan();
  }

  private loadExportPlan(): void {
    const draft = this.exportDraft;
    if (!draft) { return; }
    this.forgetExportPlan();
    Object.assign(draft, { loading: true, error: '', reviewed: false });
    this.store.exportPlan(draft.application.name).pipe(takeUntil(this.destroyed)).subscribe((plan) => {
      draft.loading = false;
      draft.plan = plan;
    }, (error) => {
      draft.loading = false;
      draft.error = this.errorText(error);
    });
  }

  replanExport(): void {
    if (this.exportDraft && !this.exportDraft.loading) { this.loadExportPlan(); }
  }

  exportPlanEntries(type: ConvertPlanEntry['type']): ConvertPlanEntry[] {
    const plan = this.exportDraft && this.exportDraft.plan;
    return plan ? plan.entries.filter((entry) => entry.type === type) : [];
  }

  exportKindLabel(kind: ExportPlan['kind']): string {
    const key = ({
      state: T('state carried'),
      identity: T('same Linux image'),
      fresh: T('fresh install, no state'),
    })[kind];
    return key ? this.translate.instant(key) : (kind ?? '');
  }

  exportModeLabel = (value: string): string => {
    const key = ({
      bundle: T('Bundle: copy the state into the folder'),
      'in-place': T('In place: point at the datasets (moving the whole pool)'),
    })[value];
    return key ? this.translate.instant(key) : (value ?? '');
  };

  get exportDestinationValid(): boolean {
    return !!this.exportDraft && EXPORT_DESTINATION.test(this.exportDraft.destination.trim());
  }

  get exportHostRootValid(): boolean {
    const draft = this.exportDraft;
    if (!draft || draft.mode !== 'bundle' || !draft.hostRoot.trim()) { return true; }
    return EXPORT_HOST_ROOT.test(draft.hostRoot.trim());
  }

  canRunExport(): boolean {
    const draft = this.exportDraft;
    return !!(draft && draft.plan && draft.reviewed && !draft.loading && !this.store.activeJob
      && !draft.plan.entries.some((entry) => entry.type === 'refuse')
      && this.exportDestinationValid && this.exportHostRootValid);
  }

  runExport(): void {
    if (!this.canRunExport()) { return; }
    const draft = this.exportDraft;
    const hostRoot = draft.mode === 'bundle' ? draft.hostRoot.trim() : '';
    const planId = draft.plan.plan_id;
    // The job consumes the plan; nothing is left to discard.
    this.exportDraft = null;
    this.selectedTab = 1;
    this.store.exportRun(planId, {
      destination: draft.destination.trim(), mode: draft.mode, live: draft.live, host_root: hostRoot || null,
    });
  }

  cancelExport(): void {
    const name = this.exportDraft && this.exportDraft.application.name;
    this.closeExport();
    this.selectedTab = 1;
    if (name) { this.restoreFocus(`#${CSS.escape(`action_button_${name}__export`)}`); }
  }

  /** Another panel takes the slot: forget the export plan with it. */
  private closeExport(): void {
    this.forgetExportPlan();
    this.exportDraft = null;
  }

  private forgetExportPlan(): void {
    const draft = this.exportDraft;
    if (!draft || !draft.plan) { return; }
    const planId = draft.plan.plan_id;
    draft.plan = null;
    draft.reviewed = false;
    this.store.convertDiscard(planId).pipe(take(1)).subscribe(() => {}, () => {});
  }

  private applicationNameFor(name: string): string {
    const candidate = name.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 63);
    return APPLICATION_NAME.test(candidate) ? candidate : `jail-${candidate}`.slice(0, 63);
  }

  private errorText(error: any): string {
    if (!error) { return this.translate.instant(T('Unknown middleware error.')); }
    return error.reason || error.message || error.error || String(error);
  }

  prepareReview(detail: ApplicationCatalogDetail): void {
    this.installDraft = detail.install
      ? JSON.parse(JSON.stringify(detail.install))
      : null;
    if (this.installDraft) {
      // the internal development record: the attachment is the administrator's choice, never the contract's.
      this.installDraft.network = {
        mode: 'managed', interface: null, address: null, gateway: null, managed_access: false,
      };
      // the internal development record: the provider's labels prefill the list; the operator owns it from there.
      this.installDraft.labels = (this.installDraft.labels || []).map(
        (item) => ({ name: item.name, value: item.value }),
      );
      // the internal development record: a catalog entry never declares a certificate.
      this.installDraft.certificates = [];
    }
    this.bridgePorts = new Set();
    this.bridgeHostPorts = new Map();
    const portal = detail.install?.portal;
    const portalPort = portal
      ? (detail.install.ports || []).find((port) => port.protocol === 'tcp' && port.host_port === portal.port)
      : null;
    this.portalContainerPort = portalPort ? portalPort.container_port : null;
    this.selectedPool = this.store.config && this.store.config.pool
      ? this.store.config.pool
      : (this.store.pools[0] ? this.store.pools[0].name : '');
    this.selectedSubnet = this.store.config && this.store.config.subnet
      ? this.store.config.subnet
      : '10.88.0.0/16';
    this.effectsReviewed = false;
  }

  closeReview(): void {
    const origin = this.reviewOriginId;
    const edited = this.editing;
    this.store.clearReview();
    this.installDraft = null;
    this.effectsReviewed = false;
    this.reviewOriginId = null;
    this.editing = null;
    this.editDatasets = [];
    this.reattachDatasets = [];
    if (edited) {
      // the internal development record: the review lives in the Catalog tab; an edit came from Installed.
      this.selectedTab = 1;
      this.installedTable?.focusEdit(edited.name);
    } else if (origin) {
      setTimeout(() => { if (this.strip) { this.strip.focusTile(origin); } });
    }
  }

  install(): void {
    if (!this.canInstall()) {
      return;
    }
    if (this.editing) {
      this.submitEdit();
      return;
    }
    this.store.install(
      this.installDraft,
      this.selectedPool,
      this.selectedSubnet,
      this.store.selectedDetail,
      () => this.finishInstall(),
    );
  }

  /** the internal development record: a successful Install lands on the Installed tab, the panel closed. */
  finishInstall(): void {
    this.installDraft = null;
    this.effectsReviewed = false;
    this.reattachDatasets = [];
    this.reviewOriginId = null;
    this.selectedTab = 1;
  }

  canInstall(): boolean {
    if (
      !this.effectsReviewed || !this.installDraft || !this.store.selectedDetail
      || !this.store.selectedDetail.available || this.store.activeJob
    ) {
      return false;
    }
    if (!this.store.config || (!this.store.config.configured && !this.selectedPool)) {
      return false;
    }
    if (!/^[a-z0-9][a-z0-9_.-]{0,62}$/.test(this.installDraft.name)) {
      return false;
    }
    const network = this.installDraft.network;
    if (network?.mode === 'lan' && (
      !network.interface
      || !/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test((network.address || '').trim())
      || !/^\d{1,3}(\.\d{1,3}){3}$/.test((network.gateway || '').trim())
    )) {
      return false;
    }
    if (!this.labelsValid || !this.certificatesValid) {
      return false;
    }
    return this.installDraft.ports.every((port) => this.bridgePorts.has(port) || (Number.isInteger(port.host_port)
      && port.host_port >= 1 && port.host_port <= 65535))
      // Editing: an empty value keeps the installed one, so nothing is required.
      && (!!this.editing || this.installDraft.environment.every((item) => !this.environmentDefinition(item.name)?.required
        || (typeof item.value === 'string' && item.value.length > 0)));
  }

  /** the internal development record: a declared port the form keeps on the Applications bridge. */
  isBridgeOnly(port: ApplicationPort): boolean {
    return this.bridgePorts.has(port);
  }

  /** The port the portal opens stays published: the portal is a link on the host. */
  isPortalPort(port: ApplicationPort): boolean {
    return port.protocol === 'tcp' && port.container_port === this.portalContainerPort;
  }

  setPortPublished(port: ApplicationPort, published: boolean): void {
    if (published === !this.bridgePorts.has(port)) { return; }
    if (published) {
      this.bridgePorts.delete(port);
      port.host_port = this.bridgeHostPorts.get(port) ?? null;
    } else if (!this.isPortalPort(port)) {
      this.bridgeHostPorts.set(port, port.host_port);
      this.bridgePorts.add(port);
      port.host_port = null;
    }
  }

  /**
   * the internal development record / the internal development record: the same review form, pre-filled from the
   * installed record and bound to it. The catalog detail supplies the declarations
   * and their descriptions; the record supplies the choices. Values are never
   * shown (the record does not carry them), so an empty value means "unchanged".
   */
  edit(application: InstalledApplication): void {
    if (!this.canReplace(application)) { return; }
    this.store.operationError = '';
    this.editDatasets = [];
    this.store.reviewCatalog({ id: application.catalog.id } as ApplicationCatalogEntry).pipe(
      take(1), takeUntil(this.destroyed),
    ).subscribe({
      next: (detail) => {
        if (!detail.install) {
          this.store.operationError = detail.reason || T('The current catalog entry is unavailable. Update the catalog and try again.');
          this.store.clearReview();
          return;
        }
        this.prepareEdit(application, detail);
        // the internal development record: the review panel lives under the catalog strip (the Catalog tab).
        this.selectedTab = 0;
      },
      error: () => {},
    });
    this.store.ownedDatasets(application.name).pipe(take(1), takeUntil(this.destroyed)).subscribe({
      next: (datasets) => { this.editDatasets = datasets || []; },
      error: () => { this.editDatasets = []; },
    });
  }

  prepareEdit(application: InstalledApplication, detail: ApplicationCatalogDetail): void {
    this.closeExport();
    this.prepareReview(detail);
    this.editing = application;
    this.reviewOriginId = null;
    const draft = this.installDraft;
    draft.name = application.name;
    draft.restart_policy = (application.restart_policy as ApplicationInstallPayload['restart_policy']) || draft.restart_policy;
    const reviewed = draft.ports;
    draft.ports = reviewed.map((port) => {
      const current = (application.ports || []).find((item) => (
        item.container_port === port.container_port && item.protocol === port.protocol
      ));
      return { ...port, host_port: current ? current.host_port : port.host_port };
    });
    // the internal development record: a port the application keeps on the bridge stays there;
    // published again, it gets the reviewed entry's host port.
    draft.ports.forEach((port, index) => {
      if (port.host_port === null) {
        this.bridgePorts.add(port);
        this.bridgeHostPorts.set(port, reviewed[index].host_port);
      }
    });
    draft.environment = draft.environment.map((item) => ({ name: item.name, value: '' }));
    // the internal development record: labels are the operator's, so an edit starts from what is installed.
    draft.labels = (application.labels || []).map((item) => ({ name: item.name, value: item.value }));
    // the internal development record: so are the mounted certificates. The choices are fetched only when
    // there is something to label or the operator adds a row, so opening a panel costs nothing.
    draft.certificates = (application.certificates || []).map((item) => ({ ...item }));
    if (draft.certificates.length) { this.ensureCertificateChoices(); }
    draft.volumes = draft.volumes.map((volume) => {
      const current = (application.volumes || []).find((item) => item.name === volume.name);
      return { ...volume, dataset: current && !current.owned ? (current.dataset || '') : '' };
    });
    draft.network = application.network?.mode === 'lan'
      ? {
        mode: 'lan',
        interface: application.network.interface || null,
        address: application.network.address || null,
        gateway: application.network.gateway || null,
        managed_access: !!application.network.managed_access,
      }
      : {
        mode: 'managed', interface: null, address: null, gateway: null, managed_access: false,
      };
    if (draft.network.mode === 'lan') { this.ensureLanInterfaceChoices(); }
  }

  /** What changing this volume's mapping leaves behind or brings back. */
  volumeNote(volume: { name: string; dataset: string | null }): string {
    if (!this.editing) { return ''; }
    const current = (this.editing.volumes || []).find((item) => item.name === volume.name);
    if (!current) { return ''; }
    const requested = (volume.dataset || '').trim();
    if (current.owned && requested) {
      const kept = this.editDatasets.find((item) => item.dataset === current.dataset);
      const size = kept ? this.convertSizeLabel(kept.used) : '';
      return this.translate.parser.interpolate(
        this.translate.instant(T('The app-owned dataset {{dataset}}{{size}} stays in place; nothing is moved.')),
        { dataset: current.dataset, size: size ? ` (${size})` : '' },
      );
    }
    if (!current.owned && !requested) {
      const existing = this.editDatasets.find((item) => !item.parent && item.orphan
        && item.dataset.endsWith(`/${volume.name}`));
      if (existing) {
        return this.translate.parser.interpolate(
          this.translate.instant(T('Existing app-owned data for this volume ({{dataset}}, {{size}}) will be reattached.')),
          { dataset: existing.dataset, size: this.convertSizeLabel(existing.used) || '0 B' },
        );
      }
      return this.translate.instant(T('A new, empty app-owned dataset will be created for this volume.'));
    }
    return '';
  }

  // -- the internal development record / the internal development record: container labels ------------------------------

  /** Mirrors the middleware rule, so a mistake surfaces before the job starts. */
  readonly reservedLabelPrefix = 'io.freecore.';

  addLabel(): void {
    if (!this.installDraft) { return; }
    this.installDraft.labels = [...(this.installDraft.labels || []), { name: '', value: '' }];
  }

  removeLabel(index: number): void {
    if (!this.installDraft) { return; }
    this.installDraft.labels = this.installDraft.labels.filter((_, position) => position !== index);
  }

  labelError(index: number): string {
    const labels = this.installDraft?.labels || [];
    const label = labels[index];
    if (!label) { return ''; }
    const name = (label.name || '').trim();
    if (!name) { return this.translate.instant(T('Enter a name.')); }
    if (name.startsWith(this.reservedLabelPrefix)) {
      return this.translate.instant(T('This name is reserved for FreeCORE\'s own management labels.'));
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,253}$/.test(name)) {
      return this.translate.instant(T('A name may use letters, digits, dot, dash, underscore and slash.'));
    }
    if (labels.some((item, position) => position !== index && (item.name || '').trim() === name)) {
      return this.translate.instant(T('This name is already used.'));
    }
    if ((label.value || '').length > 4096) {
      return this.translate.instant(T('A value may be at most 4096 characters.'));
    }
    return '';
  }

  get labelsValid(): boolean {
    const labels = this.installDraft?.labels || [];
    return labels.every((_, index) => !this.labelError(index));
  }

  private labelsPayload(): ApplicationAnnotation[] {
    return (this.installDraft?.labels || [])
      .map((item) => ({ name: (item.name || '').trim(), value: item.value || '' }))
      .filter((item) => !!item.name);
  }

  // -- the internal development record / the internal development record: mounted system certificates ---------------------

  /** Loaded when the panel opens: a middleware without the call leaves the section empty. */
  private ensureCertificateChoices(): void {
    if (this.certificateChoicesLoaded) { return; }
    this.certificateChoicesLoaded = true;
    this.store.certificateChoices().pipe(take(1), takeUntil(this.destroyed)).subscribe({
      next: (certificates) => {
        // The same rule the middleware applies: a complete, unrevoked certificate that has a
        // usable private key. Expiry does not disqualify one -- a renewal is the normal case.
        this.certificateChoices = (certificates || []).filter((certificate) => (
          !certificate.revoked && !certificate.cert_type_CSR
          && !!certificate.fingerprint && !!certificate.key_length
        ));
        // A new function, so a row an edit opened with is named again (see certificateLabelFor).
        this.certificateLabel = this.certificateLabelFor();
      },
      error: (error) => {
        this.certificateChoices = [];
        this.certificateChoicesError = this.errorText(error);
      },
    });
  }

  /**
   * The closed trigger names its value through itemToString when the value is written, and does not
   * look again when the options change (the internal development record). An edit opens with its rows before the
   * certificate list arrives, so the list hands the select a new function when it lands; until then,
   * and for a certificate the list no longer offers, a row is named as it was bound, never by its id.
   */
  certificateLabel = this.certificateLabelFor();

  private certificateLabelFor(): (id: number) => string {
    return (id: number): string => {
      const choice = this.certificateChoices.find((item) => item.id === id);
      if (choice) { return choice.name; }
      const row = (this.installDraft?.certificates || []).find((item) => item.id === id);
      return row?.name || (id == null ? '' : String(id));
    };
  }

  /** When a certificate stops being valid; `until` is "Mon Jan  1 00:00:00 2029". */
  private certificateExpiry(choice: CertificateChoice): Date | null {
    const match = /^\w{3} (\w{3}) +(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/.exec(choice?.until || '');
    const month = match
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(match[1]) : -1;
    if (month < 0) { return null; }
    return new Date(Number(match[6]), month, Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]));
  }

  /**
   * Set for a certificate that has expired or is within thirty days of it. Neither is refused --
   * a renewal is the normal case -- but the operator should not find out from the application.
   */
  private certificateLapse(choice: CertificateChoice): { expired: boolean; date: string } | null {
    const expiry = this.certificateExpiry(choice);
    if (!expiry) { return null; }
    const days = (expiry.getTime() - Date.now()) / 86400000;
    if (days > 30) { return null; }
    const pad = (value: number): string => String(value).padStart(2, '0');
    return {
      expired: days < 0,
      date: `${expiry.getFullYear()}-${pad(expiry.getMonth() + 1)}-${pad(expiry.getDate())}`,
    };
  }

  /** A choice as the open list shows it: marked when it has expired or is about to. */
  certificateChoiceText(choice: CertificateChoice): string {
    const lapse = this.certificateLapse(choice);
    if (!lapse) { return choice.name; }
    return this.translate.parser.interpolate(
      this.translate.instant(lapse.expired ? T('{{name}} (expired {{date}})') : T('{{name}} (expires {{date}})')),
      { name: choice.name, date: lapse.date },
    );
  }

  /**
   * What to know about the chosen certificate, under its field (the closed trigger only has room
   * for the name): that it has expired or is about to, and that it brings no chain -- chain.pem
   * is written all the same, empty.
   */
  certificateNote(index: number): string {
    const entry = (this.installDraft?.certificates || [])[index];
    const choice = entry ? this.certificateChoices.find((item) => item.id === entry.id) : null;
    if (!choice) { return ''; }
    const notes: string[] = [];
    const lapse = this.certificateLapse(choice);
    if (lapse) {
      notes.push(this.translate.parser.interpolate(
        this.translate.instant(
          lapse.expired ? T('This certificate expired on {{date}}.') : T('This certificate expires on {{date}}.'),
        ),
        { date: lapse.date },
      ));
    }
    if ((choice.chain_list || []).length < 2) {
      notes.push(this.translate.instant(T('This certificate has no chain: chain.pem stays empty.')));
    }
    return notes.join(' ');
  }

  addCertificate(): void {
    if (!this.installDraft) { return; }
    this.ensureCertificateChoices();
    this.installDraft.certificates = [...(this.installDraft.certificates || []), {
      id: null as unknown as number,
      name: '',
      fingerprint: '',
      target: '',
      restart_on_change: true,
      uid: null,
      gid: null,
    }];
  }

  removeCertificate(index: number): void {
    if (!this.installDraft) { return; }
    this.installDraft.certificates = this.installDraft.certificates
      .filter((_, position) => position !== index);
  }

  /**
   * The entry carries the name and fingerprint of the certificate it was bound to, so the
   * middleware can refuse a record that no longer names the same certificate. They are taken
   * from the choice, never typed.
   */
  certificateSelected(index: number): void {
    const entry = (this.installDraft?.certificates || [])[index];
    if (!entry) { return; }
    const choice = this.certificateChoices.find((item) => item.id === entry.id);
    entry.name = choice ? choice.name : '';
    entry.fingerprint = choice && choice.fingerprint ? choice.fingerprint : '';
  }

  /** The directory an entry writes into, and what the application finds there. */
  certificateFiles(index: number): string {
    const entry = (this.installDraft?.certificates || [])[index];
    const target = (entry?.target || '').trim().replace(/\/+$/, '');
    if (!target) { return ''; }
    return ['cert.pem', 'chain.pem', 'fullchain.pem', 'privkey.pem']
      .map((name) => `${target}/${name}`).join('  ');
  }

  certificateError(index: number): string {
    const entries = this.installDraft?.certificates || [];
    const entry = entries[index];
    if (!entry) { return ''; }
    if (!entry.id) { return this.translate.instant(T('Choose a certificate.')); }
    const target = (entry.target || '').trim();
    if (!target) { return this.translate.instant(T('Enter a directory.')); }
    if (!target.startsWith('/') || target === '/') {
      return this.translate.instant(T('Enter an absolute path below /.'));
    }
    if (target.endsWith('/') || target.includes('//') || /(^|\/)\.\.?(\/|$)/.test(target)) {
      return this.translate.instant(T('Enter a plain path, without a trailing slash or . and .. steps.'));
    }
    if (entries.some((item, position) => position !== index && (item.target || '').trim() === target)) {
      return this.translate.instant(T('This directory is already used.'));
    }
    const nested = entries.find((item, position) => {
      if (position === index) { return false; }
      const other = (item.target || '').trim();
      if (!other) { return false; }
      return target.startsWith(`${other}/`) || other.startsWith(`${target}/`);
    });
    if (nested) {
      return this.translate.instant(T('This directory and another certificate\'s contain one another.'));
    }
    const volume = (this.installDraft?.volumes || []).find((item) => {
      const mount = (item.target || '').trim();
      if (!mount) { return false; }
      return target === mount || target.startsWith(`${mount}/`) || mount.startsWith(`${target}/`);
    });
    if (volume) {
      return this.translate.parser.interpolate(
        this.translate.instant(T('Choose a directory outside the storage mounted at {{target}}.')),
        { target: volume.target },
      );
    }
    for (const field of ['uid', 'gid'] as const) {
      const value = entry[field];
      if (value !== null && value !== undefined && (!Number.isInteger(value) || value < 0)) {
        return this.translate.instant(T('A user or group id must be a whole number, 0 or more.'));
      }
    }
    return '';
  }

  get certificatesValid(): boolean {
    const entries = this.installDraft?.certificates || [];
    return entries.every((_, index) => !this.certificateError(index));
  }

  private certificatesPayload(): ApplicationCertificate[] {
    return (this.installDraft?.certificates || [])
      .filter((entry) => !!entry.id && !!(entry.target || '').trim())
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        fingerprint: entry.fingerprint,
        target: (entry.target || '').trim(),
        restart_on_change: entry.restart_on_change !== false,
        uid: entry.uid === null || entry.uid === undefined || (entry.uid as unknown as string) === ''
          ? null : Number(entry.uid),
        gid: entry.gid === null || entry.gid === undefined || (entry.gid as unknown as string) === ''
          ? null : Number(entry.gid),
      }));
  }

  submitEdit(): void {
    const application = this.editing;
    const draft = this.installDraft;
    this.store.reconfigure({
      name: application.name,
      compose_sha256: application.catalog?.compose_sha256 || null,
      ports: draft.ports.map((port) => ({
        host_port: port.host_port, container_port: port.container_port, protocol: port.protocol,
      })),
      environment: draft.environment.map((item) => ({
        name: item.name, value: item.value ? item.value : null,
      })),
      volumes: draft.volumes.map((volume) => ({
        name: volume.name, dataset: (volume.dataset || '').trim() || null,
      })),
      labels: this.labelsPayload(),
      // the internal development record: the list as the form has it; the middleware keeps the
      // installed one only when the field is null, which this page never sends.
      certificates: this.certificatesPayload(),
      restart_policy: draft.restart_policy,
      health_timeout: draft.health_timeout,
      network: applicationNetworkPayload(draft.network),
    });
    this.closeReview();
  }

  /**
   * the internal development record: an install under a name that has been used before
   * reattaches that name's app-owned data. Say so before the form is submitted.
   */
  nameChanged(): void {
    if (this.editing) { return; }
    if (this.reattachTimer) { clearTimeout(this.reattachTimer); }
    const name = (this.installDraft?.name || '').trim();
    if (!/^[a-z0-9][a-z0-9_.-]{0,62}$/.test(name) || !this.store.config?.configured) {
      this.reattachDatasets = [];
      return;
    }
    this.reattachTimer = setTimeout(() => {
      this.store.ownedDatasets(name).pipe(take(1), takeUntil(this.destroyed)).subscribe({
        next: (datasets) => {
          this.reattachDatasets = this.installDraft && this.installDraft.name.trim() === name
            ? (datasets || []).filter((item) => !item.parent) : [];
        },
        error: () => { this.reattachDatasets = []; },
      });
    }, 300);
  }

  orphanTotal(): number {
    return (this.store.orphans || []).filter((item) => !item.parent).reduce((sum, item) => sum + (item.used || 0), 0);
  }

  requestPrune(): void {
    if (this.store.activeJob || !this.store.orphans?.length) { return; }
    this.pendingPrune = true;
  }

  cancelPrune(): void {
    this.pendingPrune = false;
  }

  confirmPrune(): void {
    if (!this.pendingPrune || this.store.activeJob) { return; }
    this.pendingPrune = false;
    this.store.pruneData();
  }

  environmentDefinition(name: string): ApplicationEnvironment {
    if (!this.store.selectedDetail) {
      return null;
    }
    return this.store.selectedDetail.environment.find((item) => item.name === name);
  }

  canReplace(application: InstalledApplication): boolean {
    return !!(application.catalog?.id && this.store.config?.runtime_ready
      && !application.revoked && !this.store.activeJob && !this.store.detailLoading);
  }

  /**
   * the internal development record: under tag-following an update is the provider
   * publishing a newer package version, or a changed contract for the same one.
   * There is no revision ordering any more; the installed record remembers the
   * version and compose hash it was installed from and that is what is compared.
   */
  reviewReplacement(application: InstalledApplication, recreate: boolean): void {
    if (!this.canReplace(application)) { return; }
    this.store.operationError = '';
    const installedHash = application.catalog.compose_sha256 || null;
    const installedVersion = application.catalog.version || null;
    this.store.reviewReplacement(application).pipe(take(1), takeUntil(this.destroyed)).subscribe({
      next: (detail) => {
        if (!detail.available || !detail.catalog_app || detail.id !== application.catalog.id
          || !/^[0-9a-f]{64}$/.test(detail.catalog?.compose_sha256 || '')) {
          this.store.operationError = detail.reason || T('The current catalog entry is unavailable. Update the catalog and try again.');
          return;
        }
        const reviewedVersion = detail.catalog.version || null;
        const changed = reviewedVersion !== installedVersion
          || (!!installedHash && detail.catalog.compose_sha256 !== installedHash);
        if (recreate && changed) {
          this.store.operationError = T('A newer catalog version is available. Use Update to review it before recreating this application.');
          return;
        }
        if (!recreate && !changed) {
          this.dialog.confirm({ title: T('Application Up to Date'), message: T('This application already uses the current catalog version.'),
            hideCheckBox: true, hideCancel: true, buttonMsg: T('Close') });
          return;
        }
        const sameVersion = reviewedVersion === installedVersion;
        const label = (entry: { version?: string | null; compose_sha256?: string }) => {
          const version = escape(entry.version || this.translate.instant(T('unknown version')));
          if (!sameVersion || !entry.compose_sha256) { return version; }
          return this.translate.parser.interpolate(this.translate.instant(T('{{version}} (contract {{contract}})')),
            { version, contract: escape(entry.compose_sha256.slice(0, 12)) });
        };
        const action = recreate ? T('Recreate application <b>{{name}}</b>?') : T('Update application <b>{{name}}</b>?');
        const question = this.translate.parser.interpolate(this.translate.instant(action), { name: escape(application.name) });
        const versions = this.translate.parser.interpolate(
          this.translate.instant(T('Installed: {{installed}}. Available: {{reviewed}}.')),
          { installed: label(application.catalog), reviewed: label(detail.catalog) },
        );
        const effects = this.translate.instant(T('The application will be stopped and replaced. Saved settings and storage mappings will be retained. The application may modify its data.'));
        this.dialog.confirm({
          title: recreate ? T('Recreate Application') : T('Update Application'),
          message: `<p>${question}</p><p>${versions}</p><p>${escape(effects)}</p>`,
          buttonMsg: recreate ? T('Recreate') : T('Update'),
        }).pipe(take(1), takeUntil(this.destroyed)).subscribe((confirmed) => {
          if (confirmed && this.canReplace(application)
            && (application.catalog.compose_sha256 || null) === installedHash) {
            this.store.replace(application, detail, recreate);
          }
        });
      },
      error: (error) => { this.store.operationError = error?.reason || error?.message || T('Unable to review the application update.'); },
    });
  }

  requestRemoval(application: InstalledApplication): void {
    if (this.store.activeJob) { return; }
    this.pendingRemoval = application;
    this.removeOwnedData = false;
    this.removalDatasets = [];
    // the internal development record: the datasets the box decides about, listed where it is ticked.
    this.store.ownedDatasets(application.name).pipe(take(1), takeUntil(this.destroyed)).subscribe({
      next: (datasets) => {
        if (this.pendingRemoval === application) {
          this.removalDatasets = (datasets || []).filter((item) => !item.parent);
        }
      },
      error: () => { this.removalDatasets = []; },
    });
  }

  cancelRemoval(): void {
    this.pendingRemoval = null;
    this.removeOwnedData = false;
    this.removalDatasets = [];
  }

  confirmRemoval(): void {
    if (!this.pendingRemoval || this.store.activeJob) {
      return;
    }
    this.store.remove(this.pendingRemoval, this.removeOwnedData);
    this.cancelRemoval();
  }

  /** the internal development record: a shell inside the running container, on the web terminal page. */
  openShell(application: InstalledApplication): void {
    this.router.navigate(['/applications/shell', application.name]);
  }

  portalUrl(application: InstalledApplication): string {
    if (!application.portal) {
      return '';
    }
    const path = application.portal.path || '/';
    // the internal development record: a LAN-attached application publishes nothing -- the
    // portal lives on its own address, at the declared container port.
    if (application.network?.mode === 'lan' && application.network.address) {
      const declared = (application.ports || []).find((port) => (
        port.protocol === 'tcp' && port.host_port === application.portal.port
      ));
      const host = application.network.address.split('/')[0];
      const port = declared ? declared.container_port : application.portal.port;
      return `${application.portal.scheme}://${host}:${port}${path}`;
    }
    return `${application.portal.scheme}://${window.location.hostname}:${application.portal.port}${path}`;
  }

  openPortal(application: InstalledApplication): void {
    const url = this.portalUrl(application);
    if (url) { window.open(url, '_blank', 'noopener,noreferrer'); }
  }

  trackById(index: number, entry: ApplicationCatalogEntry): string {
    return entry.id;
  }

}
