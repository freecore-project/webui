import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { T } from '../../../translate-marker';
import {
  EntityTableAction, EntityTableComponent, EntityTableStatusIcon, InputTableConf,
} from '../../common/entity/entity-table/entity-table.component';
import type { ApplicationsComponent } from '../applications.component';
import { ApplicationsStore } from '../applications.store';
import { InstalledApplication } from '../applications.types';

/** the internal development record: the Installed tab uses the same table and detail strip as Jails. */
@Component({
  standalone: false,
  selector: 'app-installed-applications',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
  styleUrls: ['./installed-applications.component.scss'],
})
export class InstalledApplicationsComponent implements InputTableConf, OnChanges, OnDestroy {
  @Input() page: ApplicationsComponent;
  @Input() active = false;
  @ViewChild(EntityTableComponent) table: EntityTableComponent;

  title = T('Installed Applications');
  queryCall = 'applications.query';
  rowIdentifier = 'name';
  sortKey = 'name';
  autoFillWindowHeight = true;
  alwaysShowDetails = true;
  wrapRowActions = true;
  columns = [
    { name: T('Name'), prop: 'name', always_display: true },
    { name: T('State'), prop: 'state_label' },
    { name: T('Restart policy'), prop: 'restart_policy' },
    { name: T('Image'), prop: 'image', hidden: true },
    { name: T('Network'), prop: 'network_label', hidden: true },
    { name: T('Ports'), prop: 'ports_label', hidden: true },
    { name: T('Certificates'), prop: 'certificates_label', hidden: true },
    { name: T('Source'), prop: 'source_label', hidden: true },
    { name: T('OS'), prop: 'os_label', hidden: true },
  ];
  config = { paging: true, sorting: { columns: this.columns }, multiSelect: false };
  custActions: any[];
  private connected = false;
  private destroyed = new Subject<void>();
  private layoutTimer: ReturnType<typeof setTimeout>;
  private focusTimer: ReturnType<typeof setTimeout>;

  constructor(public store: ApplicationsStore, private translate: TranslateService, private host: ElementRef<HTMLElement>) {
    this.custActions = [{
      id: 'refresh', name: T('Refresh'),
      get disabled() { return store.coreLoading || !!store.activeJob; },
      function: () => this.refresh(),
    }];
  }

  ngOnChanges(): void { this.scheduleLayout(); }

  ngOnDestroy(): void {
    clearTimeout(this.layoutTimer);
    clearTimeout(this.focusTimer);
    this.destroyed.next();
    this.destroyed.complete();
  }

  callGetFunction(entity: EntityTableComponent): void {
    if (this.connected) { return; }
    this.connected = true;
    entity.getFunction = this.store.installed$.pipe(
      filter((rows) => rows !== null),
      takeUntil(this.destroyed),
    );
    entity.callGetFunction();
  }

  resourceTransformIncomingRestData(applications: InstalledApplication[]): any[] {
    return applications.map((application) => {
      const status = String(application.status || 'unknown').toLowerCase();
      // Use Jails' ordinary state vocabulary without hiding exceptional runtime states.
      const label = status === 'running' ? this.translate.instant(T('up'))
        : status === 'exited' || status === 'stopped' ? this.translate.instant(T('down')) : status;
      return {
        ...application,
        id: application.name,
        state_label: [label, application.error].filter(Boolean).join(' — '),
        network_label: application.network?.mode === 'lan'
          ? `LAN — ${(application.network.address || '').split('/')[0]} · ${application.network.interface}`
            + (application.network.managed_address ? ` · bridge ${application.network.managed_address}` : '')
          : application.bridge_address
            ? `${this.translate.instant(T('Applications bridge'))} — ${application.bridge_address}`
            : this.translate.instant(T('Applications bridge')),
        ports_label: this.portsLabel(application),
        certificates_label: this.certificatesLabel(application),
        source_label: this.sourceLabel(application),
        os_label: application.image_os === 'linux' ? this.translate.instant(T('Linux · experimental'))
          : application.image_os === 'freebsd' ? 'FreeBSD' : this.translate.instant(T('Unknown')),
      };
    });
  }

  /** A running process is not a health result; undeclared checks have no indicator. */
  getCellStatusIcon(application: InstalledApplication, column: { prop: string }): EntityTableStatusIcon | null {
    if (column.prop !== 'state_label' || !application.running) { return null; }
    const health = (application.health || 'UNKNOWN').toUpperCase();
    if (application.health_declared === false || health === 'UNDECLARED') { return null; }
    const concreteResult = ['HEALTHY', 'UNHEALTHY', 'STARTING'].includes(health);
    if (application.health_declared !== true && (application.health_declared !== undefined || !concreteResult)) { return null; }

    const result = concreteResult ? health : 'UNKNOWN';
    const indicators: Record<string, Pick<EntityTableStatusIcon, 'icon' | 'tone'>> = {
      HEALTHY: { icon: 'check_circle', tone: 'success' },
      UNHEALTHY: { icon: 'error_outline', tone: 'error' },
      STARTING: { icon: 'schedule', tone: 'warning' },
      UNKNOWN: { icon: 'help_outline', tone: 'neutral' },
    };
    const label = `${this.translate.instant(T('Health'))}: ${this.translate.instant(this.page.healthLabel(result))}`;
    return { ...indicators[result], label, tooltip: `${label}. ${this.translate.instant(this.page.healthHint(result))}` };
  }

