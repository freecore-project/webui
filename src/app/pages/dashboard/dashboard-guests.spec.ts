import { DashboardComponent } from './dashboard.component';

describe('Dashboard Guests card registration', () => {
  it('keeps Guests in the default set without querying for guest entities', () => {
    const dashboard = Object.create(DashboardComponent.prototype) as DashboardComponent;
    dashboard.isHA = false;
    dashboard.nics = [];
    dashboard.pools = [];

    expect(dashboard.generateDefaultConfig().map((item) => item.name)).toEqual([
      'System Information', 'CPU', 'Memory', 'Guests', 'Pools',
    ]);
  });
});
