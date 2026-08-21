import { Observable, of, Subject, throwError } from 'rxjs';

import { GpuStats } from '../../core/components/widgets/widgetgpu/widgetgpu.component';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard GPU card registration', () => {
  it('generates one identified card per inventory GPU and preserves unavailable diagnostics', () => {
    const dashboard = readyDashboard();
    dashboard.setGpuInventory({ gpus: [gpu(), gpu({ id: '9:0:0', vendor: 'amd' }), null, { id: 9 }] });

    const gpuItems = dashboard.generateDefaultConfig().filter((item) => item.name === 'GPU');

    expect(gpuItems.map((item) => item.identifier)).toEqual(['id,3:0:0', 'id,9:0:0']);
    expect(dashboard.dataFromConfig(gpuItems[1])).toBe(dashboard.gpus[1]);
    expect(dashboard.gpus[0].state).toBe('idle');
  });

  it('gives no card to a GPU with no driver attached', () => {
    // the internal development record: middleware sets `no-driver` as the negation of
    // has_driver, so such a device reports no utilization, no VRAM and no
    // temperature -- the frame would hold only a PCI id. Card-spec law 4
    // forbids an empty row; an empty frame is worse. Seen on the RTX box,
    // where the Intel iGPU sat beside the RTX 4060 saying nothing.
    const dashboard = readyDashboard();
    dashboard.setGpuInventory({ gpus: [
      gpu({ id: '0:2:0', name: 'Raptor Lake-S UHD Graphics', vendor: 'intel', state: 'no-driver' }),
      gpu({ id: '1:0:0', name: 'GeForce RTX 4060', state: 'active' }),
    ] });

    expect(dashboard.gpus.map((entry) => entry.id)).toEqual(['1:0:0']);
    expect(dashboard.gpuInventoryReady).toBeTrue();
  });

  it('still cards a passthrough or degraded GPU, which have something to say', () => {
    const dashboard = readyDashboard();
    dashboard.setGpuInventory({ gpus: [
      gpu({ id: '4:0:0', state: 'passthrough', passthrough_vm: { id: 1, name: 'buildvm' } }),
      gpu({ id: '5:0:0', state: 'idle' }),
    ] });

    // Passthrough names the VM that owns it; idle means a driver is attached
    // and it simply has no consumers right now.
    expect(dashboard.gpus.map((entry) => entry.id)).toEqual(['4:0:0', '5:0:0']);
  });

  it('waits for explicit driver configuration while the existing dashboard and realtime stats continue', () => {
    const dashboard = readyDashboard();
    const tunables = new Subject<any>();
    const payloads = new Subject<any>();
    const realtime = new Subject<any>();
    const ws = connect(dashboard, tunables, payloads);
    (dashboard as any).core = { register: () => realtime };
    const cpuStats = jasmine.createSpy('CPU stats');
    dashboard.statsDataEvents.subscribe(cpuStats);

    dashboard.startListeners();
    dashboard.isDataReady();
    realtime.next({ data: { cpu: { average: { usage: 3 } } } });

    expect(ws.call).toHaveBeenCalledOnceWith('tunable.query', [[
      ['var', '=', 'kld_list'], ['type', '=', 'RC'], ['enabled', '=', true],
    ]]);
    expect(ws.sub).not.toHaveBeenCalled();
    expect(dashboard.dashState.map((item) => item.name)).toEqual([
      'System Information', 'CPU', 'Memory', 'Guests', 'Pools',
    ]);
    expect(cpuStats).toHaveBeenCalledWith({ name: 'CpuStats', data: { average: { usage: 3 } } });

    tunables.next([driverTunable('hwpmc /boot/modules/amdgpu.ko')]);
    payloads.next({ gpus: [gpu()] });

    expect(dashboard.dashState.map((item) => item.name)).toEqual([
      'System Information', 'CPU', 'Memory', 'Guests', 'GPU', 'Pools',
    ]);
    expect(dashboard.dashState[4].identifier).toBe('id,3:0:0');
  });

  it('takes one configured inventory payload and tears down both discovery subscriptions', () => {
    const dashboard = readyDashboard();
    const tunables = new Subject<any>();
    const payloads = new Subject<any>();
    const teardown = jasmine.createSpy('inventory teardown');
    const ws = connect(dashboard, tunables, new Observable((observer) => {
      const subscription = payloads.subscribe(observer);
      return () => { subscription.unsubscribe(); teardown(); };
    }));

    dashboard.startListeners();
    tunables.next([driverTunable('i915kms')]);
    tunables.next([driverTunable('amdgpu')]);
    payloads.next({ gpus: [gpu()] });
    payloads.next({ gpus: [gpu({ id: '9:0:0' })] });

    expect(ws.sub).toHaveBeenCalledOnceWith('gpu.stats:{"interval":5}');
    expect(dashboard.gpus.map((entry) => entry.id)).toEqual(['3:0:0']);
    expect(tunables.observed).toBeFalse();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('clears saved GPU cards without subscribing when the operator has not opted in', () => {
    const dashboard = readyDashboard();
    const savedSystem = { name: 'System Information', rendered: true, position: 1 };
    const savedGuests = { name: 'Guests', rendered: false, position: 3 };
    dashboard.dashState = [
      savedSystem, { name: 'GPU', identifier: 'id,3:0:0', rendered: true }, savedGuests,
    ];
    const ws = connect(dashboard, of([]));

    dashboard.startListeners();

    expect(ws.sub).not.toHaveBeenCalled();
    expect(dashboard.gpuInventoryReady).toBeTrue();
    expect(dashboard.gpus).toEqual([]);
    expect(dashboard.dashState).toEqual([savedSystem, savedGuests, { name: 'Pools', rendered: true }]);
    expect(dashboard.availableWidgets.some((item) => item.name === 'GPU')).toBeFalse();
  });

  it('recognizes exact supported module tokens with optional paths and .ko suffixes', () => {
    const modules = ['drm', 'drm2', 'i915kms', 'amdgpu', 'radeonkms', 'nvidia', 'nvidia-modeset', 'nvidia-drm'];
    for (const module of modules) {
      for (const token of [module, `${module}.ko`, `/boot/modules/${module}.ko`]) {
        const dashboard = readyDashboard();
        const ws = connect(dashboard, of([driverTunable(`hwpmc\t${token}\nt4_tom`)]));
        dashboard.startListeners();
        expect(ws.sub).withContext(token).toHaveBeenCalledOnceWith('gpu.stats:{"interval":5}');
        dashboard.stopListeners();
      }
    }
  });

  it('rejects disabled, non-RC, unrelated, malformed and partial module matches', () => {
    const invalid = [
      null, {}, [null],
      [driverTunable('amdgpu', { enabled: false })],
      [driverTunable('amdgpu', { enabled: 'true' })],
      [driverTunable('amdgpu', { type: 'LOADER' })],
      [driverTunable('amdgpu', { type: 'SYSCTL' })],
      [driverTunable('amdgpu', { var: 'early_kld_list' })],
      [driverTunable('amdgpu', { value: null })],
      ...['', 'hwpmc t4_tom', 'ppt', 'nvidia-settings', 'amdgpu_firmware',
        'not-i915kms', 'drm.ko.backup', 'NVIDIA', 'amdgpu,nvidia', '$(nvidia)', '/boot/amdgpu/other.ko']
        .map((value) => [driverTunable(value)]),
    ];
    for (const response of invalid) {
      const dashboard = readyDashboard();
      const ws = connect(dashboard, of(response));
      dashboard.startListeners();
      expect(ws.sub).withContext(JSON.stringify(response)).not.toHaveBeenCalled();
      expect(dashboard.gpuInventoryReady).toBeTrue();
      expect(dashboard.gpus).toEqual([]);
    }
  });

  it('fails closed on tunable-query or inventory errors without blocking the dashboard', () => {
    for (const configFails of [true, false]) {
      const dashboard = readyDashboard();
      dashboard.dashState = [{ name: 'GPU', identifier: 'id,3:0:0', rendered: true }];
      const error = throwError(() => new Error('RPC unavailable'));
      const ws = connect(dashboard, configFails ? error : of([driverTunable('drm')]), error);

      dashboard.startListeners();

      expect(ws.sub.calls.count()).toBe(configFails ? 0 : 1);
      expect(dashboard.gpuInventoryReady).toBeTrue();
      expect(dashboard.gpus).toEqual([]);
      expect(dashboard.dashState).toEqual([{ name: 'Pools', rendered: true }]);
      expect(dashboard.availableWidgets.some((item) => item.name === 'CPU')).toBeTrue();
    }
  });

  it('cancels a pending configuration query before it can start GPU statistics', () => {
    const dashboard = readyDashboard();
    const tunables = new Subject<any>();
    const ws = connect(dashboard, tunables);
    dashboard.startListeners();

    dashboard.stopListeners();
    tunables.next([driverTunable('amdgpu')]);

    expect(tunables.observed).toBeFalse();
    expect(ws.sub).not.toHaveBeenCalled();
  });

  it('cancels a pending configured inventory stream on teardown', () => {
    const dashboard = readyDashboard();
    const payloads = new Subject<any>();
    connect(dashboard, of([driverTunable('amdgpu')]), payloads);
    dashboard.startListeners();
    expect(payloads.observed).toBeTrue();

    dashboard.stopListeners();
    payloads.next({ gpus: [gpu()] });

    expect(payloads.observed).toBeFalse();
    expect(dashboard.gpus).toEqual([]);
  });

  function connect(dashboard: DashboardComponent, tunables: Observable<any>, payloads: Observable<any> = new Subject()) {
    const ws = jasmine.createSpyObj('WebSocketService', ['call', 'sub']);
    ws.call.and.returnValue(tunables);
    ws.sub.and.returnValue(payloads);
    (dashboard as any).ws = ws;
    (dashboard as any).core = { register: () => of() };
    return ws;
  }

  function driverTunable(value: string, overrides: Record<string, any> = {}) {
    return { var: 'kld_list', type: 'RC', enabled: true, value, ...overrides };
  }

  function gpu(overrides: Partial<GpuStats> = {}): GpuStats {
    return {
      id: '3:0:0', name: 'NVIDIA RTX A2000', vendor: 'nvidia', driver: 'vgapci',
      nodes: [], state: 'idle', passthrough_vm: null, users: [],
      util_pct: null, enc_pct: null, dec_pct: null, vram_used: null, vram_total: null, temp_c: null,
      ...overrides,
    };
  }

  function readyDashboard(): DashboardComponent {
    const dashboard = Object.create(DashboardComponent.prototype) as DashboardComponent;
    dashboard.isHA = false;
    dashboard.statsDataEvents = new Subject<any>();
    dashboard.nics = [];
    dashboard.pools = [];
    dashboard.volumeData = {};
    dashboard.gpus = [];
    dashboard.gpuInventoryReady = false;
    return dashboard;
  }
});
