import { of, Subject } from 'rxjs';

import { Services } from './services.component';

// the internal development record: 15.0 has no Bastille service row; the Bastille cases left with it.
describe('Services configure routing', () => {
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
});
