import { of, Subject } from 'rxjs';

import { Services } from './services.component';

describe('Services Bastille integration', () => {
  let component: Services;
  let dialog: any;
  let router: any;
  let ws: any;
  let formClosed: Subject<boolean>;
  let completedJob: any;

  beforeEach(() => {
    formClosed = new Subject();
    completedJob = { id: 42, state: 'SUCCESS', result: true };
    const calls = {
      'bastille.config': {
        pool: null,
        startup_delay: 2,
        parallel_limit: 4,
        installed: true,
        configured: false,
      },
      'pool.query': [{
        id: 1,
        name: 'tank',
        status: 'ONLINE',
        healthy: true,
        is_decrypted: true,
      }],
    };
    ws = {
      call: jasmine.createSpy('call').and.callFake((method, args) => {
        if (method === 'bastille.configure') { return ws.dispatch(method, args); }
        if (method === 'core.get_jobs') { return of([completedJob]); }
        return of(calls[method]);
      }),
      dispatch: jasmine.createSpy('dispatch').and.returnValue(of(42)),
      subscribe: () => new Subject(), unsubscribe: () => {}, onCloseSubject: new Subject(),
    };
    router = { navigate: jasmine.createSpy('navigate') };
    dialog = {
      confirm: jasmine.createSpy('confirm').and.returnValue(of(false)),
      dialogForm: jasmine.createSpy('dialogForm').and.returnValue(formClosed),
      errorReport: jasmine.createSpy('errorReport').and.returnValue(of(true)),
    };
    component = new Services(
      {} as any,
      ws as any,
      router as any,
      dialog as any,
      {} as any,
    );
  });

  it('uses the native actionable no-pool guard for first-time Bastille setup', () => {
    ws.call.and.callFake((method, args) => method === 'bastille.configure' ? ws.dispatch(method, args)
      : method === 'core.get_jobs' ? of([completedJob]) : of({
        'bastille.config': {
          pool: null,
          startup_delay: 2,
          parallel_limit: 4,
          installed: true,
          configured: false,
        },
        'pool.query': [],
      }[method]));

    component.editService('bastille');

    expect(dialog.dialogForm).not.toHaveBeenCalled();
    expect(dialog.errorReport).not.toHaveBeenCalled();
    expect(dialog.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'No Pools',
      buttonMsg: 'Create Pool',
    }));
  });

  it('labels Bastille and opens its settings from the Services row', () => {
    component.editService('bastille');

    expect(component.name_MAP['bastille']).toBe('Bastille');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(dialog.dialogForm).toHaveBeenCalled();

    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.title).toBe('Bastille Settings');
    expect(conf.confirmCheckbox).toBeUndefined(); // the internal development record: no first-configure confirm, like the iocage pool dialog
    expect(conf.saveButtonText).toBe('Configure');
    expect(conf.fieldConfig.map((field) => field.name)).toEqual([
      'pool', 'startup_delay', 'parallel_limit',
    ]);
    expect(conf.fieldConfig[0].options).toEqual([{
      label: 'tank', value: 'tank', disable: false,
    }]);
  });

  // the internal development record: the QEMU Guest Agent's whole feature is its lifecycle. It has no
  // configuration page, and Configure fell through to /services/<name>.
  it('names QEMU Guest Agent and offers it no route that does not exist', () => {
    expect(component.name_MAP['qemu_guest_agent']).toBe('QEMU Guest Agent');
    expect(component.isConfigurable('qemu_guest_agent')).toBeFalse();

    component.editService('qemu_guest_agent');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(dialog.dialogForm).not.toHaveBeenCalled();
  });

  it('keeps Configure for services that have somewhere to go', () => {
    // netdata is Launch, not Configure, and was the only previous exception.
    expect(component.isConfigurable('netdata')).toBeFalse();
    expect(component.isConfigurable('ssh')).toBeTrue();
    expect(component.isConfigurable('cifs')).toBeTrue();

    component.editService('ssh');
    expect(router.navigate).toHaveBeenCalledWith(['', 'services', 'ssh']);

    // netdata shows Launch instead of Configure, and Launch calls this same method,
    // so it must not be caught by the guard that protects lifecycle-only services.
    component.editService('netdata');
    expect(router.navigate).toHaveBeenCalledWith(['', 'services', 'netdata']);
  });

  it('submits Bastille configuration as a top-right tracked middleware job', () => {
    component.editService('bastille');
    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    const entityDialog = {
      formValue: { pool: 'tank', startup_delay: 2, parallel_limit: 4 },
      dialogRef: { close: jasmine.createSpy('close') },
    };

    conf.customSubmit(entityDialog);
    expect(ws.dispatch).not.toHaveBeenCalled();
    formClosed.next(true);

    expect(entityDialog.dialogRef.close).toHaveBeenCalledOnceWith(true);
    expect(ws.dispatch).toHaveBeenCalledOnceWith('bastille.configure', [{
      pool: 'tank',
      startup_delay: 2,
      parallel_limit: 4,
    }]);
    expect(dialog.errorReport).not.toHaveBeenCalled();
  });

  it('allows an existing Bastille configuration to select another healthy pool', () => {
    ws.call.and.callFake((method, args) => method === 'bastille.configure' ? ws.dispatch(method, args)
      : method === 'core.get_jobs' ? of([completedJob]) : of({
        'bastille.config': {
          pool: 'tank',
          startup_delay: 2,
          parallel_limit: 4,
          installed: true,
          configured: true,
        },
        'pool.query': [
          {
            name: 'tank', status: 'ONLINE', healthy: true, is_decrypted: true,
          },
          {
            name: 'backup', status: 'ONLINE', healthy: true, is_decrypted: true,
          },
        ],
      }[method]));

    component.editService('bastille');
    const conf = dialog.dialogForm.calls.mostRecent().args[0];

    expect(conf.confirmCheckbox).toBeUndefined(); // the internal development record
    expect(conf.fieldConfig[0]).toEqual(jasmine.objectContaining({
      type: 'select',
      name: 'pool',
      value: 'tank',
      options: [
        { label: 'tank', value: 'tank', disable: false },
        { label: 'backup', value: 'backup', disable: false },
      ],
    }));

    const entityDialog = {
      formValue: { pool: 'backup', startup_delay: 2, parallel_limit: 4 },
      dialogRef: { close: jasmine.createSpy('close') },
    };
    conf.customSubmit(entityDialog);
    expect(ws.dispatch).not.toHaveBeenCalled();
    formClosed.next(true);

    expect(ws.dispatch).toHaveBeenCalledOnceWith('bastille.configure', [{
      pool: 'backup',
      startup_delay: 2,
      parallel_limit: 4,
    }]);
  });

  it('reports a failed Bastille configuration job after closing the form', () => {
    completedJob = {
      state: 'FAILED',
      error: 'Dataset validation failed.',
      exception: 'middleware traceback',
    };
    component.editService('bastille');
    const conf = dialog.dialogForm.calls.mostRecent().args[0];

    conf.customSubmit({
      formValue: { pool: 'tank', startup_delay: 2, parallel_limit: 4 },
      dialogRef: { close: jasmine.createSpy('close') },
    });

    formClosed.next(true);
    expect(dialog.errorReport).toHaveBeenCalledWith(
      'Bastille configuration failed',
      'Dataset validation failed.',
      'middleware traceback',
    );
  });
});
