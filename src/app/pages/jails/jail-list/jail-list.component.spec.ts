import { JailListComponent } from './jail-list.component';
import { routes } from '../jails.routing';
import { of, Subject } from 'rxjs';

function createComponent(ws: any = {}, dialogService: any = {}, dialog: any = {}) {
  const sorter = {
    tableSorter: jasmine.createSpy('tableSorter').and.callFake((rows) => rows),
  };
  return new JailListComponent(
    {} as any,
    {} as any,
    ws,
    {} as any,
    dialogService,
    {} as any,
    sorter as any,
    dialog,
  );
}

describe('Jails routes', () => {
  it('uses a full empty-path match for the add wizard redirect', () => {
    const addRoute = routes[0].children.find((route) => route.path === 'add');
    const wizardRedirect = addRoute.children.find((route) => route.path === '');

    expect(wizardRedirect.redirectTo).toBe('wizard');
    expect(wizardRedirect.pathMatch).toBe('full');
  });

  // the internal development record: 15.0 ships no Bastille, so no Bastille page is routed.
  it('routes no Bastille pages', () => {
    const paths = routes[0].children.map((route) => route.path);

    expect(paths.some((path) => String(path).startsWith('bastille'))).toBeFalse();
  });
});

describe('Jails settings button', () => {
  // the internal development record: with no Bastille page to reach, the cog is the single pool-activation
  // button 15.0 and 13.3 had, not the the internal development record menu.
  it('activates a pool in one click, named for plugins and jails', () => {
    const component = createComponent();

    expect((component.globalConfig as any).actions).toBeUndefined();
    expect(component.globalConfig.tooltip).toBe('Choose Pool for Plugin and Jail Manager');
    expect(typeof component.globalConfig.onClick).toBe('function');
  });

  // the internal development record: the twin's Refresh -- jails are made on the console, nothing pushes a change
  it('offers a Refresh that re-reads the list', () => {
    const component = createComponent();
    const getData = jasmine.createSpy('getData');
    component.entityList = { getData };
    expect(component.custActions.map((action) => action.id)).toEqual(['refresh']);
    component.custActions[0].function();
    expect(getData).toHaveBeenCalledTimes(1);
  });
});

describe('Jails pool selection', () => {
  // the internal development record: this list is iocage again, so viewing it wants an iocage pool.
  // It used to ask bastille.config first, because a Bastille-only box had no reason to
  // activate one to see its jails here.
  it('offers pool activation when no iocage pool is active, without consulting Bastille', async () => {
    const ws = {
      call: jasmine.createSpy('call').and.callFake((method) => of({
        'pool.query': [{ name: 'tank' }],
        'jail.get_activated_pool': null,
      }[method])),
    };
    const component = createComponent(ws);
    spyOn(component, 'activatePool');

    expect(await component.prerequisite()).toBeTrue();
    expect(component.activatePool).toHaveBeenCalledTimes(1);
    expect(ws.call.calls.allArgs().map(([method]) => method)).toEqual([
      'pool.query', 'jail.get_activated_pool',
    ]);
  });

  it('leaves an activated pool alone', async () => {
    const ws = {
      call: jasmine.createSpy('call').and.callFake((method) => of({
        'pool.query': [{ name: 'tank' }],
        'jail.get_activated_pool': 'tank',
      }[method])),
    };
    const component = createComponent(ws);
    spyOn(component, 'activatePool');

    expect(await component.prerequisite()).toBeTrue();
    expect(component.activatePool).not.toHaveBeenCalled();
    expect((component as any).addBtnDisabled).toBeFalse();
  });
});

describe('JailListComponent legacy plugin retirement boundary', () => {
  it('keeps existing plugin jails in the ordinary jail list', () => {
    const component = createComponent();
    const entityList: any = {
      rows: [
        {
          host_hostuuid: 'legacy-plex',
          type: 'pluginv2',
          boot: 0,
          basejail: 0,
          state: 'down',
          dhcp: 'off',
          ip4_addr: 'none',
          ip6_addr: 'none',
        },
        {
          host_hostuuid: 'ordinary-jail',
          type: 'jail',
          boot: 1,
          basejail: 1,
          state: 'down',
          dhcp: 'off',
          ip4_addr: 'none',
          ip6_addr: 'none',
        },
      ],
    };

    component.dataHandler(entityList);

    expect(entityList.rows.map((row) => row.host_hostuuid)).toEqual(['legacy-plex', 'ordinary-jail']);
  });
});

