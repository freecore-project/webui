import { of, Subject, throwError } from 'rxjs';

import { ApplicationsStore, applicationNetworkPayload, stripAnsi } from './applications.store';
import { ApplicationsComponent } from './applications.component';

const config = (configured: boolean) => ({
  id: 1,
  pool: configured ? 'tank' : null,
  subnet: '10.88.0.0/16',
  configured,
  runtime_ready: configured,
  restart_on_boot: false,
  linux_compat_enabled: false,
  convert_enabled: false,
  paths: configured ? {} : null,
});

const installed = [{
  name: 'miniflux',
  container_name: 'freecore-app-miniflux',
  image: 'ghcr.io/daemonless/miniflux@sha256:abc',
  digest: 'sha256:abc',
  status: 'RUNNING',
  running: true,
  health: 'healthy',
  error: null,
  ports: [],
  environment: [],
  volumes: [],
  annotations: [],
  restart_policy: 'always',
  portal: null,
  created_at: '',
  updated_at: '',
}];

const catalog = [{
  id: 'daemonless:miniflux',
  name: 'miniflux',
  provider: 'daemonless',
  provider_name: 'Daemonless',
  catalog_app: true,
  title: 'Miniflux',
  category: 'Productivity',
  description: 'Feed reader',
  icon: null,
  architectures: ['amd64'],
  host_architecture: 'amd64',
  resolved: false,
  available: false,
  status: 'UNRESOLVED',
  reason: null,
  attribution: {
    provider: 'Daemonless',
    source_url: 'https://github.com/daemonless/miniflux',
    support_url: 'https://github.com/daemonless/miniflux/issues',
    support_owner: 'Daemonless maintainers',
    license: null,
    relationship: 'Independent upstream catalog provider',
  },
}];

