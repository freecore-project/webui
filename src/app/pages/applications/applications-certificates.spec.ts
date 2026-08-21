import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of, Subject, throwError } from 'rxjs';
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
  expandInstalledRow, installedAction, installedDetail, installedTableProviders, publishInstalledRecords, settleInstalledTable, clearDialogs, dialogRoot, openInstallDialog,
} from './installed-applications-testing';

const HELM_KIT = [HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports, HlmFieldImports, HlmInputImports,
  HlmInputGroupImports, HlmSelectImports, HlmCheckboxImports, HlmLabelImports, HlmSpinnerImports, HlmTextareaImports,
  HlmRadioGroupImports, BrnTabsImports];

// the internal development record / the internal development record: the certificates the store offers, and the ones it must not.
// As certificate.query answers the store's field selection: never a private key, only whether
// one is usable (key_length) and what the chain holds.
const certificates: any[] = [
  { id: 4, name: 'wildcard.example', fingerprint: 'AA:BB', until: 'Mon Jan  1 00:00:00 2099', revoked: false, cert_type_CSR: false, key_length: 2048, chain_list: ['leaf', 'intermediate'] },
  { id: 5, name: 'acme.example', fingerprint: 'CC:DD', until: 'Thu Jan  1 00:00:00 2099', revoked: false, cert_type_CSR: false, key_length: 256, chain_list: ['leaf'] },
  { id: 6, name: 'revoked.example', fingerprint: 'EE:FF', until: null, revoked: true, cert_type_CSR: false, key_length: 2048, chain_list: ['leaf'] },
  { id: 7, name: 'pending.example', fingerprint: null, until: null, revoked: false, cert_type_CSR: true, key_length: 2048, chain_list: [] },
  { id: 8, name: 'keyless.example', fingerprint: 'AB:CD', until: 'Thu Jan  1 00:00:00 2099', revoked: false, cert_type_CSR: false, key_length: null, chain_list: ['leaf'] },
];