  /**
   * the internal development record: where each declared port answers -- a published host port, or
   * the bridge address for a port kept on the Applications bridge (and the LAN address of a
   * LAN attachment, which publishes nothing).
   */
  private portsLabel(application: InstalledApplication): string {
    const ports = application.ports || [];
    if (!ports.length) { return this.translate.instant(T('None')); }
    const lan = application.network?.mode === 'lan' ? (application.network.address || '').split('/')[0] : '';
    const bridge = this.translate.instant(T('Applications bridge'));
    return ports.map((port) => {
      const declared = `${port.container_port}/${port.protocol}`;
      if (lan) { return `${lan}:${declared}`; }
      if (port.host_port !== null && port.host_port !== undefined) { return `${port.host_port} → ${declared}`; }
      return application.bridge_address
        ? `${application.bridge_address}:${declared} (${bridge})`
        : `${declared} (${bridge})`;
    }).join(' · ');
  }

  /** the internal development record: which system certificate appears where inside the container. */
  private certificatesLabel(application: InstalledApplication): string {
    const certificates = application.certificates || [];
    if (!certificates.length) { return this.translate.instant(T('None')); }
    return certificates.map((entry) => `${entry.name} → ${entry.target}`).join(' · ');
  }

  private sourceLabel(application: InstalledApplication): string {
    const origin = application.origin;
    if (origin?.kind === 'byo' || origin?.kind === 'convert') {
      return [this.translate.instant(origin.kind === 'byo' ? T('Unreviewed') : T('Converted')), origin.reference]
        .filter(Boolean).join(' — ');
    }
    return application.catalog?.id
      ? `${this.translate.instant(T('Catalog'))} — ${application.catalog.id}`
      : this.translate.instant(T('Unknown'));
  }

  dataHandler(): void { this.scheduleLayout(); }

  refresh(): void {
    if (this.store.coreLoading || this.store.activeJob) { return; }
    this.table?.setShowSpinner(true);
    this.store.loadCore();
  }

  private current(row: InstalledApplication): InstalledApplication {
    return this.store.installed.find((application) => application.name === row.name) || row;
  }

  isActionVisible(id: string, row: InstalledApplication): boolean {
    const application = this.current(row);
    if (['edit', 'update', 'recreate'].includes(id)) { return !!application.catalog; }
    if (['restart', 'stop', 'shell'].includes(id)) { return !!application.running; }
    if (id === 'start') { return !application.running; }
    if (id === 'portal') { return !!application.portal; }
    // the internal development record: part of Convert & Import, so only when that is enabled.
    if (id === 'export') { return this.page.convertEnabled; }
    return true;
  }

  getActions(row: InstalledApplication): EntityTableAction[] {
    const conf = this;
    const actions: [string, string, string, (application: InstalledApplication) => void][] = [
      ['edit', 'edit', T('Edit'), (application) => this.page.edit(application)],
      ['start', 'play_arrow', T('Start'), (application) => this.store.start(application)],
      ['restart', 'replay', T('Restart'), (application) => this.store.restart(application)],
      ['stop', 'stop', T('Stop'), (application) => this.store.stop(application)],
      ['update', 'system_update_alt', T('Update'), (application) => this.page.reviewReplacement(application, false)],
      ['recreate', 'refresh', T('Recreate'), (application) => this.page.reviewReplacement(application, true)],
      ['shell', 'terminal', T('Shell'), (application) => this.page.openShell(application)],
      ['logs', 'description', T('Logs'), (application) => this.store.loadLogs(application)],
      ['portal', 'open_in_new', T('Open Portal'), (application) => this.page.openPortal(application)],
      ['export', 'output', T('Export for Linux'), (application) => this.page.openExport(application)],
      ['delete', 'delete', T('Delete'), (application) => this.page.requestRemoval(application)],
    ];
    return actions.map(([id, icon, label, invoke]) => ({
      id, icon, label, name: row.name,
      // The engine retains these objects while the expander is open; the guard must stay live.
      get disabled() {
        if (['shell', 'logs', 'portal'].includes(id)) { return false; }
        if (['edit', 'update', 'recreate'].includes(id)) { return !conf.page.canReplace(conf.current(row)); }
        return !!conf.store.activeJob || conf.store.detailLoading;
      },
      onClick() {
        if (!this.disabled && conf.isActionVisible(id, row)) { invoke(conf.current(row)); }
      },
    }));
  }

  /** Material tabs retain their contents, but the table can only measure while visible. */
  private scheduleLayout(): void {
    clearTimeout(this.layoutTimer);
    this.layoutTimer = setTimeout(() => {
      if (!this.active || !this.table) { return; }
      this.table.table?.recalculate();
      window.dispatchEvent(new Event('resize'));
      this.table.updateTableHeightAfterDetailToggle();
    });
  }

  focusEdit(name: string): void {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const button = this.host.nativeElement.querySelector<HTMLButtonElement>(`#${CSS.escape(`action_button_${name}__edit`)}`);
      button?.focus({ preventScroll: true });
    });
  }
}
