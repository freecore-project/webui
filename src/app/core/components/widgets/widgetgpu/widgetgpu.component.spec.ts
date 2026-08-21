import { Observable, of, Subject } from 'rxjs';

import { GpuStats, WidgetGpuComponent } from './widgetgpu.component';

describe('WidgetGpuComponent', () => {
  const gib = 1024 ** 3;

  let component: WidgetGpuComponent;
  let router: jasmine.SpyObj<any>;
  let ws: jasmine.SpyObj<any>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    ws = jasmine.createSpyObj('WebSocketService', ['sub']);
    ws.sub.and.returnValue(of());
    component = new WidgetGpuComponent(
      router,
      {} as any,
      { asObservable: () => of([]) } as any,
      ws,
    );
    (component as any).core = jasmine.createSpyObj('CoreService', ['unregister']);
  });

  it('owns the exact GPU subscription, filters by PCI id, and tears it down', () => {
    const updates = new Subject<any>();
    const teardown = jasmine.createSpy('teardown');
    ws.sub.and.returnValue(new Observable((observer) => {
      const updateSub = updates.subscribe(observer);
      return () => {
        updateSub.unsubscribe();
        teardown();
      };
    }));
    component.setGpu(gpu({ id: '3:0:0', util_pct: 1 }));

    component.ngAfterViewInit();
    updates.next({
      gpus: [gpu({ id: '4:0:0', util_pct: 99 }), gpu({ id: '3:0:0', util_pct: 38 })],
    });
    component.ngOnDestroy();

    expect(ws.sub).toHaveBeenCalledOnceWith('gpu.stats:{"interval":5}');
    expect(component.gpu.id).toBe('3:0:0');
    expect(component.gpu.util_pct).toBe(38);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('sorts and folds consumers while deriving utilization and VRAM meters', () => {
    component.setGpu(gpu({
      util_pct: 38.4,
      enc_pct: 12,
      dec_pct: 0,
      vram_used: 2.1 * gib,
      vram_total: 6 * gib,
      users: [
        user('quiet', 'host', 1),
        user('vm', 'vm', 4),
        user('second', 'jail', 2, 1.5 * gib),
        user('busy', 'jail', 2, 1.9 * gib),
        user('fifth', 'host', 8),
      ],
    }));

    expect(component.hasUtilization).toBeTrue();
    expect(component.hasEngineTelemetry).toBeTrue();
    expect(component.hasVram).toBeTrue();
    expect(component.utilizationWidth()).toBe(38.4);
    expect(component.vramWidth()).toBeCloseTo(35, 5);
    expect(component.visibleUsers.map((entry) => entry.name)).toEqual(['busy', 'second', 'fifth', 'vm']);
    expect(component.userOverflow).toBe(1);
    expect(component.userTail(component.visibleUsers[0])).toBe('2 procs · 1.9 GiB vram');
    expect(component.trackByUser(9, component.visibleUsers[0])).toBe('jail:busy');
  });

  it('renders degraded and passthrough states and routes only guest-owned rows', () => {
    component.setGpu(gpu({ util_pct: null, vram_used: null, vram_total: null }));
    expect(component.isDegraded).toBeTrue();
    expect(component.hasVram).toBeFalse();

    component.setGpu(gpu({
      state: 'passthrough',
      passthrough_vm: { id: 12, name: 'buildvm' },
      users: [],
    }));
    expect(component.isPassthrough).toBeTrue();
    expect(component.pptdev).toBe('3/0/0');

    component.goToPassthroughVm();
    component.goToUser(user('plex', 'jail', 2));
    component.goToUser(user('builder', 'vm', 1));
    component.goToUser(user('ffmpeg', 'host', 1));

    expect(router.navigate.calls.allArgs()).toEqual([[['/vm']], [['/jails']], [['/vm']]]);
  });

  function gpu(overrides: Partial<GpuStats> = {}): GpuStats {
    return {
      id: '3:0:0',
      name: 'NVIDIA RTX A2000',
      vendor: 'nvidia',
      driver: 'nvidia-drm 550.54',
      nodes: ['card0', 'renderD128'],
      state: 'active',
      passthrough_vm: null,
      util_pct: 38,
      enc_pct: 12,
      dec_pct: 0,
      vram_used: 2 * gib,
      vram_total: 6 * gib,
      temp_c: 62,
      users: [],
      ...overrides,
    };
  }

  function user(name: string, kind: 'jail' | 'vm' | 'host', procs: number, gpuMem?: number) {
    return {
      name, kind, procs, gpu_mem: gpuMem,
    };
  }
});
