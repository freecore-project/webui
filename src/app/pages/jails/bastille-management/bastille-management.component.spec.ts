import { fakeAsync, tick } from '@angular/core/testing';
import { TranslateDefaultParser } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BastilleJail, BastilleManagementComponent } from './bastille-management.component';

const ready = { installed: true, configured: true, configuration_valid: true, enabled: true, pool: 'tank' };
const jail: BastilleJail = {
  name: 'web', state: 'down', release: '15.0-RELEASE', ip4_addr: 'vtnet0|192.0.2.50/24', boot: true,
  jid: null, disk_used: 79691776, address_source: 'config', operable: true,
};
const running: BastilleJail = { ...jail, name: 'db', state: 'up', jid: 7, ip4_addr: 'vnet0|192.0.2.51/24', address_source: 'live' };

function setup() {
  const dialogClosed = new Subject<boolean>();
  const formClosed = new Subject<boolean>();
  const job = new Subject<any>();
  const view = { job: {} as any, setDescription: jasmine.createSpy('setDescription'), showCloseButton: false };
  const ref = { componentInstance: view, close: jasmine.createSpy('close'), afterClosed: () => dialogClosed };
  const dispatch = jasmine.createSpy('dispatch').and.returnValue(of(42));
  const ws = {
    onCloseSubject: new Subject<boolean>(),
    subscribe: jasmine.createSpy('subscribe').and.returnValue(job.pipe(map((fields) => ({ id: 42, fields })))),
    unsubscribe: jasmine.createSpy('unsubscribe'),
    sub: jasmine.createSpy('sub'),
    call: jasmine.createSpy('call').and.callFake((method, args) => {
      const response = {
        'bastille.config': ready, 'bastille.query': [jail, running],
        'pool.query': [{ name: 'tank', status: 'ONLINE', healthy: true, is_decrypted: true }],
        'bastille.logs': { content: '<script>untrusted log</script>', truncated: true },
        'core.get_jobs': [{ id: 42, state: 'RUNNING' }],
        // the internal development record: Settings previews the pool Bastille already uses too.
        'bastille.adoption_preview': { state: 'MANAGED', rewrite: [] },
      }[method];
      return response === undefined ? dispatch(method, args) : of(response);
    }),
    dispatch,
  };
  const dialog = {
    dialogForm: jasmine.createSpy('dialogForm').and.returnValue(formClosed),
    confirm: jasmine.createSpy('confirm').and.returnValue(of(true)),
  };
  const matDialog = { open: jasmine.createSpy('open').and.returnValue(ref) };
  const router = { navigate: jasmine.createSpy('navigate') };
  const translate = { parser: new TranslateDefaultParser(), instant: jasmine.createSpy('instant').and.callFake((key) => key) };
  const component = new BastilleManagementComponent(ws as any, dialog as any, matDialog as any, router as any, translate as any);
  component.serviceConfig = ready;
  component.jails = [jail, running];
  const entity: any = {
    getData: jasmine.createSpy('getData'),
    callGetFunction: () => entity.getFunction.subscribe((rows) => { entity.rows = rows; }),
  };
  component.entityList = entity;
  return {
    component, ws, dialog, matDialog, router, job, view, ref, entity, formClosed, dialogClosed, translate,
  };
}