describe('ApplicationsStore', () => {
  let ws: any;
  let store: ApplicationsStore;
  let nextJobId: number;
  const dispatchedJobs = new Map<number, any[]>();
  let calls: { [method: string]: any };

  beforeEach(() => {
    nextJobId = 40;
    dispatchedJobs.clear();
    calls = {
      'applications.config': config(false),
      'applications.query': [],
      'pool.query': [{
        id: 1, name: 'tank', status: 'ONLINE', healthy: true, is_decrypted: true,
      }],
      'applications.catalog.providers': [{ id: 'daemonless', name: 'Daemonless' }],
      'applications.catalog.query': catalog,
      // the internal development record: core loading also asks for orphaned app-owned data.
      'applications.orphaned_data': [],
    };
    ws = {
      onCloseSubject: new Subject(), subscribe: () => new Subject(), unsubscribe: () => {},
      results: jasmine.createSpy('results').and.returnValue(of({ state: 'SUCCESS', result: true })),
      dispatch: jasmine.createSpy('dispatch').and.callFake((method, args) => {
        const id = ++nextJobId;
        const jobs = [];
        ws.results(method, args).subscribe((job) => jobs.push({ ...job, id }));
        dispatchedJobs.set(id, jobs);
        return of(id);
      }),
      call: jasmine.createSpy('call').and.callFake((method, args) => {
        if (method === 'core.get_jobs') {
          return of(dispatchedJobs.get(args[0][0][2]).slice(-1));
        }
        return method in calls ? of(calls[method]) : ws.dispatch(method, args);
      }),
    };
    store = new ApplicationsStore(ws, { open: () => ({
      componentInstance: { setDescription: () => {} }, close: () => {}, afterClosed: () => of(true),
    }) } as any);
  });

  it('loads a fresh system without configuring or starting anything', () => {
    store.load();

    expect(store.config.configured).toBeFalse();
    expect(store.installed).toEqual([]);
    expect(store.catalog).toEqual(catalog as any);
    expect(store.pools.map((pool) => pool.name)).toEqual(['tank']);
    expect(ws.dispatch).not.toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => (
      method.startsWith('bastille.') || method.startsWith('jail.')
    ))).toBeFalse();
  });

  it('keeps installed workloads visible during a provider outage', () => {
    calls['applications.config'] = config(true);
    calls['applications.query'] = installed;
    ws.call.and.callFake((method) => (
      method === 'applications.catalog.query'
        ? throwError(() => ({ message: 'Daemonless is unreachable' }))
        : of(calls[method])
    ));

    store.load();

    expect(store.installed).toEqual(installed as any);
    expect(store.providerError).toBe('Daemonless is unreachable');
    expect(store.coreError).toBe('');
  });

  it('publishes settled Installed results and retains the last rows when a refresh fails', () => {
    const query = new Subject<any>();
    const received: { rows: any; loading: boolean }[] = [];
    const subscription = store.installed$.subscribe((rows) => received.push({ rows, loading: store.coreLoading }));
    ws.call.and.callFake((method) => method === 'applications.query' ? query : of(calls[method]));
    store.loadCore();
    expect(received).toEqual([{ rows: null, loading: false }]);
    query.next(installed);
    query.complete();
    expect(received[1]).toEqual({ rows: installed, loading: false });

    ws.call.and.callFake((method) => method === 'applications.query'
      ? throwError(() => ({ message: 'Connection lost' })) : of(calls[method]));
    store.loadCore();
    expect(received[2]).toEqual({ rows: installed, loading: false });
    expect(store.coreError).toBe('Connection lost');
    expect(store.installed).toBe(installed as any);
    subscription.unsubscribe();
  });

  it('asks the certificate store for what a mount needs and never for a private key', () => {
    // the internal development record: unselected, certificate.query returns every certificate's key.
    calls['certificate.query'] = [];
    store.certificateChoices().subscribe();

    const [method, args] = ws.call.calls.mostRecent().args;
    expect(method).toBe('certificate.query');
    expect(args[0]).toEqual([]);
    expect(args[1].select).toEqual(
      ['id', 'name', 'fingerprint', 'until', 'revoked', 'cert_type_CSR', 'key_length', 'chain_list'],
    );
    expect(args[1].select).not.toContain('privatekey');
  });

  it('configures Applications independently from an installation', () => {
    ws.results.and.returnValue(of(
      { state: 'RUNNING', progress: { percent: 50, description: 'Creating datasets' } },
      { state: 'SUCCESS', result: config(true) },
    ));

    store.configure('tank', '10.89.0.0/16');

    expect(ws.dispatch).toHaveBeenCalledOnceWith(
      'applications.configure', [{
        pool: 'tank', subnet: '10.89.0.0/16', linux_compat_enabled: false, convert_enabled: false,
      }],
    );
    expect(store.operationError).toBe('');
    expect(store.activeJob).toBeNull();
  });

  it('configures first use before installing the object-bound catalog payload', () => {
    store.config = config(false);
    const payload: any = {
      name: 'miniflux',
      image: 'ghcr.io/daemonless/miniflux@sha256:abc',
      ports: [],
      environment: [],
      volumes: [],
      annotations: [],
      restart_policy: 'always',
      portal: null,
      health_timeout: 60,
    };
    ws.results.and.callFake((method) => of(
      { state: 'RUNNING', progress: { percent: 50, description: method } },
      { state: 'SUCCESS', result: true },
    ));
    const detail: any = {
      id: 'daemonless:miniflux',
      catalog_app: true,
      catalog: { compose_sha256: 'a'.repeat(64) },
    };

    store.install(payload, 'tank', '10.88.0.0/16', detail);

    expect(ws.dispatch.calls.allArgs()).toEqual([
      ['applications.configure', [{
        pool: 'tank', subnet: '10.88.0.0/16', linux_compat_enabled: false, convert_enabled: false,
      }]],
      ['applications.catalog.install', [{
        id: 'daemonless:miniflux',
        compose_sha256: 'a'.repeat(64),
        name: 'miniflux',
        ports: [],
        environment: [],
        volumes: [],
        labels: [],
        certificates: [],
        restart_policy: 'always',
        health_timeout: 60,
        network: { mode: 'managed' },
      }]],
    ]);
    expect(store.operationError).toBe('');
    expect(store.activeJob).toBeNull();
  });

  it('normalizes the network block a payload carries (the internal development record)', () => {
    expect(applicationNetworkPayload(undefined)).toEqual({ mode: 'managed' });
    expect(applicationNetworkPayload({ mode: 'managed', interface: 'em0' } as any)).toEqual({ mode: 'managed' });
    expect(applicationNetworkPayload({
      mode: 'lan', interface: 'em0', address: ' 192.168.1.201/24 ', gateway: '192.168.1.1',
    })).toEqual({
      mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
      managed_access: false,
    });
    // the internal development record: the flag travels; the assigned address never does
    expect(applicationNetworkPayload({
      mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
      managed_access: true, managed_address: '10.88.255.254',
    })).toEqual({
      mode: 'lan', interface: 'em0', address: '192.168.1.201/24', gateway: '192.168.1.1',
      managed_access: true,
    });
  });

  it('surfaces installation failure after middleware rollback', () => {
    store.config = config(true);
    const payload: any = {
      name: 'miniflux',
      image: 'image@sha256:abc',
      ports: [],
      environment: [],
      volumes: [],
      annotations: [],
      restart_policy: 'always',
      portal: null,
      health_timeout: 60,
    };
    ws.results.and.returnValue(of({
      state: 'FAILED',
      error: 'Health check failed; created container and datasets were rolled back.',
      progress: { percent: 75, description: 'Checking health' },
    }));

    store.install(payload, 'tank', '10.88.0.0/16', {
      id: 'daemonless:miniflux',
      catalog_app: true,
      catalog: { compose_sha256: 'a'.repeat(64) },
    } as any);

    expect(store.operationError).toContain('rolled back');
    expect(store.activeJob).toBeNull();
  });

  it('installs catalog entries through the object-bound middleware endpoint', () => {
    store.config = config(true);
    const payload: any = {
      name: 'my-miniflux',
      image: 'ghcr.io/daemonless/miniflux@sha256:abc',
      ports: [{ host_port: 18080, container_port: 8080, protocol: 'tcp' }],
      environment: [{ name: 'TOKEN', value: 'configured' }],
      volumes: [{
        name: 'data', target: '/data', dataset: '', read_only: false,
      }],
      annotations: [{ name: 'org.freebsd.jail.allow.raw_sockets', value: 'true' }],
      restart_policy: 'always',
      portal: { scheme: 'http', port: 18080, path: '/' },
      health_timeout: 60,
    };
    const detail: any = {
      id: 'daemonless:miniflux',
      catalog_app: true,
      catalog: { compose_sha256: 'a'.repeat(64) },
    };
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: true }));

    store.install(payload, 'tank', '10.88.0.0/16', detail);

    expect(ws.dispatch).toHaveBeenCalledWith('applications.catalog.install', [{
      id: 'daemonless:miniflux',
      compose_sha256: 'a'.repeat(64),
      name: 'my-miniflux',
      ports: [{ host_port: 18080, container_port: 8080, protocol: 'tcp' }],
      environment: [{ name: 'TOKEN', value: 'configured' }],
      volumes: [{ name: 'data', dataset: null }],
      labels: [],
      certificates: [],
      restart_policy: 'always',
      health_timeout: 60,
      network: { mode: 'managed' },
    }]);
  });

  // the internal development record: the page's after-install step runs once the job settled, never on failure
  it('calls the success hook once the install job settles and not on failure', () => {
    store.config = config(true);
    const payload: any = {
      name: 'miniflux', image: 'image@sha256:abc', ports: [], environment: [], volumes: [], annotations: [],
      restart_policy: 'always', portal: null, health_timeout: 60,
    };
    const detail: any = { id: 'daemonless:miniflux', catalog_app: true, catalog: { compose_sha256: 'a'.repeat(64) } };
    const hook = jasmine.createSpy('onSuccess');
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: true }));
    store.install(payload, 'tank', '10.88.0.0/16', detail, hook);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(store.selectedDetail).toBeNull();

    hook.calls.reset();
    ws.results.and.returnValue(of({ state: 'FAILED', error: 'Health check failed.', progress: { percent: 75, description: 'Checking health' } }));
    store.install(payload, 'tank', '10.88.0.0/16', detail, hook);
    expect(hook).not.toHaveBeenCalled();
    expect(store.operationError).toContain('Health check failed');
  });

  it('preserves app-owned and external data by default on removal', () => {
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: true }));

    store.remove(installed[0] as any);

    expect(ws.dispatch).toHaveBeenCalledWith('applications.remove', [
      'miniflux',
      { remove_data: false },
    ]);
  });

  it('reports running state loaded from middleware rather than inferring it', () => {
    calls['applications.config'] = config(true);
    calls['applications.query'] = installed;

    store.loadCore();

    expect(store.installed[0].running).toBeTrue();
    expect(store.installed[0].status).toBe('RUNNING');
    expect(store.installed[0].health).toBe('healthy');
  });
  it('sends only the reviewed catalog identity when recreating an installed application', () => {
    store.replace(installed[0] as any, { id: 'daemonless:miniflux', catalog: { compose_sha256: 'a'.repeat(64) } } as any, true);
    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.catalog.update', [{
      id: 'daemonless:miniflux', compose_sha256: 'a'.repeat(64), name: 'miniflux', recreate: true,
    }]);
  });

  // the internal development record: the configure call always carries both lanes, and a
  // pool change repeats what is configured rather than flipping a lane off.
  it('carries the experimental flags through configure and keeps them on a pool change', () => {
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: config(true) }));

    store.configure('tank', '10.89.0.0/16', { linux_compat_enabled: true, convert_enabled: true });
    expect(ws.dispatch).toHaveBeenCalledWith('applications.configure', [{
      pool: 'tank', subnet: '10.89.0.0/16', linux_compat_enabled: true, convert_enabled: true,
    }]);

    store.config = { ...config(true), linux_compat_enabled: true, convert_enabled: false } as any;
    store.configure('backup', '10.90.0.0/16');
    expect(ws.dispatch.calls.mostRecent().args).toEqual(['applications.configure', [{
      pool: 'backup', subnet: '10.90.0.0/16', linux_compat_enabled: true, convert_enabled: false,
    }]]);
  });

  // the internal development record: the unconfigure job carries exactly the two options and
  // the page re-reads its state afterwards, so a success shows the fresh install.
  it('unconfigures with the two options as given and reloads', () => {
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: true }));
    store.config = config(true) as any;

    store.unconfigure(true, false);

    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.unconfigure', [{
      remove_applications: true, keep_data: false,
    }]);
    expect(ws.call).toHaveBeenCalledWith('applications.config');
    expect(store.activeJob).toBeNull();
    expect(store.config.configured).toBeFalse();
  });

  // the internal development record: the second install tier goes through applications.install
  // with the administrator's acknowledgement, and never without it.
  it('imports an image only with the unreviewed acknowledgement', () => {
    store.config = config(true);
    ws.results.and.returnValue(of({ state: 'SUCCESS', result: true }));
    const payload: any = {
      name: 'alpine', image: 'docker.io/library/alpine:3.20', image_os: 'linux', ports: [],
      environment: [], volumes: [], annotations: [], restart_policy: 'always', portal: null,
      healthcheck: null, health_timeout: 60, acknowledge_unreviewed: false,
    };

    store.importImage(payload, 'tank');
    expect(ws.dispatch).not.toHaveBeenCalled();
    expect(store.operationError).toContain('Acknowledge');

    store.importImage({ ...payload, acknowledge_unreviewed: true }, 'tank');
    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.install', [jasmine.objectContaining({
      image: 'docker.io/library/alpine:3.20', image_os: 'linux', acknowledge_unreviewed: true,
    })]);
    expect(store.operationError).toBe('');
    expect(store.activeJob).toBeNull();
  });

  // the internal development record: the convert reads are plain calls; apply is the ordinary job.
  it('reads convert sources, detection, plans and compose files as plain calls and applies as a job', () => {
    calls['applications.convert.sources'] = [{ name: 'j' }];
    calls['applications.convert.detect'] = { ref: 'j' };
    calls['applications.convert.plan'] = { plan_id: 'x' };
    calls['applications.convert.discard'] = true;
    calls['applications.convert.read_compose'] = { service: 's' };
    let seen: any[] = [];
    store.convertSources().subscribe((value) => seen.push(value));
    store.convertDetect({ kind: 'jail', jail: 'j', engine: 'iocage' }).subscribe((value) => seen.push(value));
    store.convertPlan({ kind: 'jail', jail: 'j', engine: 'bastille' }, { mode: 'lift', name: 'j', ports: [] }).subscribe((value) => seen.push(value));
    store.convertDiscard('x').subscribe((value) => seen.push(value));
    store.readCompose({ url: 'https://raw.githubusercontent.com/a/b/c.yaml' }).subscribe((value) => seen.push(value));
    expect(seen).toEqual([[{ name: 'j' }], { ref: 'j' }, { plan_id: 'x' }, true, { service: 's' }]);
    expect(ws.call).toHaveBeenCalledWith('applications.convert.plan', [{ kind: 'jail', jail: 'j', engine: 'bastille' }, { mode: 'lift', name: 'j', ports: [] }]);
    expect(ws.dispatch).not.toHaveBeenCalled();

    ws.results.and.returnValue(of({ state: 'SUCCESS', result: { name: 'j' } }));
    store.convertApply('x');
    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.convert.apply', ['x', { confirm: true }]);
    expect(store.activeJob).toBeNull();
    expect(store.operationError).toBe('');
  });

  it('blocks overlapping lifecycle, configuration, and catalog mutations', () => {
    store.activeJob = { state: 'RUNNING' } as any;
    store.start(installed[0] as any);
    store.stop(installed[0] as any);
    store.restart(installed[0] as any);
    store.remove(installed[0] as any);
    store.configure('tank');
    store.loadCatalog(true);
    expect(ws.dispatch).not.toHaveBeenCalled();
    expect(ws.call).not.toHaveBeenCalled();
  });

});

