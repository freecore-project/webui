import { Validators } from '@angular/forms';
import { TranslateDefaultParser } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { ApplicationsComponent } from './applications.component';

describe('ApplicationsComponent normalized contract UI', () => {
  let store: any;
  let dialog: any;
  let router: any;
  let component: ApplicationsComponent;
  let formClosed: Subject<boolean>;

  beforeEach(() => {
    formClosed = new Subject();
    store = {
      load: jasmine.createSpy('load'),
      clearReview: jasmine.createSpy('clearReview'),
      clearLogs: jasmine.createSpy('clearLogs'),
      install: jasmine.createSpy('install'),
      config: {
        pool: null,
        subnet: '10.88.0.0/16',
        configured: false,
      },
      pools: [{ name: 'tank' }],
      catalog: [
        {
          id: 'one',
          title: 'Miniflux',
          name: 'miniflux',
          description: 'Feed reader',
          category: 'Productivity',
          status: 'AVAILABLE',
        },
        {
          id: 'two',
          title: 'Postgres',
          name: 'postgres',
          description: 'Database',
          category: 'Databases',
          status: 'UNAVAILABLE',
        },
        {
          id: 'three',
          title: 'Syncthing',
          name: 'syncthing',
          description: 'File synchronization',
          category: 'Storage',
          status: 'UNRESOLVED',
        },
        {
          id: 'four',
          title: 'Python',
          name: 'python',
          description: 'Base image',
          category: 'Base',
          status: 'UNAVAILABLE',
        },
      ],
      selectedDetail: null,
      activeJob: null,
      loadCatalog: jasmine.createSpy('loadCatalog'),
      reviewCatalog: jasmine.createSpy('reviewCatalog'),
      configure: jasmine.createSpy('configure'),
    };
    dialog = {
      confirm: jasmine.createSpy('confirm').and.returnValue(of(true)),
      dialogForm: jasmine.createSpy('dialogForm').and.returnValue(formClosed),
    };
    router = { navigate: jasmine.createSpy('navigate') };
    component = new ApplicationsComponent(store, {
      snapshot: { queryParamMap: { get: () => null } },
    } as any, dialog, router, { instant: (key) => key, parser: new TranslateDefaultParser() } as any,
    // the internal development record: the page finds the catalog entry it came from inside its own host.
    { nativeElement: document.createElement('div') } as any, {} as any); // MatDialog: no view, so no template to open (the internal development record)
  });

  // the internal development record: the log panel renders under the installed table, out of view, so a Logs click looked inert.
  it('brings a newly opened log panel into view once and focuses its log', () => {
    const host = document.createElement('div');
    host.innerHTML = '<section class="logs-panel"><pre class="fc-dialog-pre" tabindex="0">log</pre></section>';
    document.body.appendChild(host);
    const page = new ApplicationsComponent(store, {
      snapshot: { queryParamMap: { get: () => null } },
    } as any, dialog, router, { instant: (key) => key, parser: new TranslateDefaultParser() } as any, { nativeElement: host } as any, {} as any); // MatDialog: no view, so no template to open (the internal development record)
    const panel = host.querySelector('.logs-panel') as HTMLElement;
    const reveal = spyOn(panel, 'scrollIntoView');

    store.logsApplication = '';
    page.ngAfterViewChecked();
    expect(reveal).not.toHaveBeenCalled();

    store.logsApplication = 'plex';
    store.logs = '';
    page.ngAfterViewChecked();
    expect(reveal).toHaveBeenCalledOnceWith({ block: 'start', behavior: 'smooth' });
    expect(document.activeElement).toBe(host.querySelector('pre'));

    // later checks of the same panel leave the reader's scroll position alone
    page.ngAfterViewChecked();
    expect(reveal).toHaveBeenCalledTimes(1);

    // the log arriving makes the page tall enough to scroll the panel up: revealed once more, then left alone
    store.logs = '[init] Starting s6 supervision...';
    page.ngAfterViewChecked();
    page.ngAfterViewChecked();
    expect(reveal).toHaveBeenCalledTimes(2);

    // another application's log is revealed again
    store.logsApplication = 'syncthing';
    store.logs = '';
    page.ngAfterViewChecked();
    expect(reveal).toHaveBeenCalledTimes(3);
    host.remove();
  });

  it('filters catalog rows by search and category', () => {
    component.search = 'feed';
    component.category = 'Productivity';

    expect(component.filteredCatalog.map((entry) => entry.name)).toEqual(['miniflux']);
  });

  it('shows unresolved entries but excludes unavailable catalog entries', () => {
    expect(component.filteredCatalog.map((entry) => entry.name)).toEqual(['miniflux', 'syncthing']);
  });

  it('does not present base images as installable applications', () => {
    expect(component.applicationCatalog.map((entry) => entry.name)).not.toContain('python');
    expect(component.categories).not.toContain('Base');
  });

  it('uses a placeholder for catalog icon tokens instead of treating them as image URLs', () => {
    expect(component.catalogIcon({ icon: ':simple-redis:' } as any)).toBeNull();
    expect(component.catalogIcon({ icon: 'https://example.com/redis.svg' } as any))
      .toBe('https://example.com/redis.svg');
  });

  it('builds the form only from the normalized middleware install contract', () => {
    const install = {
      name: 'miniflux',
      image: 'ghcr.io/daemonless/miniflux@sha256:abc',
      ports: [{ host_port: 8080, container_port: 8080, protocol: 'tcp' }],
      environment: [{ name: 'DATABASE_URL', value: '' }],
      volumes: [{
        name: 'data', target: '/data', dataset: null, read_only: false,
      }],
      annotations: [{ name: 'org.freebsd.jail.allow.raw_sockets', value: 'true' }],
      restart_policy: 'always',
      portal: { scheme: 'http', port: 8080, path: '/' },
      health_timeout: 60,
    };
    const detail: any = {
      available: true,
      install,
      environment: [{ name: 'DATABASE_URL', required: true, sensitive: true }],
      raw_compose: 'services:\n  app:\n    privileged: true',
    };
    store.selectedDetail = detail;

    component.prepareReview(detail);

    // the internal development record + #487: the two fields the page adds to the contract copy -- the
    // attachment, and the labels list a contract written before the internal development record does not carry.
    expect(component.installDraft).toEqual({
      ...install,
      network: {
        mode: 'managed', interface: null, address: null, gateway: null, managed_access: false,
      },
      labels: [],
      // the internal development record: a catalog entry declares no certificate
      certificates: [],
    } as any);
    expect((component.installDraft as any).raw_compose).toBeUndefined();
    expect(component.environmentDefinition('DATABASE_URL').sensitive).toBeTrue();
  });

  it('requires pool selection and explicit effects review on first use', () => {
    const detail: any = {
      available: true,
      install: {
        name: 'miniflux',
        image: 'image@sha256:abc',
        ports: [],
        environment: [],
        volumes: [],
        annotations: [],
        restart_policy: 'always',
        portal: null,
        health_timeout: 60,
      },
      environment: [],
    };
    store.selectedDetail = detail;
    component.prepareReview(detail);
    component.selectedPool = '';

    expect(component.canInstall()).toBeFalse();
    component.selectedPool = 'tank';
    expect(component.canInstall()).toBeFalse();
    component.effectsReviewed = true;
    expect(component.canInstall()).toBeTrue();
  });

  it('confirms upstream trust before updating the signed catalog', () => {
    component.updateCatalog();

    expect(dialog.confirm.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      hideCheckBox: true,
      buttonMsg: 'Update Catalog',
    }));
    // the internal development record: the catalog is the provider's organisation, read directly.
    expect(dialog.confirm.calls.mostRecent().args[0].message).toContain('does not review them');
    expect(dialog.confirm.calls.mostRecent().args[0].message).not.toContain('signed');
    expect(store.loadCatalog).toHaveBeenCalledWith(true);
  });

  it('does not update the catalog when confirmation is declined', () => {
    dialog.confirm.and.returnValue(of(false));

    component.updateCatalog();

    expect(store.loadCatalog).not.toHaveBeenCalled();
  });

  it('configures the initial Applications pool from the settings dialog', () => {
    component.openSettings();

    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.title).toBe('Applications Settings');
    expect(conf.fieldConfig).toEqual([
      jasmine.objectContaining({ name: 'pool', value: 'tank', disabled: false }),
      jasmine.objectContaining({ name: 'subnet', value: '10.88.0.0/16', disabled: false }),
      jasmine.objectContaining({ name: 'convert_enabled', type: 'checkbox', value: false }),
      jasmine.objectContaining({ name: 'linux_compat_enabled', type: 'checkbox', value: false }),
    ]);
    expect(conf.saveButtonText).toBe('Configure');

    const close = jasmine.createSpy('close');
    conf.customSubmit({
      formValue: { pool: 'tank', subnet: '10.89.0.0/16' },
      dialogRef: { close },
    });

    expect(close).toHaveBeenCalledWith(true);
    expect(store.configure).not.toHaveBeenCalled();
    formClosed.next(true);
    expect(store.configure).toHaveBeenCalledWith('tank', '10.89.0.0/16', {
      linux_compat_enabled: false, convert_enabled: false,
    });
  });

  // the internal development record: the Linux tier is host-wide, and the setting says so
  // before it is switched on.
  it('offers both experimental lanes in the settings dialog and passes them through', () => {
    store.config = {
      pool: 'tank', subnet: '10.88.0.0/16', configured: true, linux_compat_enabled: false, convert_enabled: true,
    };

    component.openSettings();

    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    const linux = conf.fieldConfig.find((field) => field.name === 'linux_compat_enabled');
    expect(linux.tooltip).toContain('whole host');
    expect(linux.tooltip).toContain('every jail on this host');
    expect(conf.fieldConfig.find((field) => field.name === 'convert_enabled').value).toBeTrue();

    const close = jasmine.createSpy('close');
    conf.customSubmit({
      formValue: { pool: 'tank', subnet: '10.88.0.0/16', linux_compat_enabled: true, convert_enabled: true },
      dialogRef: { close },
    });
    formClosed.next(true);
    expect(store.configure).toHaveBeenCalledWith('tank', '10.88.0.0/16', {
      linux_compat_enabled: true, convert_enabled: true,
    });
  });

  it('allows configured Applications storage and subnet to be changed', () => {
    store.config = {
      pool: 'tank',
      subnet: '10.88.0.0/16',
      configured: true,
    };

    component.openSettings();

    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.fieldConfig).toEqual([
      jasmine.objectContaining({ name: 'pool', value: 'tank', disabled: false }),
      jasmine.objectContaining({ name: 'subnet', value: '10.88.0.0/16', disabled: false }),
      jasmine.objectContaining({ name: 'convert_enabled', type: 'checkbox' }),
      jasmine.objectContaining({ name: 'linux_compat_enabled', type: 'checkbox' }),
    ]);
    expect(conf.saveButtonText).toBe('Save');
    expect(conf.cancelButtonText).toBe('Cancel');
  });

  // the internal development record (the internal development record): the way out of Applications sits beside
  // the way in, and the destructive choice is never the default.
  it('offers Unconfigure from the settings dialog only once Applications is configured', () => {
    component.openSettings();
    expect(dialog.dialogForm.calls.mostRecent().args[0].custActions).toEqual([]);

    store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true };
    store.installed = [];
    store.unconfigure = jasmine.createSpy('unconfigure');
    component.openSettings();

    const settings = dialog.dialogForm.calls.mostRecent().args[0];
    expect(settings.custActions).toEqual([jasmine.objectContaining({ id: 'unconfigure', name: 'Unconfigure Applications' })]);
    const close = jasmine.createSpy('close');
    settings.afterInit({ dialogRef: { close } });
    settings.custActions[0].function();

    // The settings dialog closes as declined and the unconfigure dialog opens in its place.
    expect(close).toHaveBeenCalledWith(false);
    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.title).toBe('Unconfigure Applications');
    expect(conf.message).toContain('<b>tank</b>');
    expect(conf.message).not.toContain('Installed applications');
    // Nothing installed: no removal box to tick, and data is kept unless unticked.
    expect(conf.fieldConfig).toEqual([
      jasmine.objectContaining({ name: 'keep_data', type: 'checkbox', value: true }),
    ]);
    expect(conf.saveButtonText).toBe('Unconfigure');

    const submitClose = jasmine.createSpy('close');
    conf.customSubmit({ formValue: { keep_data: true }, dialogRef: { close: submitClose } });
    expect(submitClose).toHaveBeenCalledWith(true);
    expect(store.unconfigure).not.toHaveBeenCalled();
    formClosed.next(true);
    expect(store.unconfigure).toHaveBeenCalledOnceWith(false, true);
  });

  it('requires the removal box while applications are installed and lists them', () => {
    store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true };
    store.installed = [{ name: 'mail' }, { name: 'web<b>' }];
    store.unconfigure = jasmine.createSpy('unconfigure');

    component.openUnconfigure();

    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.message).toContain('Installed applications: mail, web&lt;b&gt;.');
    const removal = conf.fieldConfig.find((field) => field.name === 'remove_applications');
    expect(removal).toEqual(jasmine.objectContaining({ type: 'checkbox', value: false, required: true }));
    expect(removal.validation).toEqual([Validators.requiredTrue]);
    expect(conf.fieldConfig.find((field) => field.name === 'keep_data').value).toBeTrue();

    // Destroying the data is the operator's explicit unticking, passed through as-is.
    conf.customSubmit({ formValue: { remove_applications: true, keep_data: false }, dialogRef: { close: () => {} } });
    formClosed.next(true);
    expect(store.unconfigure).toHaveBeenCalledOnceWith(true, false);
  });

  it('does not open the unconfigure dialog while unconfigured or busy', () => {
    component.openUnconfigure();
    expect(dialog.dialogForm).not.toHaveBeenCalled();

    store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true };
    store.activeJob = { operation: 'x' };
    component.openUnconfigure();
    expect(dialog.dialogForm).not.toHaveBeenCalled();
  });

  it('does not open Applications settings without a usable pool', () => {
    store.pools = [];

    component.openSettings();

    expect(dialog.dialogForm).not.toHaveBeenCalled();
    expect(dialog.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'No Pools',
      buttonMsg: 'Create Pool',
    }));
    expect(router.navigate).toHaveBeenCalledOnceWith(['/storage', 'pools', 'manager']);
  });

  it('links legacy plugins to Jails after redirecting a stale Plugins URL', () => {
    component = new ApplicationsComponent(store, {
      snapshot: { queryParamMap: { get: (key) => (key === 'legacy' ? 'iocage-plugin-store' : null) } },
    } as any, dialog, router, { instant: (key) => key, parser: new TranslateDefaultParser() } as any,
    // the internal development record: the page finds the catalog entry it came from inside its own host.
    { nativeElement: document.createElement('div') } as any, {} as any); // MatDialog: no view, so no template to open (the internal development record)

    component.ngOnInit();

    expect(component.retirementNotice).toBeTrue();
    expect(store.load).toHaveBeenCalled();
  });
  // the internal development record: an update is a newer package version, or a changed
  // contract for the same one; the record remembers both.
  function replacement(changed = true) {
    store.config = { configured: true, runtime_ready: true };
    store.replace = jasmine.createSpy('replace');
    const application: any = { name: 'mail', catalog: { id: 'daemonless:bichon', compose_sha256: 'a'.repeat(64), version: '1.0' } };
    const detail: any = { id: 'daemonless:bichon', catalog_app: true, available: true,
      catalog: { compose_sha256: (changed ? 'b' : 'a').repeat(64), version: changed ? '1.1' : '1.0' } };
    store.reviewReplacement = jasmine.createSpy('reviewReplacement').and.returnValue(of(detail));
    return { application, detail };
  }

  it('reviews a changed catalog revision and dispatches Update only after confirmation closes', () => {
    const { application, detail } = replacement();
    dialog.confirm.and.returnValue(formClosed);
    component.reviewReplacement(application, false);
    expect(store.reviewReplacement).toHaveBeenCalledWith(application);
    expect(dialog.confirm.calls.mostRecent().args[0].title).toBe('Update Application');
    expect(store.replace).not.toHaveBeenCalled();
    formClosed.next(true);
    expect(store.replace).toHaveBeenCalledOnceWith(application, detail, false);
  });

  it('requires explicit Recreate for an unchanged revision', () => {
    const { application, detail } = replacement(false);
    component.reviewReplacement(application, false);
    expect(store.replace).not.toHaveBeenCalled();
    expect(dialog.confirm.calls.mostRecent().args[0].title).toBe('Application Up to Date');
    component.reviewReplacement(application, true);
    expect(store.replace).toHaveBeenCalledOnceWith(application, detail, true);
  });

  it('does not silently update while recreating an older installed revision', () => {
    const { application } = replacement();
    component.reviewReplacement(application, true);
    expect(store.replace).not.toHaveBeenCalled();
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(store.operationError).toContain('Use Update');
  });

  it('keeps catalog trust failures visible and never opens confirmation', () => {
    const { application } = replacement();
    store.reviewReplacement.and.returnValue(throwError(() => ({ reason: 'Catalog signature rejected.' })));
    component.reviewReplacement(application, false);
    expect(store.operationError).toBe('Catalog signature rejected.');
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(store.replace).not.toHaveBeenCalled();
  });

  it('escapes application names and revisions in the native replacement confirmation', () => {
    const { application, detail } = replacement();
    application.name = '<img src=x>';
    detail.catalog.version = '<script>bad</script>';
    component.reviewReplacement(application, false);
    const message = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('&lt;img src=x&gt;');
    expect(message).toContain('&lt;script&gt;bad&lt;/script&gt;');
    expect(message).not.toContain('<script>');
  });

  it('does not launch replacement after cancellation or navigation', () => {
    const { application } = replacement();
    dialog.confirm.and.returnValue(formClosed);
    component.reviewReplacement(application, false);
    formClosed.next(false);
    component.reviewReplacement(application, false);
    component.ngOnDestroy();
    formClosed.next(true);
    expect(store.replace).not.toHaveBeenCalled();
  });

  it('blocks replacement for revoked entries and while an operation is active', () => {
    const { application } = replacement();
    component.reviewReplacement({ ...application, revoked: true }, true);
    store.activeJob = {};
    component.reviewReplacement(application, false);
    expect(store.reviewReplacement).not.toHaveBeenCalled();
  });

  it('distinguishes contracts when the package version has not changed', () => {
    const { application, detail } = replacement();
    application.catalog.version = detail.catalog.version = '1.0';
    component.reviewReplacement(application, false);
    const message = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('1.0 (contract aaaaaaaaaaaa)');
    expect(message).toContain('1.0 (contract bbbbbbbbbbbb)');
  });

  it('treats a legacy record from the signed client as up to date at the same version', () => {
    const { application, detail } = replacement(false);
    application.catalog = { id: 'daemonless:bichon', object_sha256: 'z'.repeat(64), entry_revision: 3, version: '1.0' };
    component.reviewReplacement(application, false);
    expect(store.replace).not.toHaveBeenCalled();
    expect(dialog.confirm.calls.mostRecent().args[0].title).toBe('Application Up to Date');
    detail.catalog.version = '1.1';
    dialog.confirm.and.returnValue(of(true));
    component.reviewReplacement(application, false);
    expect(store.replace).toHaveBeenCalledOnceWith(application, detail, false);
  });

  // the internal development record and #444: the second install tier and the Linux choice.
  describe('importing an image', () => {
    beforeEach(() => {
      store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true, linux_compat_enabled: false };
      store.importImage = jasmine.createSpy('importImage');
      component.openImport();
      component.importDraft.image = 'docker.io/library/alpine:3.20';
      component.importDraft.name = 'alpine';
    });

    it('blocks submission until the unreviewed acknowledgement is given', () => {
      expect(component.canImport()).toBeFalse();
      component.submitImport();
      expect(store.importImage).not.toHaveBeenCalled();

      component.importDraft.acknowledged = true;
      expect(component.canImport()).toBeTrue();
      component.submitImport();
      expect(store.importImage).toHaveBeenCalledOnceWith(jasmine.objectContaining({
        name: 'alpine', image: 'docker.io/library/alpine:3.20', image_os: 'freebsd',
        acknowledge_unreviewed: true, ports: [], volumes: [], environment: [],
      }), 'tank', '10.88.0.0/16');
      expect(component.importDraft).toBeNull();
    });

    it('blocks the Linux choice while the host-wide setting is off', () => {
      component.importDraft.acknowledged = true;
      component.importDraft.image_os = 'linux';
      expect(component.importLinuxBlocked).toBeTrue();
      expect(component.canImport()).toBeFalse();

      store.config.linux_compat_enabled = true;
      expect(component.importLinuxBlocked).toBeFalse();
      expect(component.canImport()).toBeTrue();
    });

    it('publishes one optional tcp port only when both ends are given', () => {
      component.importDraft.acknowledged = true;
      component.importDraft.host_port = 8080;
      expect(component.canImport()).toBeFalse();
      component.importDraft.container_port = 80;
      expect(component.importPayload().ports).toEqual([{ host_port: 8080, container_port: 80, protocol: 'tcp' }]);
      component.importDraft.name = 'Not Valid';
      expect(component.canImport()).toBeFalse();
    });
  });

  // the internal development record: a compose file fills the import form; the form's fields stay editable.
  describe('reading a compose file into the import form', () => {
    beforeEach(() => {
      store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true, linux_compat_enabled: true };
      store.importImage = jasmine.createSpy('importImage');
      store.readCompose = jasmine.createSpy('readCompose').and.returnValue(of({
        service: 'grafana',
        install: {
          name: 'grafana', image: 'grafana/grafana-oss:8.5.27', image_os: 'linux',
          ports: [{ host_port: 3000, container_port: 3000, protocol: 'tcp' }, { host_port: 9000, container_port: 9000, protocol: 'udp' }],
          environment: [{ name: 'GF_SERVER_ROOT_URL', value: 'https://g/' }],
          volumes: [{ name: 'var-lib-grafana', target: '/var/lib/grafana', dataset: null, read_only: false }],
          annotations: [], restart_policy: 'always', portal: null, healthcheck: null, health_timeout: 60,
        },
        match: null, catalog_app: 'grafana', ignored: ['container_name: ignored'], volumes_in_compose: [],
      }));
      component.openImport();
    });

    it('sends a URL as url and pasted YAML as text, then fills the form', () => {
      component.importDraft.compose = 'https://raw.githubusercontent.com/me/apps/main/compose.yaml';
      component.readCompose();
      expect(store.readCompose).toHaveBeenCalledWith({ url: 'https://raw.githubusercontent.com/me/apps/main/compose.yaml', text: null });
      expect(component.importDraft.image).toBe('grafana/grafana-oss:8.5.27');
      expect(component.importDraft.image_os).toBe('linux');
      expect(component.importDraft.name).toBe('grafana');
      expect(component.importDraft.host_port).toBe(3000);
      expect(component.importDraft.composeSummary.catalog_app).toBe('grafana');

      component.importDraft.compose = 'services:\n  x:\n    image: y\n';
      component.readCompose();
      expect(store.readCompose.calls.mostRecent().args[0]).toEqual({ url: null, text: 'services:\n  x:\n    image: y' });
    });

    it('carries the file\'s ports, environment and volumes and lets the form override the first tcp port', () => {
      component.importDraft.compose = 'x';
      component.readCompose();
      component.importDraft.acknowledged = true;
      component.importDraft.host_port = 3100;
      const payload = component.importPayload();
      expect(payload.ports).toEqual([
        { host_port: 3100, container_port: 3000, protocol: 'tcp' }, { host_port: 9000, container_port: 9000, protocol: 'udp' },
      ]);
      expect(payload.environment).toEqual([{ name: 'GF_SERVER_ROOT_URL', value: 'https://g/' }]);
      expect(payload.volumes.length).toBe(1);
      expect(payload.acknowledge_unreviewed).toBeTrue();
      expect(component.canImport()).toBeTrue();
    });

    it('keeps the reading error on the form', () => {
      store.readCompose.and.returnValue(throwError(() => ({ reason: 'declares no services' })));
      component.importDraft.compose = 'nope';
      component.readCompose();
      expect(component.importDraft.composeError).toBe('declares no services');
      expect(component.importDraft.prefill).toBeNull();
    });
  });

  // the internal development record: the convert panel walks source -> target -> plan -> apply.
  describe('converting a jail', () => {
    const sources = [
      { kind: 'jail', engine: 'iocage', name: 'grafanajail', state: 'up', release: '15.1-RELEASE-p3', root: '/r', app: 'grafana', version: '13.1.1', packages: [], catalog: ['grafana'], lift: true, convertible: false },
      { kind: 'jail', engine: 'bastille', name: 'plain', state: 'down', release: '15.1-RELEASE', root: '/p', app: null, version: null, packages: [], catalog: [], lift: true, convertible: false },
    ];
    const detection = (recipe: string | null) => ({
      kind: 'jail', engine: 'iocage', ref: 'grafanajail', root: '/r', dataset: 'tank/j', state: 'up', release: '15.1-RELEASE-p3',
      userland: '15.1-RELEASE-p3', root_kind: 'clone', app: recipe ? 'grafana' : null, version: null, recipe,
      refusals: recipe ? [] : ['no recipe recognises this jail'],
      packages: [{ name: 'grafana', version: '13.1.1', automatic: false }, { name: 'sqlite3', version: '3', automatic: true }],
      ports: [{ container_port: 3050, protocol: 'tcp', host_port: 3050, command: 'grafana' }, { container_port: 22, protocol: 'tcp', host_port: null, command: 'sshd' }],
      ports_detected_from: 'listening',
    });
    const plan = (refuse = false) => ({
      plan_id: 'p'.repeat(64), mode: 'lift', recommended: 'lift',
      application: { name: 'grafanajail', host_port: null }, app: { name: null, title: null, version: null, recipe: null },
      source: { kind: 'jail', engine: 'iocage', ref: 'grafanajail' },
      modes: { native: { available: false, reasons: [] }, compat: { available: false, reasons: [] }, lift: { available: !refuse, reasons: [] } },
      entries: [
        { type: 'carry', human: '/var -> owned dataset var' }, { type: 'rewrite', human: '/etc/rc.conf: 2 removed' },
        { type: 'note', human: '3050/tcp is published as host port 3050' },
        ...(refuse ? [{ type: 'refuse', human: 'choose a host port for 22/tcp' }] : []),
      ],
      lift: { ports: [{ host_port: 3050, container_port: 3050, protocol: 'tcp' }], ports_detected_from: 'listening', state_volumes: [], external_volumes: [], size_bytes: 917504000, base: { reference: 'localhost/freecore/jail-base:15.1-RELEASE', release: '15.1-RELEASE' }, delta: 'zfs-diff', packages: ['grafana'] },
    });

    beforeEach(() => {
      store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true, convert_enabled: true };
      store.convertSources = jasmine.createSpy('convertSources').and.returnValue(of(sources));
      store.convertDetect = jasmine.createSpy('convertDetect').and.returnValue(of(detection('grafana@1')));
      store.convertPlan = jasmine.createSpy('convertPlan').and.returnValue(of(plan()));
      store.convertDiscard = jasmine.createSpy('convertDiscard').and.returnValue(of(true));
      store.convertApply = jasmine.createSpy('convertApply');
    });

    it('lists both engines, detects the chosen jail and proposes its ports', () => {
      component.openConvert();
      expect(component.convertDraft.sources.length).toBe(2);
      component.selectConvertSource(sources[0] as any);
      expect(store.convertDetect).toHaveBeenCalledWith({ kind: 'jail', jail: 'grafanajail', engine: 'iocage' });
      expect(component.convertDraft.name).toBe('grafanajail');
      expect(component.convertDraft.mode).toBe('lift');
      expect(component.convertDraft.ports.map((port) => port.host_port)).toEqual([3050, null]);
      expect(component.convertMigrationAvailable).toBeTrue();
      expect(component.convertRefusals()).toEqual([]);
      expect(component.convertPackages()).toBe('grafana 13.1.1');
    });

    it('offers the migration only when a recipe recognised the jail, and never blocks the lift on that', () => {
      store.convertDetect.and.returnValue(of(detection(null)));
      component.openConvert({ name: 'grafanajail', engine: 'iocage' });
      expect(component.convertDraft.source.name).toBe('grafanajail');
      expect(component.convertMigrationAvailable).toBeFalse();
      expect(component.convertRefusals()).toEqual([]);
    });

    it('plans with the chosen host ports, applies only after review, and switches to Installed', () => {
      component.openConvert({ name: 'grafanajail', engine: 'iocage' });
      component.convertDraft.ports[1].host_port = 2222;
      component.convertDraft.name = 'grafana-app';
      component.prepareConvertPlan();
      expect(store.convertPlan).toHaveBeenCalledWith({ kind: 'jail', jail: 'grafanajail', engine: 'iocage' }, {
        name: 'grafana-app', mode: 'lift',
        ports: [{ container_port: 3050, protocol: 'tcp', host_port: 3050 }, { container_port: 22, protocol: 'tcp', host_port: 2222 }],
      });
      expect(component.planEntries('carry').length).toBe(1);
      expect(component.convertSizeLabel(917504000)).toBe('875 MiB');
      expect(component.canApplyConvert()).toBeFalse();
      component.convertDraft.reviewed = true;
      expect(component.canApplyConvert()).toBeTrue();
      component.applyConvert();
      expect(store.convertApply).toHaveBeenCalledOnceWith('p'.repeat(64));
      expect(component.convertDraft).toBeNull();
      expect(component.selectedTab).toBe('installed');
      expect(store.convertDiscard).not.toHaveBeenCalled();
    });

    it('never applies a plan with refusals and discards a plan it walks away from', () => {
      store.convertPlan.and.returnValue(of(plan(true)));
      component.openConvert({ name: 'grafanajail', engine: 'iocage' });
      component.prepareConvertPlan();
      component.convertDraft.reviewed = true;
      expect(component.canApplyConvert()).toBeFalse();
      component.applyConvert();
      expect(store.convertApply).not.toHaveBeenCalled();
      component.cancelConvert();
      expect(store.convertDiscard).toHaveBeenCalledOnceWith('p'.repeat(64));
      expect(component.convertDraft).toBeNull();
    });

    it('lets a port the detection did not propose be added once, and forgets a stale plan', () => {
      component.openConvert({ name: 'grafanajail', engine: 'iocage' });
      component.prepareConvertPlan();
      expect(component.convertDraft.plan).not.toBeNull();
      component.convertDraft.newPort = { container_port: 8443, protocol: 'tcp', host_port: 18443 };
      component.addConvertPort();
      expect(component.convertDraft.ports.map((port) => port.container_port)).toEqual([3050, 22, 8443]);
      expect(component.convertDraft.plan).toBeNull();
      expect(store.convertDiscard).toHaveBeenCalledOnceWith('p'.repeat(64));
      // A duplicate of a proposed or added port, and an out-of-range port, are refused.
      component.convertDraft.newPort = { container_port: 3050, protocol: 'tcp', host_port: 1 };
      component.addConvertPort();
      component.convertDraft.newPort = { container_port: 70000, protocol: 'udp', host_port: null };
      component.addConvertPort();
      expect(component.convertDraft.ports.length).toBe(3);
    });

    it('drops the deep-link query once the panel is open', () => {
      component = new ApplicationsComponent(store, {
        snapshot: { queryParamMap: { get: (key) => ({ convert: 'grafanajail', engine: 'bastille' })[key] || null } },
      } as any, dialog, router, { instant: (key) => key, parser: new TranslateDefaultParser() } as any,
      { nativeElement: document.createElement('div') } as any, {} as any); // MatDialog: no view, so no template to open (the internal development record)
      component.ngOnInit();
      expect(store.convertSources).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {}, replaceUrl: true }));
    });

    it('sends the migration without ports and keeps errors on the panel', () => {
      component.openConvert({ name: 'grafanajail', engine: 'iocage' });
      component.convertDraft.mode = 'native';
      component.prepareConvertPlan();
      expect(store.convertPlan.calls.mostRecent().args[1]).toEqual({ name: 'grafanajail', mode: 'native' });
      store.convertPlan.and.returnValue(throwError(() => ({ reason: 'The lift is not available: x' })));
      component.prepareConvertPlan();
      expect(component.convertDraft.error).toBe('The lift is not available: x');
      expect(component.convertDraft.plan).toBeNull();
    });
  });

  it('does not refresh the catalog if another operation starts during confirmation', () => {
    dialog.confirm.and.returnValue(formClosed);
    component.updateCatalog();
    store.activeJob = {};
    formClosed.next(true);
    expect(store.loadCatalog).not.toHaveBeenCalled();
  });

  // the internal development record/#534: the catalog list, the one panel slot beside it, the Catalog picker
  // the internal development record: an installed application written out for a Linux host.
  describe('exporting an application for a Linux host', () => {
    const application = { name: 'sonarr', image: 'ghcr.io/daemonless/sonarr:latest', running: true } as any;
    const exportPlan = (refuse = false) => ({
      plan_id: 'e'.repeat(64), direction: 'export', kind: 'state', source: { kind: 'application', ref: 'sonarr' },
      app: { name: 'sonarr', title: 'Sonarr', version: '4.0.15.2941', recipe: 'sonarr@1' },
      target: { image: 'lscr.io/linuxserver/sonarr:version-4.0.15.2941', digest: null, version: '4.0.15.2941-ls290' },
      entries: [
        { type: 'carry', human: 'config/ -> /config in the Linux image' },
        { type: 'note', human: 'pool tank uses only ZFS features TrueNAS SCALE 24.10.0 supports' },
        { type: 'drop', human: 'the Applications health probe' },
        ...(refuse ? [{ type: 'refuse', human: 'nothing to export' }] : []),
      ],
      commands: [],
    });

    beforeEach(() => {
      store.config = { pool: 'tank', subnet: '10.88.0.0/16', configured: true, convert_enabled: true };
      store.exportPlan = jasmine.createSpy('exportPlan').and.returnValue(of(exportPlan()));
      store.exportRun = jasmine.createSpy('exportRun');
      store.convertDiscard = jasmine.createSpy('convertDiscard').and.returnValue(of(true));
    });

    it('plans on open in its dialog, and exports only after review with a valid folder', () => {
      component.selectedTab = 'installed';
      component.openExport(application);
      expect(store.exportPlan).toHaveBeenCalledOnceWith('sonarr');
      expect(component.selectedTab).toBe('installed'); // the internal development record: a dialog over Installed
      expect(component.exportPlanEntries('carry').length).toBe(1);
      expect(component.exportKindLabel('state')).toBe('state carried');
      expect(component.canRunExport()).toBeFalse();
      component.exportDraft.reviewed = true;
      expect(component.canRunExport()).toBeFalse();
      for (const bad of ['relative/path', '/mnt/tank', '/mnt/tank/exports/', '/tmp/x', '/mnt/tank/a b']) {
        component.exportDraft.destination = bad;
        expect(component.exportDestinationValid).withContext(bad).toBeFalse();
      }
      component.exportDraft.destination = ' /mnt/tank/exports ';
      component.exportDraft.hostRoot = 'not/absolute';
      expect(component.canRunExport()).toBeFalse();
      component.exportDraft.hostRoot = '/mnt/apps/bundles';
      expect(component.canRunExport()).toBeTrue();
      component.runExport();
      expect(store.exportRun).toHaveBeenCalledOnceWith('e'.repeat(64), {
        destination: '/mnt/tank/exports', mode: 'bundle', live: false, host_root: '/mnt/apps/bundles',
      });
      expect(component.exportDraft).toBeNull();
      expect(component.selectedTab).toBe('installed');
      // The job consumes the plan; it is not discarded as well.
      expect(store.convertDiscard).not.toHaveBeenCalled();
    });

    it('sends no host folder for an in-place export and never runs a plan with refusals', () => {
      component.openExport(application);
      Object.assign(component.exportDraft, { destination: '/mnt/tank/exports', mode: 'in-place', hostRoot: 'ignored', reviewed: true });
      expect(component.exportHostRootValid).toBeTrue();
      component.runExport();
      expect(store.exportRun.calls.mostRecent().args[1]).toEqual({
        destination: '/mnt/tank/exports', mode: 'in-place', live: false, host_root: null,
      });

      store.exportPlan.and.returnValue(of(exportPlan(true)));
      component.openExport(application);
      Object.assign(component.exportDraft, { destination: '/mnt/tank/exports', reviewed: true });
      expect(component.canRunExport()).toBeFalse();
    });

    it('discards the plan when it walks away, and when another panel takes the slot', () => {
      component.openExport(application);
      component.cancelExport();
      expect(store.convertDiscard).toHaveBeenCalledOnceWith('e'.repeat(64));
      expect(component.exportDraft).toBeNull();
      expect(component.selectedTab).toBe('installed');

      store.convertSources = jasmine.createSpy('convertSources').and.returnValue(of([]));
      component.openExport(application);
      component.openConvert();
      expect(store.convertDiscard).toHaveBeenCalledTimes(2);
      expect(component.exportDraft).toBeNull();
    });

    it('keeps the middleware refusal on the panel', () => {
      store.exportPlan.and.returnValue(throwError(() => ({ reason: 'This application is a lifted jail' })));
      component.openExport(application);
      expect(component.exportDraft.error).toBe('This application is a lifted jail');
      expect(component.exportDraft.plan).toBeNull();
    });

    it('is not offered while Convert & Import is off', () => {
      store.config = { pool: 'tank', configured: true, convert_enabled: false };
      component.openExport(application);
      expect(component.exportDraft).toBeNull();
      expect(store.exportPlan).not.toHaveBeenCalled();
    });
  });

  describe('the catalog list and the panel slot', () => {
    const detail: any = {
      id: 'one', title: 'Miniflux', available: true, catalog_app: true, catalog: { compose_sha256: 'a'.repeat(64) },
      image: null, ports: [], volumes: [], annotations: [], environment: [],
      install: { name: 'miniflux', restart_policy: 'always', ports: [], environment: [], volumes: [] },
    };

    it('hands the store a success hook that closes the panel and flips to the Installed tab', () => {
      component.selectedTab = 'catalog'; // the review is opened from the Catalog tab
      store.selectedDetail = detail;
      component.prepareReview(detail);
      component.effectsReviewed = true;
      component.selectedPool = 'tank';
      component.install();
      const hook = store.install.calls.mostRecent().args[4];
      expect(typeof hook).toBe('function');
      expect(component.selectedTab).toBe('catalog');
      hook();
      expect(component.selectedTab).toBe('installed');
      expect(component.installDraft).toBeNull();
      expect(component.effectsReviewed).toBeFalse();
    });

    it('keeps one panel open: import drops the review, convert drops import', () => {
      store.convertSources = jasmine.createSpy('convertSources').and.returnValue(of([]));
      store.selectedDetail = detail;
      component.prepareReview(detail);
      component.openImport();
      expect(store.clearReview).toHaveBeenCalled();
      expect(component.installDraft).toBeNull();
      expect(component.importDraft).not.toBeNull();
      component.openConvert();
      expect(component.importDraft).toBeNull();
      expect(component.convertDraft).not.toBeNull();
      store.reviewCatalog.and.returnValue(of(detail));
      component.review(store.catalog[0]);
      expect(component.convertDraft).toBeNull();
      expect(component.installDraft).not.toBeNull();
    });

    // the internal development record/#533: the page opens on Installed; the Jails "Convert" link opens Convert's dialog over it.
    it('opens Convert without switching tabs (its dialog)', () => {
      store.convertSources = jasmine.createSpy('convertSources').and.returnValue(of([]));
      expect(component.selectedTab).toBe('installed');
      component.openConvert({ name: 'web', engine: 'iocage' });
      expect(component.selectedTab).toBe('installed');
      expect(component.convertDraft).not.toBeNull();
    });

    it('returns focus to the origin tile on Cancel and to the Installed row after an edit', (done) => {
      const focusTile = jasmine.createSpy('focusEntry');
      component.catalogList = { focusEntry: focusTile } as any;
      store.reviewCatalog.and.returnValue(of(detail));
      component.review({ id: 'one' } as any);
      component.closeReview();
      expect(component.installDraft).toBeNull();
      setTimeout(() => {
        expect(focusTile).toHaveBeenCalledWith('one');
        // an edit came from the Installed tab: the review closes back onto it
        component.selectedTab = 'catalog';
        component.editing = { name: 'sab' } as any;
        component.closeReview();
        expect(component.selectedTab).toBe('installed');
        done();
      });
    });

    it('names the catalog in view in the update confirm and shows the picker only with two providers', () => {
      expect(component.catalogProviders).toEqual([]);
      expect(component.selectedProvider).toBeNull();
      component.updateCatalog();
      expect(dialog.confirm.calls.mostRecent().args[0].message).toContain('Daemonless');
      store.providers = [{ id: 'daemonless', name: 'Daemonless', default: true, source_url: 'https://github.com/daemonless' }];
      expect(component.selectedProvider.name).toBe('Daemonless');
      component.updateCatalog();
      expect(dialog.confirm.calls.mostRecent().args[0].message).toContain('Daemonless');
      expect(dialog.confirm.calls.mostRecent().args[0].message).toContain('does not review them');
      // one provider never filters (the entries carry no provider in the fixture)
      expect(component.filteredCatalog.map((entry) => entry.name)).toEqual(['miniflux', 'syncthing']);
      store.providers = [...store.providers, { id: 'acme', name: 'Acme', default: false }];
      store.catalog = store.catalog.map((entry) => ({ ...entry, provider: entry.name === 'syncthing' ? 'acme' : 'daemonless' }));
      expect(component.selectedProvider.id).toBe('daemonless');
      expect(component.filteredCatalog.map((entry) => entry.name)).toEqual(['miniflux']);
      component.catalogProvider = 'acme';
      expect(component.selectedProvider.name).toBe('Acme');
      expect(component.filteredCatalog.map((entry) => entry.name)).toEqual(['syncthing']);
      expect(component.providerLabel('acme')).toBe('Acme');
      component.updateCatalog();
      expect(dialog.confirm.calls.mostRecent().args[0].message).toContain('Acme');
    });

    it('memoises the filtered catalog on the store reference and the filters', () => {
      const first = component.filteredCatalog;
      expect(component.filteredCatalog).toBe(first);
      component.search = 'sync';
      const second = component.filteredCatalog;
      expect(second).not.toBe(first);
      expect(second.map((entry) => entry.name)).toEqual(['syncthing']);
      store.catalog = [...store.catalog];
      expect(component.filteredCatalog).not.toBe(second);
    });
  });

});