/** `until` as the middleware writes it (ctime), a number of days from now. */
function until(days: number): string {
  const when = new Date(Date.now() + days * 86400000);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][when.getDay()]} `
    + `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][when.getMonth()]} `
    + `${String(when.getDate()).padStart(2, ' ')} ${pad(when.getHours())}:${pad(when.getMinutes())}:${pad(when.getSeconds())} `
    + `${when.getFullYear()}`;
}

function day(days: number): string {
  const when = new Date(Date.now() + days * 86400000);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
}

const detail: any = {
  id: 'daemonless:homepage', title: 'Homepage', description: 'Dashboard', available: true, catalog_app: true,
  image: null, ports: [], annotations: [], health: null, portal: null, environment: [], labels: [],
  volumes: [{ name: 'config', target: '/config', read_only: false }],
  catalog: { version: '1.0.0', compose_sha256: 'a'.repeat(64), source: 'live', fetched_at: 1 },
  install: {
    name: 'homepage', restart_policy: 'always', health_timeout: 60,
    ports: [{ host_port: 3000, container_port: 3000, protocol: 'tcp' }],
    environment: [], labels: [],
    volumes: [{ name: 'config', target: '/config', dataset: null, read_only: false }],
  },
};

const installed: any = {
  name: 'homepage', image: 'ghcr.io/daemonless/homepage:latest', running: true, status: 'RUNNING',
  health: 'UNDECLARED', restart_policy: 'always',
  ports: [{ host_port: 3000, container_port: 3000, protocol: 'tcp' }],
  environment: [], labels: [],
  certificates: [{
    id: 4, name: 'wildcard.example', fingerprint: 'AA:BB', target: '/certs',
    restart_on_change: true, uid: null, gid: null,
  }],
  volumes: [{ name: 'config', target: '/config', dataset: 'tank/applications/data/homepage/config', owned: true, read_only: false }],
  catalog: { id: 'daemonless:homepage', version: '1.0.0', compose_sha256: 'a'.repeat(64) },
};

describe('Applications certificates (the internal development record, the internal development record)', () => {
  let store: any;

  beforeEach(async () => {
    store = {
      load: () => {}, clearLogs: () => {}, catalog: [], installed: [installed], pools: [], providers: [], orphans: [],
      config: { configured: true, runtime_ready: true, pool: 'tank', subnet: '10.88.0.0/16' },
      selectedDetail: null, activeJob: null, detailLoading: false, operationError: '',
      reviewCatalog: jasmine.createSpy('reviewCatalog').and.callFake(() => { store.selectedDetail = detail; return of(detail); }),
      ownedDatasets: jasmine.createSpy('ownedDatasets').and.returnValue(of([])),
      reconfigure: jasmine.createSpy('reconfigure'),
      install: jasmine.createSpy('install'),
      interfaceChoices: jasmine.createSpy('interfaceChoices').and.returnValue(of({})),
      certificateChoices: jasmine.createSpy('certificateChoices').and.returnValue(of(certificates)),
      pruneData: jasmine.createSpy('pruneData'),
      remove: jasmine.createSpy('remove'),
      clearReview: () => { store.selectedDetail = null; },
    };
    publishInstalledRecords(store);
    await TestBed.configureTestingModule({
      declarations: [ApplicationsComponent, CatalogListComponent, InstalledApplicationsComponent],
      imports: [CommonModule, FormsModule, EntityModule, MaterialModule, NoopAnimationsModule,
        TranslateModule.forRoot(), ...HELM_KIT],
      providers: [
        ...installedTableProviders(),
        { provide: ApplicationsStore, useValue: store },
        { provide: DialogService, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate'), events: NEVER, url: '/applications' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
      ],
    }).compileComponents();
  });
  afterEach(() => { clearDialogs(); TestBed.resetTestingModule(); });

  async function review() {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.review({ id: 'daemonless:homepage' } as any);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await openInstallDialog(fixture); // the internal development record: the settings open in a dialog
    return fixture;
  }

  async function edit() {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    await settleInstalledTable(fixture);
    const details = await expandInstalledRow(fixture, 'homepage');
    installedAction(details, 'homepage', 'edit').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('offers only the certificates an application may mount', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    // the list is fetched when there is a reason to: opening a review alone costs no call
    expect(store.certificateChoices).not.toHaveBeenCalled();
    component.addCertificate();

    expect(store.certificateChoices).toHaveBeenCalled();
    // a revoked certificate, a signing request and a certificate without a usable key are not mountable
    expect(component.certificateChoices.map((choice) => choice.id)).toEqual([4, 5]);
  });

  it('marks an expired certificate and one about to expire: in the list, and under the field once chosen', async () => {
    store.certificateChoices.and.returnValue(of([
      certificates[0],
      { ...certificates[1], id: 11, name: 'lapsed.example', until: until(-3) },
      { ...certificates[1], id: 12, name: 'soon.example', until: until(12) },
      { ...certificates[1], id: 13, name: 'later.example', until: until(200) },
    ]));
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();

    // neither is refused -- a renewal is the normal case -- but neither goes unsaid
    expect(component.certificateChoices.map((choice) => component.certificateChoiceText(choice))).toEqual([
      'wildcard.example',
      `lapsed.example (expired ${day(-3)})`,
      `soon.example (expires ${day(12)})`,
      'later.example',
    ]);
    // the closed trigger has room for the name only; the field's own line says the rest
    expect(component.certificateLabel(11)).toBe('lapsed.example');
    const note = async (id: number): Promise<string> => {
      component.installDraft.certificates[0].id = id;
      component.certificateSelected(0);
      component.installDraft.certificates[0].target = '/certs';
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return dialogRoot().querySelector('[data-applications-certificate-note]')?.textContent.trim() || '';
    };
    expect(await note(11)).toBe(
      `This certificate expired on ${day(-3)}. This certificate has no chain: chain.pem stays empty.`,
    );
    expect(await note(12)).toContain(`This certificate expires on ${day(12)}.`);
    expect(await note(4)).toBe('');
  });

  it('says when the chosen certificate has no chain, so an empty chain.pem is no surprise', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();
    const note = (): string => dialogRoot()
      .querySelector('[data-applications-certificate-note]')?.textContent.trim() || '';

    component.installDraft.certificates[0].id = 5;
    component.certificateSelected(0);
    component.installDraft.certificates[0].target = '/certs';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(note()).toBe('This certificate has no chain: chain.pem stays empty.');

    component.installDraft.certificates[0].id = 4;
    component.certificateSelected(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(note()).toBe('');
  });

  it('names each mounted certificate and its directory in the installed detail', async () => {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.componentInstance.selectedTab = 'installed';
    const details = await expandInstalledRow(fixture, 'homepage');

    expect(installedDetail(details, 'Certificates')).toBe('wildcard.example → /certs');
  });

  it('starts an install with no certificate: the catalog entry declares none', async () => {
    const fixture = await review();

    expect(fixture.componentInstance.installDraft.certificates).toEqual([]);
    expect(dialogRoot().querySelector('[data-applications-certificates-empty]').textContent)
      .toContain('No certificate is mounted');
    expect(dialogRoot().querySelector<HTMLDetailsElement>('details[data-applications-extras]').open).toBeFalse(); // folded: nothing in it
  });

  it('starts an edit from the certificates the application has', async () => {
    const fixture = await edit();

    expect(fixture.componentInstance.installDraft.certificates).toEqual([{
      id: 4, name: 'wildcard.example', fingerprint: 'AA:BB', target: '/certs',
      restart_on_change: true, uid: null, gid: null,
    }]);
    expect(dialogRoot().querySelectorAll('[data-applications-certificate-row]').length).toBe(1);
    expect(dialogRoot().querySelector<HTMLDetailsElement>('details[data-applications-extras]').open).toBeTrue(); // unfolded: it holds one
  });

  it('names an edit row by its certificate once the list arrives, never by its id', async () => {
    // The list lands after the row is drawn, as it does over the wire: the closed trigger must not
    // keep the bare id it was given first.
    const choices = new Subject<any[]>();
    store.certificateChoices.and.returnValue(choices);
    const fixture = await edit();
    const trigger = (): string => dialogRoot().querySelector('#app-certificate-id-0').textContent.trim();

    expect(trigger()).toBe('wildcard.example');
    choices.next([{ ...certificates[0], name: 'renamed.example' }, certificates[1]]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(trigger()).toBe('renamed.example');
    expect(trigger()).not.toBe('4');
  });

  it('takes the name and the fingerprint from the chosen certificate, never from the form', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();
    component.installDraft.certificates[0].id = 5;
    component.certificateSelected(0);

    expect(component.installDraft.certificates[0].name).toBe('acme.example');
    expect(component.installDraft.certificates[0].fingerprint).toBe('CC:DD');
  });

  it('names the four files the application will find', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();
    component.installDraft.certificates[0].target = '/certs/';

    expect(component.certificateFiles(0))
      .toBe('/certs/cert.pem  /certs/chain.pem  /certs/fullchain.pem  /certs/privkey.pem');
  });

  it('refuses a directory that is not an absolute plain path, and blocks the submit', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    // the other install gates are satisfied, so canInstall() answers for the certificates alone
    component.effectsReviewed = true;
    expect(component.canInstall()).toBeTrue();
    component.addCertificate();
    const entry = component.installDraft.certificates[0];
    entry.id = 4;
    component.certificateSelected(0);

    entry.target = '';
    expect(component.certificateError(0)).toBe('Enter a directory.');
    entry.target = 'certs';
    expect(component.certificateError(0)).toBe('Enter an absolute path below /.');
    entry.target = '/certs/../etc';
    expect(component.certificateError(0)).toContain('without a trailing slash');
    expect(component.certificatesValid).toBeFalse();
    expect(component.canInstall()).toBeFalse();

    entry.target = '/certs';
    expect(component.certificateError(0)).toBe('');
    expect(component.certificatesValid).toBeTrue();
  });

  it('refuses a directory inside the storage the application mounts', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();
    const entry = component.installDraft.certificates[0];
    entry.id = 4;
    component.certificateSelected(0);
    entry.target = '/config/certs';

    expect(component.certificateError(0)).toContain('outside the storage mounted at /config');
  });

  it('refuses two entries that share or contain one another', async () => {
    const fixture = await review();
    const component = fixture.componentInstance;
    component.addCertificate();
    component.addCertificate();
    component.installDraft.certificates.forEach((item, index) => {
      item.id = index === 0 ? 4 : 5;
      component.certificateSelected(index);
    });
    const [first, second] = component.installDraft.certificates;
    first.target = '/certs';
    second.target = '/certs';
    expect(component.certificateError(1)).toBe('This directory is already used.');

    second.target = '/certs/inner';
    expect(component.certificateError(1)).toContain('contain one another');

    second.target = '/tls';
    expect(component.certificatesValid).toBeTrue();
  });

  it('sends the entries an edit has, with a blank owner id as null', async () => {
    const fixture = await edit();
    const component = fixture.componentInstance;
    component.addCertificate();
    const added = component.installDraft.certificates[1];
    added.id = 5;
    component.certificateSelected(1);
    added.target = '/tls';
    added.restart_on_change = false;
    added.uid = '' as any;
    added.gid = 568 as any;
    component.submitEdit();

    expect(store.reconfigure).toHaveBeenCalled();
    const payload = store.reconfigure.calls.mostRecent().args[0];
    expect(payload.certificates).toEqual([
      { id: 4, name: 'wildcard.example', fingerprint: 'AA:BB', target: '/certs', restart_on_change: true, uid: null, gid: null },
      { id: 5, name: 'acme.example', fingerprint: 'CC:DD', target: '/tls', restart_on_change: false, uid: null, gid: 568 },
    ]);
  });

  it('drops an unfinished row rather than sending half an entry', async () => {
    const fixture = await edit();
    const component = fixture.componentInstance;
    component.addCertificate();
    component.submitEdit();

    const payload = store.reconfigure.calls.mostRecent().args[0];
    expect(payload.certificates.length).toBe(1);
    expect(payload.certificates[0].id).toBe(4);
  });

  it('removing every row sends an empty list, which clears the mounts', async () => {
    const fixture = await edit();
    const component = fixture.componentInstance;
    component.removeCertificate(0);
    component.submitEdit();

    expect(store.reconfigure.calls.mostRecent().args[0].certificates).toEqual([]);
  });

  it('says so when the certificate store cannot be read, and leaves the form usable', async () => {
    store.certificateChoices.and.returnValue(throwError({ reason: 'certificate.query failed' }));
    const fixture = await review();
    fixture.componentInstance.effectsReviewed = true;
    fixture.componentInstance.addCertificate();
    fixture.detectChanges();

    expect(fixture.componentInstance.certificateChoices).toEqual([]);
    expect(fixture.componentInstance.certificateChoicesError).toContain('certificate.query failed');
    // an unreadable store leaves the rest of the form usable; the empty row it added is the
    // operator's to remove, and until it names a certificate the submit stays closed
    expect(fixture.componentInstance.canInstall()).toBeFalse();
    fixture.componentInstance.removeCertificate(0);
    expect(fixture.componentInstance.canInstall()).toBeTrue();
  });
});
