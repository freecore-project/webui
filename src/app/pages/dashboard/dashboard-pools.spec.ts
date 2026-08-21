import { Subject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard aggregate Pools configuration (#444)', () => {
  function readyDashboard(): DashboardComponent {
    const dashboard = Object.create(DashboardComponent.prototype) as DashboardComponent;
    Object.assign(dashboard, {
      isHA: false, statsDataEvents: new Subject(), nics: [], pools: [], volumeData: {}, gpus: [],
    });
    return dashboard;
  }

  it('provides exactly one identifier-free Pools card for empty and multiple-pool installations', () => {
    const dashboard = readyDashboard();
    for (const pools of [[], [{ name: 'tank' }, { name: 'backup' }]]) {
      dashboard.pools = pools;
      expect(dashboard.generateDefaultConfig().filter((item) => /pool/i.test(item.name)))
        .toEqual([{ name: 'Pools', rendered: true }]);
    }
  });

  it('collapses legacy cards at the first position and includes every current pool', () => {
    const dashboard = readyDashboard();
    const cpu = { name: 'CPU', rendered: true };
    const memory = { name: 'Memory', rendered: true };
    dashboard.dashState = [cpu, { name: 'Pool', identifier: 'name,removed', rendered: false, position: 2 },
      memory, { name: 'Pool', identifier: 'name,tank', rendered: true }];
    dashboard.pools = [{ name: 'tank' }, { name: 'newly-imported' }];
    dashboard.isDataReady();

    expect(dashboard.dashState).toEqual([cpu, { name: 'Pools', rendered: true, position: 2 }, memory]);
    expect(dashboard.dataFromConfig(dashboard.dashState[1])).toBe(dashboard.pools);
    const state = dashboard.dashState;
    dashboard.pools = [{ name: 'newly-imported' }];
    dashboard.isDataReady();
    expect(dashboard.dashState).toBe(state);
    expect(dashboard.dataFromConfig(state[1])).toEqual([{ name: 'newly-imported' }]);
  });

  it('preserves an explicitly hidden aggregate or all-hidden legacy pool cards', () => {
    const dashboard = readyDashboard();
    for (const state of [
      [{ name: 'Pool', identifier: 'name,tank', rendered: false }, { name: 'Pool', identifier: 'name,backup', rendered: false }],
      [{ name: 'Pool', identifier: 'name,tank', rendered: true }, { name: 'Pools', rendered: false }],
    ]) {
      dashboard.dashState = state;
      dashboard.isDataReady();
      expect(dashboard.dashState).toEqual([{ name: 'Pools', rendered: false }]);
    }
  });

  it('adds Pools to legacy configurations with no pool entries without changing other choices', () => {
    const dashboard = readyDashboard();
    const memory = { name: 'Memory', rendered: false, position: 3 };
    dashboard.dashState = [memory];
    dashboard.isDataReady();
    expect(dashboard.dashState).toEqual([memory, { name: 'Pools', rendered: true }]);
  });

  it('keys replacement capacity by dataset identity and leaves missing values unknown', () => {
    const dashboard = readyDashboard();
    dashboard.setVolumeData({ name: 'RootDatasets', data: [
      { id: 'backup', used: { parsed: 20 }, available: { parsed: 80 } },
      { id: 'tank', used: { parsed: 50 }, available: { parsed: 150 } },
      { id: 'locked' }, null,
    ] });
    expect(dashboard.volumeData).toEqual({
      backup: { used: 20, avail: 80 }, tank: { used: 50, avail: 150 }, locked: { used: undefined, avail: undefined },
    });
    dashboard.setVolumeData({ name: 'RootDatasets', data: [{ id: 'tank', used: { parsed: 60 }, available: { parsed: 140 } }] });
    expect(dashboard.volumeData).toEqual({ tank: { used: 60, avail: 140 } });
  });
});
