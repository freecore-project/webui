import { CommonModule } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { BrnTabsImports } from '@spartan-ng/brain/tabs';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MaterialModule } from '../../appMaterial.module';
import { DialogService } from '../../services';
import { EntityModule } from '../common/entity/entity.module';
import { ApplicationsComponent } from './applications.component';
import { ApplicationsStore } from './applications.store';
import { CatalogListComponent } from './catalog-list/catalog-list.component';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';
import {
  expandInstalledRow, installedAction, installedDetail, installedTableProviders, publishInstalledRecords, settleInstalledTable, clearDialogs, dialogRoot,
} from './installed-applications-testing';

// the internal development record/#534: the page declares the catalog list child and the helm form kit
const HELM_KIT = [HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports, HlmFieldImports, HlmInputImports, HlmInputGroupImports,
  HlmSelectImports, HlmCheckboxImports, HlmLabelImports, HlmSpinnerImports, HlmTextareaImports, HlmRadioGroupImports,
  BrnTabsImports]; // the internal development record: Catalog / Installed

// the internal development record / the internal development record: crpb's sabnzbd -- config and downloads
// app-owned, downloads to move to the dataset radarr shares.
const detail: any = {
  id: 'daemonless:sabnzbd', title: 'SABnzbd', description: 'Usenet downloader', available: true, catalog_app: true,
  image: null, ports: [], annotations: [], health: null, portal: null,
  environment: [{ name: 'PUID', required: false, sensitive: false }, { name: 'API_KEY', required: true, sensitive: true }],
  volumes: [{ name: 'config', target: '/config', read_only: false }, { name: 'downloads', target: '/downloads', read_only: false }],
  catalog: { version: '5.1.3', compose_sha256: 'a'.repeat(64), source: 'live', fetched_at: 1 },
  install: {
    name: 'sabnzbd', restart_policy: 'always', health_timeout: 60,
    ports: [{ host_port: 8080, container_port: 8080, protocol: 'tcp' }],
    environment: [{ name: 'PUID', value: '1000' }, { name: 'API_KEY', value: '' }],
    volumes: [
      { name: 'config', target: '/config', dataset: null, read_only: false },
      { name: 'downloads', target: '/downloads', dataset: null, read_only: false },
    ],
  },
};
const installed: any = {
  name: 'sab', image: 'ghcr.io/daemonless/sabnzbd:latest', running: true, status: 'RUNNING', health: 'UNDECLARED',
  restart_policy: 'no',
  ports: [{ host_port: 18080, container_port: 8080, protocol: 'tcp' }],
  environment: [{ name: 'PUID', set: true }, { name: 'API_KEY', set: true }],
  volumes: [
    { name: 'config', target: '/config', dataset: 'tank/applications/data/sab/config', owned: true, read_only: false },
    { name: 'downloads', target: '/downloads', dataset: 'tank/applications/data/sab/downloads', owned: true, read_only: false },
  ],
  catalog: { id: 'daemonless:sabnzbd', version: '5.1.3', compose_sha256: 'a'.repeat(64) },
};
const owned = [
  { dataset: 'tank/applications/data/sab', application: 'sab', volume: null, parent: true, mountpoint: '/mnt/tank/applications/data/sab', used: 1000, owner: 'applications:sab', orphan: false },
  { dataset: 'tank/applications/data/sab/config', application: 'sab', volume: 'config', parent: false, mountpoint: '/mnt/x', used: 400 * 1024 * 1024, owner: 'applications:sab', orphan: false },
  { dataset: 'tank/applications/data/sab/downloads', application: 'sab', volume: 'downloads', parent: false, mountpoint: '/mnt/y', used: 3 * 1024 * 1024 * 1024, owner: 'applications:sab', orphan: false },
];