// the internal development record: the Logs panel is a <pre>; colour codes in container output are text there.
describe('Application logs presentation', () => {
  it('strips ANSI colour, cursor and OSC sequences but keeps every character the container printed', () => {
    const coloured = '\x1b[36m2026-09-16T21:54:56Z\x1b[0m [\x1b[32mSERVER\x1b[0m] \x1b[36mINFO:\x1b[0m Env: production\n'
      + '\x1b[1;31mfatal\x1b[m tab\there \x1b]0;title\x07plain \x1b[2K\x1b[1Aline';
    expect(stripAnsi(coloured)).toBe('2026-09-16T21:54:56Z [SERVER] INFO: Env: production\nfatal tab\there plain line');
    expect(stripAnsi('[init] Starting s6 supervision...')).toBe('[init] Starting s6 supervision...');
    expect(stripAnsi('')).toBe('');
  });

  it('loads logs through the store already stripped', () => {
    const ws: any = {
      onCloseSubject: new Subject(), subscribe: () => new Subject(), unsubscribe: () => {},
      call: jasmine.createSpy('call').and.returnValue(of('\x1b[32mready\x1b[0m\n')),
      dispatch: jasmine.createSpy('dispatch'),
    };
    const store = new ApplicationsStore(ws, { open: () => ({ afterClosed: () => of(true) }) } as any);
    store.loadLogs(installed[0] as any);
    expect(ws.call).toHaveBeenCalledWith('applications.logs', ['miniflux', 200]);
    expect(store.logs).toBe('ready\n');
    expect(store.logsApplication).toBe('miniflux');
  });

  describe('latest log selection', () => {
    let store: ApplicationsStore;
    let responses: Subject<string>[];

    beforeEach(() => {
      responses = [];
      const ws = { call: () => {
        const response = new Subject<string>();
        responses.push(response);
        return response;
      } };
      store = new ApplicationsStore(ws as any, {} as any);
    });

    const select = (name: string): void => store.loadLogs({ ...installed[0], name } as any);

    it('does not put the first app output under the second heading while its response is pending', () => {
      select('first');
      select('second');
      responses[0].next('first output');
      expect(store.logsApplication).toBe('second');
      expect(store.logs).toBe('');
      responses[1].next('\x1b[32msecond output\x1b[0m');
      expect(store.logs).toBe('second output');
    });

    it('retains the latest result when responses finish in reverse order, including the same app', () => {
      select('same-app');
      select('same-app');
      responses[1].next('new output');
      responses[0].next('old output');
      expect(store.logsApplication).toBe('same-app');
      expect(store.logs).toBe('new output');
    });

    it('ignores obsolete errors but still reports an error for the current selection', () => {
      select('first');
      select('second');
      responses[0].error({ reason: 'old failure' });
      expect(store.operationError).toBe('');
      responses[1].error({ reason: 'current failure' });
      expect(store.operationError).toBe('current failure');
    });

    it('invalidates pending success and error on Close, including a later selection', () => {
      select('first');
      store.clearLogs();
      responses[0].next('closed output');
      expect(store.logs).toBe('');
      expect(store.logsApplication).toBe('');
      select('second');
      responses[0].error({ reason: 'closed failure' });
      expect(store.operationError).toBe('');
      responses[1].next('second output');
      expect(store.logs).toBe('second output');
    });

    it('invalidates pending logs when the actual Applications page is destroyed', () => {
      select('first');
      const page = new ApplicationsComponent(store, {} as any, {} as any, {} as any, {} as any, {} as any);
      page.ngOnDestroy();
      responses[0].next('departed output');
      responses[0].error({ reason: 'departed failure' });
      expect(store.logsApplication).toBe('');
      expect(store.logs).toBe('');
      expect(store.operationError).toBe('');
    });
  });
});