describe('JailListComponent is iocage only', () => {
  const iocageJail = {
    id: 'legacy',
    host_hostuuid: 'legacy',
    state: 'down',
    boot: 0,
    basejail: 0,
    ip4_addr: 'none',
    ip6_addr: 'none',
  };

  it('never asks the Bastille API for anything', () => {
    const ws = { call: jasmine.createSpy('call').and.returnValue(of([])) };
    const component = createComponent(ws);
    const entityList: any = { rows: [] };

    component.dataHandler(entityList);
    component.getActions(iocageJail);
    component.updateMultiAction([iocageJail]);

    expect(ws.call.calls.allArgs().map(([method]) => method as string)
      .filter((method) => method.startsWith('bastille.'))).toEqual([]);
    expect((component as any).callGetFunction).toBeUndefined();
    expect((component as any).getAddActions).toBeUndefined();
  });

  it('identifies rows by jail name and offers no Engine column', () => {
    const component = createComponent();

    expect(component.rowIdentifier).toBe('host_hostuuid');
    expect(component.columns.map((column) => column.prop)).not.toContain('engine');
  });

  it('routes lifecycle and deletion through the iocage APIs', () => {
    const job = () => ({
      componentInstance: {
        setCall: jasmine.createSpy('setCall'),
        submit: jasmine.createSpy('submit'),
        success: new Subject<void>(),
      },
      close: jasmine.createSpy('close'),
    });
    const startJob = job();
    const stopJob = job();
    const restartJob = job();
    const dialog = {
      open: jasmine.createSpy('open').and.returnValues(startJob, stopJob, restartJob),
    };
    const dialogService = {
      confirm: jasmine.createSpy('confirm').and.returnValue(of(true)),
    };
    const component = createComponent({}, dialogService, dialog);
    component.entityList = {
      doDelete: jasmine.createSpy('doDelete'),
      getData: jasmine.createSpy('getData'),
    };
    spyOn(component, 'updateRow');
    spyOn(component, 'updateMultiAction');
    const actions = component.getActions(iocageJail);

    actions.find((action) => action.id === 'start').onClick(iocageJail);
    actions.find((action) => action.id === 'stop').onClick(iocageJail);
    actions.find((action) => action.id === 'restart').onClick(iocageJail);
    actions.find((action) => action.id === 'delete').onClick(iocageJail);

    expect(startJob.componentInstance.setCall).toHaveBeenCalledOnceWith('jail.start', ['legacy']);
    expect(stopJob.componentInstance.setCall).toHaveBeenCalledOnceWith('jail.stop', ['legacy']);
    expect(restartJob.componentInstance.setCall).toHaveBeenCalledOnceWith('jail.restart', ['legacy']);
    expect(component.entityList.doDelete).toHaveBeenCalledOnceWith(iocageJail);
    expect(component.wsDeleteParams({ state: 'up' }, 'legacy')).toEqual([
      'legacy', { force: true },
    ]);

    startJob.componentInstance.success.next();
    stopJob.componentInstance.success.next();
    restartJob.componentInstance.success.next();
    expect(component.updateRow).toHaveBeenCalledTimes(3);
    expect(component.updateMultiAction).toHaveBeenCalledTimes(3);
    expect(component.entityList.getData).not.toHaveBeenCalled();
  });

  it('navigates to the iocage Edit, Shell and Mount points pages', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const component = createComponent();
    (component as any).router = router;
    const actions = component.getActions(iocageJail);

    actions.find((action) => action.id === 'edit').onClick(iocageJail);
    actions.find((action) => action.id === 'shell').onClick(iocageJail);
    actions.find((action) => action.id === 'mount').onClick(iocageJail);

    expect(router.navigate.calls.allArgs()).toEqual([
      [['', 'jails', 'edit', 'legacy']],
      [['', 'jails', 'shell', 'legacy']],
      [['', 'jails', 'storage', 'legacy']],
    ]);
  });

  it('preserves iocage display semantics and batch selection', () => {
    const component = createComponent();
    const entityList: any = {
      rows: [{ ...iocageJail, ip4_addr: 'vnet0|192.0.2.20/24' }],
    };

    component.dataHandler(entityList);
    component.updateMultiAction([iocageJail]);

    expect(entityList.rows[0]).toEqual(jasmine.objectContaining({
      boot_readble: 'off',
      basejail_readble: 'no',
      ip4_addr: '192.0.2.20/24',
    }));
    expect(component.getSelectedNames([iocageJail])).toEqual([['legacy']]);
    expect(component.wsMultiDeleteParams([iocageJail])).toEqual([
      'jail.delete', [['legacy']],
    ]);
  });
});