describe('Bastille jails (observation and per-jail lifecycle)', () => {
  it('offers Console Log plus the iocage lifecycle actions and a toolbar without Add', () => {
    const { component, entity, router } = setup();
    expect(component.queryCall).toBe('bastille.query');
    expect((component as any).route_add).toBeUndefined();
    expect((component as any).getAddActions).toBeUndefined();
    expect((component as any).doAdd).toBeUndefined();
    const actions = component.getActions(jail);
    expect(actions.map((action) => action.id)).toEqual(['logs', 'start', 'restart', 'stop']);
    expect(actions.map((action) => action.icon)).toEqual(['description', 'play_arrow', 'cached', 'stop']);
    expect(actions.map((action) => action.label)).toEqual(['Console Log', 'Start', 'Restart', 'Stop']);
    expect(component.custActions.map((action) => action.id)).toEqual(['refresh', 'releases']);

    component.custActions[0].function();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    component.custActions[1].function();
    expect(router.navigate).toHaveBeenCalledWith(['/jails', 'bastille', 'releases']);
    expect(component.isCustActionVisible('releases')).toBeTrue();
    component.serviceConfig = undefined;
    expect(component.isCustActionVisible('releases')).toBeFalse();
    expect(component.isCustActionVisible('refresh')).toBeTrue();
  });

  it('leaves the page the way it was entered: the cog offers Bastille Settings and iocage Jails', () => {
    const { component, dialog, router } = setup();
    expect(component.globalConfig.actions.map((action) => action.id)).toEqual(['settings', 'iocage']);
    expect((component.globalConfig as any).onClick).toBeUndefined();

    component.globalConfig.actions[1].onClick();
    expect(router.navigate).toHaveBeenCalledWith(['/jails']);

    router.navigate.calls.reset();
    component.globalConfig.actions[0].onClick();
    expect(dialog.dialogForm).toHaveBeenCalledTimes(1);
    expect(dialog.dialogForm.calls.mostRecent().args[0].title).toBe('Bastille Settings');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('queries jails after checking the configuration and opens no statistics stream (the internal development record)', () => {
    const { component, entity, ws } = setup();
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([jail, running]);
    expect(ws.call.calls.allArgs()).toEqual([['bastille.config'], ['bastille.query', [[], {}]]]);
    expect(ws.sub).not.toHaveBeenCalled();
  });

  it('shows setup status without querying jails for an unconfigured pool', () => {
    const { component, entity, ws } = setup();
    ws.call.and.returnValue(of({ ...ready, configured: false }));
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([]);
    expect(component.status).toContain('Select a data pool');
    expect(ws.call).toHaveBeenCalledTimes(1);
  });

  it('points an empty configured pool at the console instead of an Add button', () => {
    const { component, entity, ws } = setup();
    ws.call.and.callFake((method) => of(method === 'bastille.config' ? ready : []));
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.status).toContain('bastille command');
  });

  it('clears stale rows on a query failure and stops observing', () => {
    const { component, entity, ws } = setup();
    ws.call.and.callFake((method) => method === 'bastille.config' ? of(ready) : throwError(() => ({ reason: 'Pool locked' })));
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([]);
    expect(component.error).toBe('Pool locked');
    expect(component.canObserve(jail)).toBeFalse();
    expect(component.status).toBe('');
  });

  // the internal development record: the same shape as the iocage list -- JID, Name, State (the raw value), Release
  // visible; Boot (on/off), IPv4, IPv6 as row details; sorted by name; no live figures.
  it('renders the iocage list\'s columns from the query, sorted by name, with the raw state and on/off boot', () => {
    const { component } = setup();
    expect(component.columns.map((column) => [column.prop, !!column.hidden])).toEqual([
      ['jid', false], ['name', false], ['boot_label', true], ['state_label', false], ['release', false], ['ip4_addr', true], ['ip6_addr', true],
    ]);
    expect(component.sortKey).toBe('name'); // the engine would otherwise sort by the first column, JID
    expect(component.columns.find((column) => column.prop === 'name').always_display).toBeTrue();
    expect(component.columns.find((column) => column.prop === 'state_label').always_display).toBeUndefined();
    expect((component as any).wrapRowActions).toBeUndefined();
    const rows = component.resourceTransformIncomingRestData([
      running, jail, { ...jail, name: 'odd', state: 'UNKNOWN', boot: null, running_error: 'State unavailable', disk_used: null },
    ]);
    expect(rows.map((row) => row.name)).toEqual(['db', 'odd', 'web']);
    expect(rows.map((row) => row.state_label)).toEqual(['up', 'UNKNOWN — State unavailable', 'down']);
    expect(rows.map((row) => row.boot_label)).toEqual(['on', 'Unknown', 'on']);
    expect(rows.map((row) => row.jid)).toEqual([7, null, null]);
    expect(Object.keys(rows[0])).not.toContain('cpu_label');
    // The twin's address vocabulary: the interface prefix stripped, a DHCP lease or method as the middleware says it, SLAAC read as Auto.
    expect(rows[0].ip4_addr).toBe('192.0.2.51/24');
    expect(component.resourceTransformIncomingRestData([{ ...jail, ip4_addr: 'DHCP' }])[0].ip4_addr).toBe('DHCP');
    expect(component.resourceTransformIncomingRestData([{ ...jail, ip6_addr: 'vnet0|SLAAC' }])[0].ip6_addr).toBe('Auto');
    expect(component.globalConfig.tooltip).toBe('Settings');
  });

  it('keeps the raw state word and appends the unchanged diagnostic detail; only an unknown boot is translated', () => {
    const { component, translate } = setup();
    translate.instant.and.callFake((key) => ({ Unknown: 'Okänd' })[key] || key);
    const rows = component.resourceTransformIncomingRestData([
      jail, running, { ...jail, name: 'x', state: 'UNKNOWN', boot: null, running_error: 'State query failed' },
    ]);
    expect(rows.map((row) => row.state_label)).toEqual(['up', 'down', 'UNKNOWN — State query failed']);
    expect(rows.map((row) => row.boot_label)).toEqual(['on', 'on', 'Okänd']);
    expect(translate.instant.calls.allArgs().map(([key]) => key)).not.toContain('State query failed');
  });

  it('hides an older middleware’s ownership remark but keeps the reason a jail cannot be observed', () => {
    const { component } = setup();
    const cliJail = { ...jail, validation_error: 'Administered with the bastille CLI.', operable: true };
    const broken = { ...jail, name: 'bad', operable: false, validation_error: 'Bastille jail root is unsafe.' };
    const rows = component.resourceTransformIncomingRestData([cliJail, broken]);
    expect(rows.map((row) => row.state_label)).toEqual(['down — Bastille jail root is unsafe.', 'down']);
    expect(component.isActionVisible('logs', cliJail)).toBeTrue();
    expect(component.isActionVisible('logs', broken)).toBeFalse();
    expect(component.isActionVisible('start', broken)).toBeFalse();
    expect(component.isActionVisible('delete', cliJail)).toBeFalse();
  });

  it('shows the lifecycle actions appropriate to raw state and hides them when observation is unavailable', () => {
    const { component } = setup();
    const visible = (row: BastilleJail) => component.getActions(row)
      .filter((action) => component.isActionVisible(String(action.id), row)).map((action) => action.id);
    expect(visible(jail)).toEqual(['logs', 'start']);
    expect(visible(running)).toEqual(['logs', 'restart', 'stop']);
    expect(visible({ ...jail, state: 'UNKNOWN' })).toEqual(['logs', 'start', 'restart', 'stop']);
    expect(visible({ ...running, operable: false })).toEqual([]);
    component.loading = true;
    expect(visible(running)).toEqual([]);
    component.loading = false;
    [undefined, { ...ready, installed: false }, { ...ready, configured: false }, { ...ready, configuration_valid: false }]
      .forEach((config) => {
        component.serviceConfig = config;
        expect(visible(running)).toEqual([]);
      });
  });

  it('starts with the name only and refreshes the raw state and available actions after success', () => {
    const { component, ws, job, entity, ref, matDialog, dialog } = setup();
    entity.getData.and.callFake(() => component.callGetFunction(entity));
    component.getActions(jail).find((action) => action.id === 'start').onClick(jail);
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(ws.dispatch).toHaveBeenCalledWith('bastille.start', ['web']);
    expect(ws.dispatch).toHaveBeenCalledTimes(1);
    expect(matDialog.open.calls.mostRecent().args[1]).toEqual({ data: { title: 'Starting web' }, disableClose: true });
    expect(component.busy).toBeTrue();
    ws.call.and.callFake((method) => of(method === 'bastille.config' ? ready : [{ ...jail, state: 'up', jid: 8 }]));
    job.next({ state: 'SUCCESS', result: true });
    expect(component.busy).toBeFalse();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    expect(ref.close).toHaveBeenCalledWith(true);
    const refreshed = component.resourceTransformIncomingRestData(entity.rows)[0];
    expect(refreshed.state_label).toBe('up');
    expect(refreshed.jid).toBe(8);
    expect(component.isActionVisible('start', refreshed)).toBeFalse();
    expect(component.isActionVisible('stop', refreshed)).toBeTrue();
    expect(component.isActionVisible('restart', refreshed)).toBeTrue();
  });

  it('restarts without asking and keeps the middleware refusal while reconciling rows', () => {
    const { component, ws, job, view, dialog, entity, ref, matDialog } = setup();
    component.getActions(running).find((action) => action.id === 'restart').onClick(running);
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(ws.dispatch).toHaveBeenCalledWith('bastille.restart', ['db']);
    expect(matDialog.open.calls.mostRecent().args[1].data.title).toBe('Restarting db');
    job.next({ state: 'FAILED', error: "Bastille restart did not leave jail 'db' running." });
    expect(view.job.state).toBe('FAILED');
    expect(view.showCloseButton).toBeTrue();
    expect(component.error).toBe("Bastille restart did not leave jail 'db' running.");
    expect(component.busy).toBeFalse();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('asks before stopping and dispatches the job only after confirmation', () => {
    const { component, ws, dialog, matDialog } = setup();
    dialog.confirm.and.returnValue(of(false));
    component.getActions(running).find((action) => action.id === 'stop').onClick(running);
    expect(dialog.confirm).toHaveBeenCalledWith('Stop Jail', 'Stop db?', true, 'Stop');
    expect(ws.dispatch).not.toHaveBeenCalled();
    expect(matDialog.open).not.toHaveBeenCalled();
    dialog.confirm.and.returnValue(of(true));
    component.getActions(running).find((action) => action.id === 'stop').onClick(running);
    expect(ws.dispatch).toHaveBeenCalledWith('bastille.stop', ['db']);
    expect(ws.dispatch).toHaveBeenCalledTimes(1);
    expect(matDialog.open.calls.mostRecent().args[1].data.title).toBe('Stopping db');
  });

  it('never dispatches a lifecycle request for an unobservable jail, even when called directly', () => {
    const { component, ws, dialog } = setup();
    const broken = { ...running, operable: false };
    component.runLifecycle(broken, 'start');
    component.confirmStop(broken);
    component.serviceConfig = undefined;
    component.runLifecycle(running, 'restart');
    component.confirmStop(running);
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(ws.dispatch).not.toHaveBeenCalled();
  });

  it('rechecks readiness when a pending Stop confirmation resolves and cancels it on destruction', () => {
    const { component, ws, dialog } = setup();
    const confirmed = new Subject<boolean>();
    dialog.confirm.and.returnValue(confirmed);
    component.confirmStop(running);
    component.serviceConfig = { ...ready, configuration_valid: false };
    confirmed.next(true);
    expect(ws.dispatch).not.toHaveBeenCalled();
    component.serviceConfig = ready;
    component.ngOnDestroy();
    confirmed.next(true);
    expect(ws.dispatch).not.toHaveBeenCalled();
  });

  it('rejects repeated lifecycle dispatch while a job or page refresh is in progress', () => {
    const { component, ws, matDialog } = setup();
    component.loading = true;
    component.runLifecycle(jail, 'start');
    expect(ws.dispatch).not.toHaveBeenCalled();
    component.loading = false;
    component.runLifecycle(jail, 'start');
    component.runLifecycle(running, 'restart');
    expect(ws.dispatch).toHaveBeenCalledOnceWith('bastille.start', ['web']);
    expect(matDialog.open).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
  });

  it('reads a bounded console log and preserves its text for interpolation', () => {
    const { component, matDialog, ws } = setup();
    component.showLogs(running);
    expect(matDialog.open).toHaveBeenCalledTimes(1);
    expect(ws.call).toHaveBeenCalledWith('bastille.logs', ['db', 65536]);
    expect(component.logContent).toBe('<script>untrusted log</script>');
    expect(component.logTruncated).toBeTrue();
    expect(component.logError).toBe('');
  });

  it('keeps a log read failure separate from an empty log', () => {
    const { component, ws } = setup();
    ws.call.and.callFake((method) => method === 'bastille.logs' ? throwError(() => ({ reason: 'Log unreadable' })) : of(ready));
    component.showLogs(jail);
    expect(component.logContent).toBe('');
    expect(component.logError).toBe('Log unreadable');
  });

  it('refuses the console log when Bastille is not ready or the jail cannot be observed', () => {
    const { component, matDialog } = setup();
    component.showLogs({ ...jail, operable: false });
    component.serviceConfig = undefined;
    component.showLogs(jail);
    expect(matDialog.open).not.toHaveBeenCalled();
  });

  it('cancels a pending console read and its timeout when the dialog closes', fakeAsync(() => {
    const { component, ws, dialogClosed } = setup();
    const pending = new Subject<any>();
    ws.call.and.callFake((method) => method === 'bastille.logs' ? pending : of(ready));
    component.showLogs(jail);
    expect(component.logsLoading).toBeTrue();
    dialogClosed.next(true);
    expect(component.logsLoading).toBeFalse();
    tick(15000);
    pending.next({ content: 'late', truncated: false });
    expect(component.logContent).toBe('');
    expect(component.logError).toBe('');
  }));

  it('ends a stalled console read with a retry message', fakeAsync(() => {
    const { component, ws } = setup();
    ws.call.and.callFake((method) => method === 'bastille.logs' ? new Subject<any>() : of(ready));
    component.showLogs(jail);
    tick(15000);
    expect(component.logsLoading).toBeFalse();
    expect(component.logError).toContain('timed out');
  }));

  it('configures the service from the cog and refreshes after the job succeeds', () => {
    const { component, dialog, ws, job, entity, ref, formClosed } = setup();
    component.globalConfig.actions[0].onClick();
    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    conf.customSubmit({
      formValue: { pool: 'tank', startup_delay: 2, parallel_limit: 4 },
      dialogRef: { close: () => formClosed.next(true) },
    });
    expect(ws.dispatch).toHaveBeenCalledWith('bastille.configure', [{ pool: 'tank', startup_delay: 2, parallel_limit: 4 }]);
    expect(component.busy).toBeTrue();
    job.next({ state: 'SUCCESS', result: true });
    expect(component.busy).toBeFalse();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('shows job failures in the standard job dialog and reconciles rows while preserving the reason', () => {
    const { component, dialog, ws, job, view, entity, formClosed } = setup();
    component.globalConfig.actions[0].onClick();
    dialog.dialogForm.calls.mostRecent().args[0].customSubmit({
      formValue: { pool: 'tank', startup_delay: 0, parallel_limit: 1 },
      dialogRef: { close: () => formClosed.next(true) },
    });
    job.next({ state: 'FAILED', error: 'Pool is locked' });
    expect(view.job.state).toBe('FAILED');
    expect(view.showCloseButton).toBeTrue();
    expect(component.error).toBe('Pool is locked');
    expect(component.busy).toBeFalse();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    expect(ws.dispatch).toHaveBeenCalledTimes(1);
  });

  it('stops job tracking on destruction without claiming the server job failed', () => {
    const { component, entity, view, ref } = setup();
    component.callGetFunction(entity);
    component.busy = true;
    component.ngOnDestroy();
    expect(component.busy).toBeFalse();
    expect(view.job).toEqual({});
    expect(ref.close).not.toHaveBeenCalled();
  });
});