describe('Applications edit (the internal development record)', () => {
  let store: any;
  let router: any;

  beforeEach(async () => {
    store = {
      load: () => {}, clearLogs: () => {}, catalog: [], installed: [installed], pools: [], providers: [], orphans: [],
      config: { configured: true, runtime_ready: true, pool: 'tank', subnet: '10.88.0.0/16' },
      selectedDetail: null, activeJob: null, detailLoading: false, operationError: '',
      reviewCatalog: jasmine.createSpy('reviewCatalog').and.callFake(() => { store.selectedDetail = detail; return of(detail); }),
      ownedDatasets: jasmine.createSpy('ownedDatasets').and.returnValue(of(owned)),
      reconfigure: jasmine.createSpy('reconfigure'),
      interfaceChoices: jasmine.createSpy('interfaceChoices').and.returnValue(of({ em0: 'em0: Intel PRO/1000', igb0: 'igb0' })),
      pruneData: jasmine.createSpy('pruneData'),
      remove: jasmine.createSpy('remove'),
      clearReview: () => { store.selectedDetail = null; },
    };
    publishInstalledRecords(store);
    router = { navigate: jasmine.createSpy('navigate'), events: NEVER, url: '/applications' };
    await TestBed.configureTestingModule({
      declarations: [ApplicationsComponent, CatalogListComponent, InstalledApplicationsComponent],
      imports: [CommonModule, FormsModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), ...HELM_KIT],
      providers: [
        ...installedTableProviders(),
        { provide: ApplicationsStore, useValue: store },
        { provide: DialogService, useValue: {} }, { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
      ],
    }).compileComponents();
  });
  afterEach(() => { clearDialogs(); TestBed.resetTestingModule(); });

  async function installedTab() {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    return fixture;
  }

  it('offers Edit for a catalog application and pre-fills the review form from the record', async () => {
    const fixture = await installedTab();
    const details = await expandInstalledRow(fixture, 'sab');
    const editItem = installedAction(details, 'sab', 'edit');
    expect(editItem.textContent).toContain('Edit');
    editItem.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.reviewCatalog).toHaveBeenCalledWith({ id: 'daemonless:sabnzbd' });
    expect(store.ownedDatasets).toHaveBeenCalledWith('sab');
    const component = fixture.componentInstance;
    expect(component.editing).toBe(installed);
    expect(component.installDraft.name).toBe('sab');
    expect(component.installDraft.restart_policy).toBe('no');
    expect(component.installDraft.ports[0].host_port).toBe(18080);
    expect(component.installDraft.environment).toEqual([{ name: 'PUID', value: '' }, { name: 'API_KEY', value: '' }]);
    expect(component.installDraft.volumes.map((volume) => volume.dataset)).toEqual(['', '']);
    // the internal development record: Edit opens the settings dialog over the Installed tab; no tab switch
    expect(component.selectedTab).toBe('installed');
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = dialogRoot();
    const heading = dialog.querySelector('.install-panel .catalog-panel-title');
    expect(heading.textContent.replace(/\s+/g, ' ').trim()).toBe('Edit: sab');
    expect((dialog.querySelector('input[name="applicationName"]') as HTMLInputElement).readOnly).toBeTrue();
    expect(dialog.querySelector('button[type=submit]').textContent).toContain('Apply');
    // Nothing is required while editing: an empty value keeps the installed one.
    expect((dialog.querySelector('input[name="environment-1"]') as HTMLInputElement).required).toBeFalse();
    expect((dialog.querySelector('input[name="environment-1"]') as HTMLInputElement).placeholder).toBe('Unchanged');
  });

  it('returns Cancel in the edit dialog to the same expanded row and Edit control', async () => {
    const fixture = await installedTab();
    const details = await expandInstalledRow(fixture, 'sab');
    const editButton = installedAction(details, 'sab', 'edit');
    const table = fixture.nativeElement.querySelector('entity-table');
    editButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTab).toBe('installed'); // the internal development record: no tab switch
    expect(dialogRoot().querySelector('.install-panel')).not.toBeNull();

    (dialogRoot().querySelector('.install-panel .catalog-panel-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTab).toBe('installed');
    expect(fixture.nativeElement.querySelector('entity-table')).toBe(table);
    expect(fixture.nativeElement.querySelector('app-entity-table-row-details')).toBe(details);
    expect(installedAction(fixture.nativeElement, 'sab', 'edit')).toBe(editButton);
    expect(document.activeElement).toBe(editButton);
    expect(dialogRoot().querySelector('.install-panel')).toBeNull();
    fixture.destroy();
  });

  // -- the internal development record / the internal development record: container labels --------------------------------

  it('prefills labels from what is installed and submits the operator\'s set', async () => {
    const withLabels = { ...installed, labels: [{ name: 'traefik.enable', value: 'true' }] };
    store.installed = [withLabels];
    publishInstalledRecords(store);
    const fixture = await installedTab();
    const component = fixture.componentInstance;
    component.edit(withLabels);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.installDraft.labels).toEqual([{ name: 'traefik.enable', value: 'true' }]);

    component.addLabel();
    component.installDraft.labels[1] = { name: 'com.example/role', value: 'edge' };
    component.effectsReviewed = true;
    fixture.detectChanges();
    expect(component.canInstall()).toBeTrue();
    component.install();

    expect((store.reconfigure as any).calls.mostRecent().args[0].labels).toEqual([
      { name: 'traefik.enable', value: 'true' },
      { name: 'com.example/role', value: 'edge' },
    ]);
    fixture.destroy();
  });

  it('refuses a reserved, duplicate or malformed label name before the job starts', async () => {
    const fixture = await installedTab();
    const component = fixture.componentInstance;
    component.edit(installed);
    fixture.detectChanges();
    await fixture.whenStable();
    component.effectsReviewed = true;

    component.addLabel();
    component.installDraft.labels[0] = { name: 'io.freecore.managed', value: 'false' };
    expect(component.labelError(0)).toContain('reserved');
    expect(component.canInstall()).toBeFalse();

    component.installDraft.labels[0] = { name: 'has spaces', value: 'x' };
    expect(component.labelError(0)).toContain('letters');
    expect(component.canInstall()).toBeFalse();

    component.installDraft.labels[0] = { name: '', value: 'x' };
    expect(component.labelError(0)).toContain('Enter a name');

    component.installDraft.labels[0] = { name: 'a.key', value: 'one' };
    component.addLabel();
    component.installDraft.labels[1] = { name: 'a.key', value: 'two' };
    expect(component.labelError(1)).toContain('already used');
    expect(component.canInstall()).toBeFalse();

    component.removeLabel(1);
    expect(component.installDraft.labels.length).toBe(1);
    expect(component.labelError(0)).toBe('');
    expect(component.canInstall()).toBeTrue();
    fixture.destroy();
  });

  it('names what a storage change leaves behind and submits the bound reconfigure payload', async () => {
    const fixture = await installedTab();
    const component = fixture.componentInstance;
    component.edit(installed);
    fixture.detectChanges();
    await fixture.whenStable();

    // Moving downloads to the shared dataset keeps the owned one in place.
    component.installDraft.volumes[1].dataset = 'tank/media/downloads';
    fixture.detectChanges();
    const notes = Array.from(dialogRoot().querySelectorAll('[data-applications-volume-note]') as NodeListOf<HTMLElement>)
      .map((note) => note.textContent.trim());
    expect(notes).toEqual(['The app-owned dataset tank/applications/data/sab/downloads (3.0 GiB) stays in place; nothing is moved.']);

    component.installDraft.environment[1].value = 'new-key';
    component.installDraft.ports[0].host_port = 28080;
    component.effectsReviewed = true;
    fixture.detectChanges();
    expect(component.canInstall()).toBeTrue();
    component.install();

    expect(store.reconfigure).toHaveBeenCalledWith({
      name: 'sab', compose_sha256: 'a'.repeat(64),
      ports: [{ host_port: 28080, container_port: 8080, protocol: 'tcp' }],
      environment: [{ name: 'PUID', value: null }, { name: 'API_KEY', value: 'new-key' }],
      volumes: [{ name: 'config', dataset: null }, { name: 'downloads', dataset: 'tank/media/downloads' }],
      labels: [],
      // the internal development record: the page always states the mounted certificates
      certificates: [],
      restart_policy: 'no', health_timeout: 60,
      network: { mode: 'managed' },
    });
    expect(component.editing).toBeNull();
    expect(component.installDraft).toBeNull();
  });

  it('seeds, shows and submits a LAN attachment; the row and portal follow it (the internal development record)', async () => {
    const lanInstalled: any = {
      ...installed,
      network: { mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1' },
      portal: { scheme: 'http', port: 18080, path: '/' },
    };
    store.installed = [lanInstalled];
    const fixture = await installedTab();
    const component = fixture.componentInstance;

    // the row's detail lines name the attachment; the portal follows it to the
    // application's own address at the declared container port
    const details = await expandInstalledRow(fixture, 'sab');
    expect(installedDetail(details, 'Network')).toBe('LAN — 192.168.1.201 · em0');
    expect(component.portalUrl(lanInstalled)).toBe('http://192.168.1.201:8080/');

    component.edit(lanInstalled);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(store.interfaceChoices).toHaveBeenCalled();
    expect(component.installDraft.network).toEqual({
      mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
      managed_access: false,
    });
    // nothing is published on a LAN attachment: the heading flips, the
    // container ports are stated, and no host-port input renders
    expect((dialogRoot().querySelector('#applications-panel-ports') as HTMLElement).textContent.trim()).toBe('Ports');
    expect((dialogRoot().querySelector('[data-applications-lan-ports]') as HTMLElement).textContent).toContain('8080/tcp');
    expect(dialogRoot().querySelector('input[name="host-port-0"]')).toBeNull();

    component.effectsReviewed = true;
    expect(component.canInstall()).toBeTrue();
    component.install();
    expect(store.reconfigure).toHaveBeenCalledWith(jasmine.objectContaining({
      network: {
        mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
        managed_access: false,
      },
    }));

    // an incomplete attachment blocks submission
    component.edit(lanInstalled);
    fixture.detectChanges();
    await fixture.whenStable();
    component.effectsReviewed = true;
    component.installDraft.network.gateway = '';
    expect(component.canInstall()).toBeFalse();
  });

  it('shows the managed-bridge leg, seeds its checkbox and never sends the assigned address (the internal development record)', async () => {
    const dualInstalled: any = {
      ...installed,
      network: {
        mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
        managed_access: true, managed_address: '10.88.255.254',
      },
    };
    const backend: any = { ...installed, name: 'backend', bridge_address: '10.88.0.5' };
    store.installed = [dualInstalled, backend];
    const fixture = await installedTab();
    const component = fixture.componentInstance;

    const details = await expandInstalledRow(fixture, 'sab');
    expect(installedDetail(details, 'Network')).toBe('LAN — 192.168.1.201 · em0 · bridge 10.88.255.254');
    const backendDetails = await expandInstalledRow(fixture, 'backend');
    expect(installedDetail(backendDetails, 'Network')).toBe('Applications bridge — 10.88.0.5');

    component.edit(dualInstalled);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.installDraft.network.managed_access).toBeTrue();
    expect(dialogRoot().querySelector('[data-applications-managed-access]')).not.toBeNull();

    component.effectsReviewed = true;
    expect(component.canInstall()).toBeTrue();
    component.install();
    expect(store.reconfigure).toHaveBeenCalledWith(jasmine.objectContaining({
      network: {
        mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
        managed_access: true,
      },
    }));
  });

  it('says when moving a volume back to app-owned storage reattaches existing data', async () => {
    const external: any = { ...installed, volumes: [installed.volumes[0], { ...installed.volumes[1], dataset: 'tank/media/downloads', owned: false }] };
    store.installed = [external];
    store.ownedDatasets.and.returnValue(of([owned[0], owned[1], { ...owned[2], volume: null, orphan: true }]));
    const fixture = await installedTab();
    const component = fixture.componentInstance;
    component.edit(external);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.installDraft.volumes[1].dataset).toBe('tank/media/downloads');
    component.installDraft.volumes[1].dataset = '';
    expect(component.volumeNote(component.installDraft.volumes[1]))
      .toBe('Existing app-owned data for this volume (tank/applications/data/sab/downloads, 3.0 GiB) will be reattached.');
    expect(component.volumeNote(component.installDraft.volumes[0])).toBe('');
  });

  it('lists the datasets a Remove keeps or deletes, following the checkbox', async () => {
    const fixture = await installedTab();
    const component = fixture.componentInstance;
    component.requestRemoval(installed);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const list = () => fixture.nativeElement.querySelector('[data-applications-removal-datasets]') as HTMLElement;
    expect(list().textContent).toContain('are kept, and an application installed under the same name reattaches them');
    expect(list().textContent).toContain('tank/applications/data/sab/config');
    expect(list().textContent).toContain('400 MiB');
    expect(list().textContent).not.toContain('tank/applications/data/sab ·');
    component.removeOwnedData = true;
    fixture.detectChanges();
    expect(list().textContent).toContain('will be deleted');
    component.confirmRemoval();
    expect(store.remove).toHaveBeenCalledWith(installed, true);
  });

  it('warns that an install under a used name reattaches that name\'s data', fakeAsync(() => {
    store.ownedDatasets.and.callFake((name: string) => of(name === 'sab' ? owned : []));
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    store.selectedDetail = detail;
    component.openInstall(); // the internal development record: the settings dialog
    fixture.detectChanges();
    component.installDraft.name = 'sab';
    component.nameChanged();
    tick(300);
    fixture.detectChanges();
    const notice = dialogRoot().querySelector('[data-applications-reattach]') as HTMLElement;
    expect(notice.textContent).toContain('will be reattached');
    expect(notice.textContent).toContain('tank/applications/data/sab/downloads');
    component.installDraft.name = 'fresh';
    component.nameChanged();
    tick(300);
    fixture.detectChanges();
    expect(dialogRoot().querySelector('[data-applications-reattach]')).toBeNull();
  }));

  it('lists orphaned app-owned data and deletes it only after a confirmation that names it', async () => {
    store.orphans = [
      { dataset: 'tank/applications/data/gone', application: 'gone', volume: null, parent: true, mountpoint: '/mnt/g', used: 10, owner: 'applications:gone', orphan: true },
      { dataset: 'tank/applications/data/gone/config', application: 'gone', volume: null, parent: false, mountpoint: '/mnt/g/c', used: 2 * 1024 * 1024, owner: 'applications:gone', orphan: true },
    ];
    const fixture = await installedTab();
    const section = fixture.nativeElement.querySelector('[data-applications-orphans]') as HTMLElement;
    expect(section.textContent).toContain('tank/applications/data/gone/config');
    expect(section.textContent).toContain('2.0 MiB');
    expect(Array.from(section.querySelectorAll('th')).map((cell) => cell.textContent.trim())).toEqual(['Dataset', 'Used']);
    expect(section.querySelectorAll('tbody tr').length).toBe(1);
    expect(section.querySelector('tbody td').textContent).toBe('tank/applications/data/gone/config');
    (section.querySelector('[data-applications-action="prune-data"]') as HTMLElement).click();
    fixture.detectChanges();
    const confirm = fixture.nativeElement.querySelector('[data-applications-prune-confirm]') as HTMLElement;
    expect(confirm.textContent).toContain('cannot be undone');
    expect(confirm.textContent).toContain('tank/applications/data/gone/config');
    expect(store.pruneData).not.toHaveBeenCalled();
    fixture.componentInstance.confirmPrune();
    expect(store.pruneData).toHaveBeenCalled();
  });
  describe('ports kept on the Applications bridge (the internal development record)', () => {
    // a web port the portal opens, and a second port only sibling applications need
    const twoPortDetail: any = {
      ...detail,
      portal: { scheme: 'http', port: 8080, path: '/' },
      install: {
        ...detail.install,
        ports: [
          { host_port: 8080, container_port: 8080, protocol: 'tcp' },
          { host_port: 9090, container_port: 9090, protocol: 'tcp' },
        ],
        portal: { scheme: 'http', port: 8080, path: '/' },
      },
    };
    const bridgeInstalled: any = {
      ...installed,
      bridge_address: '10.88.0.5',
      ports: [
        { host_port: 18080, container_port: 8080, protocol: 'tcp' },
        { host_port: null, container_port: 9090, protocol: 'tcp' },
      ],
      portal: { scheme: 'http', port: 18080, path: '/' },
    };

    beforeEach(() => {
      store.reviewCatalog.and.callFake(() => { store.selectedDetail = twoPortDetail; return of(twoPortDetail); });
    });

    async function settle(fixture: any) {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('names where each port answers in the row detail', async () => {
      store.installed = [bridgeInstalled];
      const fixture = await installedTab();
      const details = await expandInstalledRow(fixture, 'sab');
      expect(installedDetail(details, 'Port mapping')).toBe('18080 → 8080/tcp · 10.88.0.5:9090/tcp (Applications bridge)');
    });

    it('edits a bridge-only port, keeps the portal port published and publishes it again', async () => {
      store.installed = [bridgeInstalled];
      const fixture = await installedTab();
      const component = fixture.componentInstance;
      component.edit(bridgeInstalled);
      await settle(fixture);

      const [web, side] = component.installDraft.ports;
      expect(side.host_port).toBeNull();
      expect(component.isBridgeOnly(side)).toBeTrue();
      expect(component.isPortalPort(web)).toBeTrue();
      const element = dialogRoot();
      expect(element.querySelector('input[name="host-port-0"]')).not.toBeNull();
      expect(element.querySelector('input[name="host-port-1"]')).toBeNull();
      expect(element.querySelector('[data-applications-bridge-port]').textContent).toContain('9090/tcp');
      expect(element.querySelector('[data-applications-bridge-note]')).not.toBeNull();
      expect(element.querySelector('#applications-panel-ports').textContent.trim()).toBe('Ports');

      // the portal is a link on the host: its port cannot be kept on the bridge
      component.setPortPublished(web, false);
      expect(component.isBridgeOnly(web)).toBeFalse();
      expect(web.host_port).toBe(18080);

      component.effectsReviewed = true;
      expect(component.canInstall()).toBeTrue();
      component.install();
      expect(store.reconfigure).toHaveBeenCalledWith(jasmine.objectContaining({
        ports: [
          { host_port: 18080, container_port: 8080, protocol: 'tcp' },
          { host_port: null, container_port: 9090, protocol: 'tcp' },
        ],
      }));

      // published again, the port gets the reviewed entry's host port back
      component.edit(bridgeInstalled);
      await settle(fixture);
      const again = component.installDraft.ports[1];
      component.setPortPublished(again, true);
      await settle(fixture);
      expect(again.host_port).toBe(9090);
      expect(dialogRoot().querySelector('input[name="host-port-1"]')).not.toBeNull();
      component.effectsReviewed = true;
      component.install();
      expect(store.reconfigure.calls.mostRecent().args[0].ports[1]).toEqual(
        { host_port: 9090, container_port: 9090, protocol: 'tcp' },
      );
    });

    it('installs with a port left unpublished and still requires a published one to have a value', async () => {
      store.install = jasmine.createSpy('install');
      store.installed = [];
      const fixture = await installedTab();
      const component = fixture.componentInstance;
      store.selectedDetail = twoPortDetail;
      component.selectedTab = 'catalog';
      component.openInstall(); // the internal development record: the settings dialog
      await settle(fixture);
      component.installDraft.name = 'sab';
      component.installDraft.environment = [{ name: 'PUID', value: '1000' }, { name: 'API_KEY', value: 'k' }];
      component.effectsReviewed = true;

      const side = component.installDraft.ports[1];
      side.host_port = null;
      expect(component.canInstall()).toBeFalse();
      side.host_port = 9091;
      // the checkbox drives the choice; the typed port comes back when published again
      (dialogRoot().querySelector('#app-port-publish-1') as HTMLElement).click();
      await settle(fixture);
      expect(component.isBridgeOnly(side)).toBeTrue();
      expect(side.host_port).toBeNull();
      expect(component.canInstall()).toBeTrue();
      component.install();
      expect(store.install.calls.mostRecent().args[0].ports).toEqual([
        { host_port: 8080, container_port: 8080, protocol: 'tcp' },
        { host_port: null, container_port: 9090, protocol: 'tcp' },
      ]);
      component.setPortPublished(side, true);
      expect(side.host_port).toBe(9091);
    });
  });
});
