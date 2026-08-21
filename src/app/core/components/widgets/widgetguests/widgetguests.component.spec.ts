import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';

import { WidgetGuestsComponent } from './widgetguests.component';

describe('WidgetGuestsComponent', () => {
  const gib = 1024 ** 3;

  let component: WidgetGuestsComponent;
  let router: jasmine.SpyObj<any>;
  let ws: jasmine.SpyObj<any>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    ws = jasmine.createSpyObj('WebSocketService', ['sub']);
    ws.sub.and.returnValue(of());
    component = new WidgetGuestsComponent(
      router,
      {} as any,
      { asObservable: () => of([]) } as any,
      ws,
    );
    (component as any).core = jasmine.createSpyObj('CoreService', ['unregister']);
  });

  it('owns the exact guest event-source subscription and tears it down', () => {
    const teardown = jasmine.createSpy('teardown');
    ws.sub.and.returnValue(new Observable(() => teardown));

    component.ngAfterViewInit();
    component.ngOnDestroy();

    expect(ws.sub).toHaveBeenCalledOnceWith('guest.stats:{"interval":5}');
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('settles the card when the first guest-stat event never arrives', fakeAsync(() => {
    const guestStats = new Subject<any>();
    ws.sub.and.returnValue(guestStats);

    component.ngAfterViewInit();
    tick(component.initialStatsTimeoutMs);

    expect(component.loaded).toBe(true);
    expect(component.statsUnavailable).toBe(true);

    guestStats.next({
      cpu_count: 4,
      vms: [],
      jails: [],
      services_bytes: 0,
      attributed_bytes: 0,
    });
    expect(component.statsUnavailable).toBe(false);
    expect(component.cpuPct).toBe(0);

    component.ngOnDestroy();
  }));

  it('shows settled zero CPU for an empty host or only stopped VMs', () => {
    for (const vms of [[], [vm('off', 'STOPPED', null, null)]]) {
      component.setGuestStats({
        cpu_count: 4, vms, jails: [], services_bytes: 2 * gib, attributed_bytes: 0,
      });
      expect(component.loaded).toBe(true);
      expect(component.statsUnavailable).toBe(false);
      expect(component.cpuPct).toBe(0);
      expect(component.cpuLabel(component.cpuPct)).toBe('0%');
      expect(component.baseBytes).toBe(2 * gib);
    }
  });

  it('sorts running VMs and busiest jails into the bounded row budget', () => {
    component.statsUnavailable = true;
    component.setGuestStats({
      cpu_count: 8,
      vms: [
        vm('stopped', 'STOPPED', null, null),
        vm('medium', 'RUNNING', 8, 2),
        vm('rss-tie-b', 'RUNNING', 3, 5),
        vm('rss-tie-a', 'RUNNING', 3, 6),
        vm('busy', 'RUNNING', 12, 1),
        vm('quiet', 'RUNNING', 1, 9),
      ],
      jails: [
        jail('quiet-jail', 1, 9),
        jail('rss-jail', 4, 8),
        jail('busy-jail', 9, 1),
        jail('fourth-jail', 3, 7),
      ],
      services_bytes: 64 * gib,
      attributed_bytes: 48 * gib,
    });

    expect(component.vms.map((guest) => guest.name)).toEqual([
      'busy', 'medium', 'rss-tie-a', 'rss-tie-b', 'quiet', 'stopped',
    ]);
    // the internal development record: the frame holds a label, two VM rows and the "+ N more"
    // link (165px of 192); the smaller family keeps one aggregated row.
    expect(component.visibleVms.map((guest) => guest.name)).toEqual(['busy', 'medium']);
    expect(component.vmOverflow).toBe(4);
    expect(component.vmsCollapsed).toBe(false);
    expect(component.jails.map((guest) => guest.name)).toEqual([
      'busy-jail', 'rss-jail', 'fourth-jail', 'quiet-jail',
    ]);
    expect(component.visibleJails).toEqual([]);
    expect(component.jailOverflow).toBe(4);
    expect(component.jailsCollapsed).toBe(true);
    expect(component.bodyUsedPx).toBe(165);
    expect(component.statsUnavailable).toBe(false);
  });

  it('gives the larger family the rows while keeping memory visible on the priming tick', () => {
    component.setGuestStats({
      cpu_count: 4,
      vms: [vm('builder', 'RUNNING', null, 2), vm('off', 'STOPPED', null, null)],
      jails: Array.from({ length: 7 }, (_, index) => jail(`jail-${index}`, null, 1)),
      services_bytes: 12 * gib,
      attributed_bytes: 9 * gib,
    });

    expect(component.visibleJails.length).toBe(2);
    expect(component.jailOverflow).toBe(5);
    expect(component.vmsCollapsed).toBe(true);
    expect(component.visibleVms).toEqual([]);
    expect(component.cpuPct).toBeNull();
    expect(component.vmMemory(component.vms[0])).toBe('2.0/8.0 GiB');
    expect(component.vmMemory(component.vms[1])).toBe('—/8.0 GiB');
    expect(component.vmBytes).toBe(2 * gib);
    expect(component.jailBytes).toBe(7 * gib);
    expect(component.baseBytes).toBe(3 * gib);
  });

  it('counts an application as its own family, under the name the user gave it', () => {
    // the internal development record: an Applications container runs in a jail, so it
    // used to arrive as one named by its 64-hex container id.
    component.setGuestStats({
      cpu_count: 4,
      vms: [],
      jails: [],
      apps: [jail('openspeedtest', 3.2, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 1 * gib,
    });

    expect(component.apps.map((app) => app.name)).toEqual(['openspeedtest']);
    expect(component.visibleApps.length).toBe(1);
    expect(component.appOverflow).toBe(0);
    expect(component.jails).toEqual([]);
    expect(component.appBytes).toBe(1 * gib);
    // An application still executes, so the card must not read as idle.
    expect(component.cpuPct).not.toBeNull();

    component.goToApps();
    expect(router.navigate.calls.mostRecent().args).toEqual([['/applications']]);
  });

  it('renders VMs and jails unchanged when middleware sends no apps key', () => {
    component.setGuestStats({
      cpu_count: 4,
      vms: [vm('builder', 'RUNNING', 20.4, 2)],
      jails: [jail('forgejo', 4.6, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 3 * gib,
    });

    expect(component.apps).toEqual([]);
    expect(component.visibleJails.map((guest) => guest.name)).toEqual(['forgejo']);
    expect(component.appBytes).toBe(0);
  });

  it('sums sampled CPU as a share of the host and routes each guest kind', () => {
    component.setGuestStats({
      cpu_count: 4,
      vms: [vm('builder', 'RUNNING', 20.4, 2)],
      jails: [jail('forgejo', 4.6, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 3 * gib,
    });

    expect(component.cpuPct).toBe(25);
    expect(component.cpuLabel(component.cpuPct)).toBe('25%');
    expect(component.trackByName(99, component.jails[0])).toBe('forgejo');

    component.goToVms();
    component.goToJails();

    expect(router.navigate.calls.allArgs()).toEqual([[['/vm']], [['/jails']]]);
  });

  it('counts a Bastille jail as its own family and routes it to Bastille Jails', () => {
    // the internal development record: a Bastille jail used to arrive as a plain jail whose
    // row led to the iocage list.
    component.setGuestStats({
      cpu_count: 4,
      vms: [],
      jails: [jail('forgejo', 4.6, 1)],
      apps: [],
      bastille: [jail('smokenginx', 2.1, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 2 * gib,
    });

    expect(component.bastille.map((guest) => guest.name)).toEqual(['smokenginx']);
    expect(component.visibleBastille.length).toBe(1);
    expect(component.bastilleOverflow).toBe(0);
    expect(component.jails.map((guest) => guest.name)).toEqual(['forgejo']);
    expect(component.bastilleBytes).toBe(1 * gib);
    expect(component.cpuPct).not.toBeNull();

    component.goToBastille();
    expect(router.navigate.calls.mostRecent().args).toEqual([['/jails', 'bastille']]);
  });

  it('keeps every family on the card when four of them share the frame', () => {
    const many = (prefix: string) => [1, 2, 3, 4, 5].map((n) => jail(`${prefix}${n}`, n, 1));
    component.setGuestStats({
      cpu_count: 4,
      vms: [vm('builder', 'RUNNING', 10, 1)],
      jails: many('jail'),
      apps: many('app'),
      bastille: many('bastille'),
      services_bytes: 32 * gib,
      attributed_bytes: 16 * gib,
    });

    // Four aggregated rows already take 136px of the 192; no five-entry family
    // can add a labelled section (63px minimum) but the single VM fits as one
    // (29px), so nothing vanishes and nothing scrolls.
    expect(component.visibleVms.length).toBe(1);
    expect(component.vmOverflow).toBe(0);
    expect(component.vmsCollapsed).toBe(false);
    for (const family of ['jails', 'bastille', 'apps'] as const) {
      expect((component as any)[`${family}Collapsed`]).toBe(true);
    }
    expect(component.visibleJails).toEqual([]);
    expect(component.visibleBastille).toEqual([]);
    expect(component.visibleApps).toEqual([]);
    expect(component.jailOverflow).toBe(5);
    expect(component.bastilleOverflow).toBe(5);
    expect(component.appOverflow).toBe(5);
    expect(component.bodyUsedPx).toBe(165);
    expect(component.bodyUsedPx).toBeLessThanOrEqual(component.familyBudgetPx);
  });

  it('budgets labels and overflow links with the rows so the card stays inside its frame', () => {
    // the internal development record: the reporting box -- two Bastille jails and nineteen
    // applications made the card 434px with the "+ N more" link under a scrollbar.
    component.setGuestStats({
      cpu_count: 8,
      vms: [],
      jails: [],
      apps: Array.from({ length: 19 }, (_, index) => jail(`app-${index}`, 19 - index, 0.5)),
      bastille: [jail('web', 0, 0.1), jail('pb', 0, 0.05)],
      services_bytes: 16 * gib,
      attributed_bytes: 10 * gib,
    });

    expect(component.familyBudgetPx).toBe(192);
    expect(component.visibleApps.map((app) => app.name)).toEqual(['app-0', 'app-1']);
    expect(component.appOverflow).toBe(17);
    expect(component.appsCollapsed).toBe(false);
    expect(component.bastilleCollapsed).toBe(true);
    expect(component.visibleBastille).toEqual([]);
    expect(component.bastilleOverflow).toBe(2);
    // one aggregated row + label + two rows + the more link
    expect(component.bodyUsedPx).toBe(34 + 29 + 68 + 34);
  });

  it('expands a family fully when it fits and caps a section at four rows', () => {
    component.setGuestStats({
      cpu_count: 8,
      vms: [],
      jails: [jail('a', 1, 1), jail('b', 1, 1), jail('c', 1, 1), jail('d', 1, 1)],
      services_bytes: 8 * gib,
      attributed_bytes: 4 * gib,
    });
    expect(component.visibleJails.length).toBe(4);
    expect(component.jailOverflow).toBe(0);
    expect(component.bodyUsedPx).toBe(29 + 4 * 34);

    component.setGuestStats({
      cpu_count: 8,
      vms: [],
      jails: Array.from({ length: 5 }, (_, index) => jail(`j${index}`, 1, 1)),
      services_bytes: 8 * gib,
      attributed_bytes: 4 * gib,
    });
    // Five entries: four rows would need a fifth for the link (199px); three rows and the link fit.
    expect(component.visibleJails.length).toBe(3);
    expect(component.jailOverflow).toBe(2);
    expect(component.bodyUsedPx).toBe(29 + 3 * 34 + 34);
  });

  it('sums a family\'s sampled CPU for its aggregated row, capped at the host', () => {
    expect(component.familyCpu([jail('a', 60, 1), jail('b', 55, 1), jail('c', null, 1)])).toBe(100);
    expect(component.familyCpu([jail('a', 12.5, 1), jail('b', 2.5, 1)])).toBe(15);
    expect(component.familyCpu([jail('a', null, 1)])).toBeNull();
    expect(component.cpuLabel(component.familyCpu([jail('a', null, 1)]))).toBe('…');
  });

  it('renders jails and apps exactly as before when middleware sends no bastille key', () => {
    component.setGuestStats({
      cpu_count: 4,
      vms: [],
      jails: [jail('forgejo', 4.6, 1), jail('git', 1.2, 1)],
      apps: [jail('openspeedtest', 3.2, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 3 * gib,
    });

    expect(component.bastille).toEqual([]);
    expect(component.visibleBastille).toEqual([]);
    expect(component.bastilleBytes).toBe(0);
    expect(component.visibleJails.map((guest) => guest.name)).toEqual(['forgejo', 'git']);
    expect(component.visibleApps.map((guest) => guest.name)).toEqual(['openspeedtest']);
  });

  function vm(name: string, state: string, cpu: number, rssGiB: number) {
    return {
      id: 1,
      name,
      state,
      provisioned: 8 * gib,
      vcpus: 4,
      cpu_pct: cpu,
      rss: rssGiB === null ? undefined : rssGiB * gib,
    };
  }

  function jail(name: string, cpu: number, rssGiB: number) {
    return {
      jid: 1,
      name,
      cpu_pct: cpu,
      rss: rssGiB * gib,
      nproc: 2,
    };
  }
});
