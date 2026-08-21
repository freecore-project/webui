import { of, throwError } from 'rxjs';

import { Services } from './services.component';

// the internal development record: a middleware error reaches the page as the websocket's `error` object --
// {error: errno, type, reason, trace: {class, frames, formatted}, extra} -- with no `message`
// and no `stack`. The Services page read only those two, so a refused start showed a dialog
// with its title and nothing under it.
//
// This line has no CUDA row (the 15.2 leg of this spec uses CUDA's preflight, the case seen on
// fc152); rar2fs refuses an unconfigured start the same way on every line.
describe('Services start, stop and Start Automatically errors', () => {
  let component: Services;
  let dialog: any;
  let ws: any;
  let rar2fs: any;

  // What middlewared sends for `CallError('Configure a rar2fs source directory before starting
  // rar2fs.')` raised by the rar2fs service's before_start.
  const unconfigured = {
    error: 14,
    type: null,
    reason: '[EFAULT] Configure a rar2fs source directory before starting rar2fs.',
    trace: {
      class: 'CallError',
      frames: [],
      formatted: 'Traceback (most recent call last):\n  File "rar2fs.py", line 20, in before_start\n'
        + 'middlewared.service_exception.CallError: [EFAULT] Configure a rar2fs source directory before starting rar2fs.\n',
    },
    extra: null,
  };

  beforeEach(() => {
    rar2fs = {
      id: 17, label: 'rar2fs', title: 'rar2fs', enable: false, state: 'STOPPED', onChanging: false,
    };
    ws = { call: jasmine.createSpy('call') };
    dialog = {
      confirm: jasmine.createSpy('confirm').and.returnValue(of(true)),
      report: jasmine.createSpy('report').and.returnValue(of(true)),
      errorReport: jasmine.createSpy('errorReport').and.returnValue(of(true)),
    };
    component = new Services({} as any, ws as any, {} as any, dialog as any, {} as any);
  });

  it('shows the middleware reason and traceback when a start is refused', () => {
    ws.call.and.returnValue(throwError(() => unconfigured));

    component.toggle(rar2fs);

    expect(ws.call).toHaveBeenCalledOnceWith('service.start', ['rar2fs']);
    expect(dialog.errorReport).toHaveBeenCalledOnceWith(
      'Error starting service rar2fs', unconfigured.reason, unconfigured.trace.formatted,
    );
    expect(rar2fs.onChanging).toBeFalse();
    expect(rar2fs.state).toBe('STOPPED');
  });

  it('shows the middleware reason and traceback when a stop is refused', () => {
    // Stop takes the same callback; any CallError from service.stop arrives in this shape.
    const busy = { ...unconfigured, reason: '[EBUSY] The rar2fs mountpoint is busy.' };
    rar2fs.state = 'RUNNING';
    ws.call.and.returnValue(throwError(() => busy));

    component.toggle(rar2fs);

    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call).toHaveBeenCalledOnceWith('service.stop', ['rar2fs']);
    expect(dialog.errorReport).toHaveBeenCalledOnceWith(
      'Error stopping service rar2fs', busy.reason, busy.trace.formatted,
    );
    expect(rar2fs.onChanging).toBeFalse();
    expect(rar2fs.state).toBe('RUNNING');
  });

  it('puts Start Automatically back and says why when the middleware refuses it', () => {
    // A ValidationErrors refusal of service.update (type VALIDATION, field errors in extra).
    const refused = {
      error: 22,
      type: 'VALIDATION',
      reason: '[EINVAL] service_update.enable: rar2fs cannot start at boot without a source directory.\n',
      trace: { ...unconfigured.trace, class: 'ValidationErrors' },
      extra: [['service_update.enable', 'rar2fs cannot start at boot without a source directory.', 22]],
    };
    ws.call.and.returnValue(throwError(() => refused));
    rar2fs.enable = true; // services-table's onAutostart writes the row before handing it over

    component.enableToggle({ checked: true }, rar2fs);

    expect(ws.call).toHaveBeenCalledOnceWith('service.update', [17, { enable: true }]);
    expect(rar2fs.enable).toBeFalse();
    expect(dialog.errorReport).toHaveBeenCalledOnceWith(
      'Error updating service rar2fs', refused.reason, refused.trace.formatted,
    );
  });

  it('still shows a client-side error by its message and stack', () => {
    const local = new Error('socket closed');
    ws.call.and.returnValue(throwError(() => local));

    component.toggle(rar2fs);

    expect(dialog.errorReport).toHaveBeenCalledOnceWith(
      'Error starting service rar2fs', 'socket closed', local.stack,
    );
  });

  it('leaves a successful Start Automatically change alone', () => {
    ws.call.and.returnValue(of(17));
    rar2fs.enable = true;

    component.enableToggle({ checked: true }, rar2fs);

    expect(rar2fs.enable).toBeTrue();
    expect(dialog.errorReport).not.toHaveBeenCalled();
  });
});
