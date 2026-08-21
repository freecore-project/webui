import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
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
import { CatalogStripComponent } from './catalog-strip/catalog-strip.component';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';
import { installedTableProviders, publishInstalledRecords } from './installed-applications-testing';

// the internal development record: how an entry FreeCORE does not offer reads (catalog look of 2026-10-13).

const HELM_KIT = [HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports, HlmFieldImports, HlmInputImports,
  HlmInputGroupImports, HlmSelectImports, HlmCheckboxImports, HlmLabelImports, HlmSpinnerImports, HlmTextareaImports,
  HlmRadioGroupImports, BrnTabsImports];

// As catalog.details answers for Home Assistant: resolved, unavailable, no image and an empty contract.
const notOffered: any = {
  id: 'daemonless:home-assistant', title: 'Home Assistant', description: 'Home automation', available: false,
  catalog_app: true, status: 'UNAVAILABLE', reason: 'Unsupported Compose service fields: network_mode.',
  image: null, ports: [], volumes: [], environment: [], annotations: [], labels: [], health: null, portal: null,
  attribution: { provider: 'Daemonless', support_owner: 'Daemonless project and image repository maintainers', source_url: 'https://github.com/daemonless/home-assistant' },
  catalog: { version: null, source: 'live' }, host_architecture: 'amd64',
};

const offered: any = {
  id: 'daemonless:homepage', title: 'Homepage', description: 'Dashboard', available: true, catalog_app: true,
  status: 'AVAILABLE', reason: null,
  image: { reference: 'ghcr.io/daemonless/homepage:latest', immutable_reference: 'ghcr.io/daemonless/homepage@sha256:' + 'a'.repeat(64), digest: 'sha256:' + 'a'.repeat(64), os: 'freebsd', architecture: 'amd64' },
  ports: [{ host_port: 3000, container_port: 3000, protocol: 'tcp' }], annotations: [], health: null, portal: null,
  environment: [], labels: [], volumes: [{ name: 'config', target: '/config', read_only: false }],
  attribution: { provider: 'Daemonless' },
  catalog: { version: '1.0.0', compose_sha256: 'a'.repeat(64), source: 'live', fetched_at: 1 },
  install: {
    name: 'homepage', restart_policy: 'always', health_timeout: 60,
    ports: [{ host_port: 3000, container_port: 3000, protocol: 'tcp' }],
    environment: [], labels: [], volumes: [{ name: 'config', target: '/config', dataset: null, read_only: false }],
  },
};

describe('Applications: an entry that is not offered (the internal development record)', () => {
  let store: any;
  let shown: any;

  beforeEach(async () => {
    store = {
      load: () => {}, clearLogs: () => {}, catalog: [], installed: [], pools: [], providers: [], orphans: [],
      config: { configured: true, runtime_ready: true, pool: 'tank', subnet: '10.88.0.0/16' },
      selectedDetail: null, activeJob: null, detailLoading: false, operationError: '',
      reviewCatalog: jasmine.createSpy('reviewCatalog').and.callFake(() => { store.selectedDetail = shown; return of(shown); }),
      ownedDatasets: jasmine.createSpy('ownedDatasets').and.returnValue(of([])),
      interfaceChoices: jasmine.createSpy('interfaceChoices').and.returnValue(of({})),
      certificateChoices: jasmine.createSpy('certificateChoices').and.returnValue(of([])),
      clearReview: () => { store.selectedDetail = null; },
    };
    publishInstalledRecords(store);
    await TestBed.configureTestingModule({
      declarations: [ApplicationsComponent, CatalogStripComponent, InstalledApplicationsComponent],
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
  afterEach(() => TestBed.resetTestingModule());

  async function review(detail: any): Promise<HTMLElement> {
    shown = detail;
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.review({ id: detail.id } as any);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('[data-applications-panel="review"]') as HTMLElement;
  }

  const terms = (panel: HTMLElement): string[] => Array.from(panel.querySelectorAll('dt')).map((dt) => dt.textContent.trim());

  it('leads with what it means, then gives the reason', async () => {
    const notice = (await review(notOffered)).querySelector('.fc-page-notice') as HTMLElement;
    expect(notice.querySelector('.not-offered-lead').textContent.trim()).toBe("This application can't be installed on FreeCORE.");
    const reason = notice.querySelector('.not-offered-reason') as HTMLElement;
    expect(reason.textContent.trim()).toBe('Unsupported Compose service fields: network_mode.');
    // two sentences with a real space between them, for copying and screen readers alike (not "FreeCORE.Unsupported")
    expect(notice.textContent).toContain('on FreeCORE. Unsupported Compose');
  });

  it('shows what is known about it and no rows or sections of dashes', async () => {
    const panel = await review(notOffered);
    expect(terms(panel)).toContain('Source');
    expect(terms(panel)).toContain('Support');
    for (const empty of ['Tag', 'Immutable image', 'Digest', 'Architecture', 'Operating system']) {
      expect(terms(panel)).not.toContain(empty);
    }
    expect(panel.querySelector('#applications-panel-configuration')).toBeNull();
    expect(panel.textContent).not.toContain('—');
    expect(panel.querySelector('#applications-install-form')).toBeNull();
  });

  it('leaves an offered entry exactly as it was', async () => {
    const panel = await review(offered);
    expect(panel.querySelector('.fc-page-notice')).toBeNull();
    expect(terms(panel)).toContain('Tag');
    expect(terms(panel)).toContain('Digest');
    expect(panel.querySelector('#applications-panel-configuration')).not.toBeNull();
  });
});
