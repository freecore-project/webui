import { of, Subject, throwError } from 'rxjs';

import { UpdateComponent } from './update.component';

describe('UpdateComponent rollback window', () => {
  let component: UpdateComponent;
  let router: any;
  let ws: any;
  let dialog: any;
  let dialogService: any;

  const window = {
    origin_be: '13.3-U1.2',
    arrival_path: 'manual_update',
    captured_at: { $date: 1786687200000 },
    closed_reason: null,
  };

  const space = {
    snapshot_count: 5,
    snapshot_bytes_lower_bound: 1000,
    origin_be_bytes_estimate: 24,
    origin_be_pinned: true,
    cleanup_pending: true,
  };

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate'), url: '/system/update' };
    ws = { call: jasmine.createSpy('call') };
    dialog = { open: jasmine.createSpy('open') };
    dialogService = { confirm: jasmine.createSpy('confirm') };
    component = new UpdateComponent(
      router,
      {} as any,
      ws,
      dialog,
      { updateRunning: of('false') } as any,
      {} as any,
      dialogService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('keeps an ordinary no-window install free of rollback state', () => {
    ws.call.and.returnValue(of(null));
    component.loadRollbackWindow();

    expect(component.rollbackWindow).toBeNull();
    expect(component.rollbackAvailability).toBeNull();
    expect(component.canRollback).toBeFalse();
    expect(ws.call.calls.allArgs()).toEqual([['system.rollback.config']]);
  });

  it('loads an eligible window and enables the action', () => {
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of(window);
      }
      if (method === 'system.rollback.space') {
        return of(space);
      }
      return of({ available: true, reason: null });
    });
    component.loadRollbackWindow();

    expect(component.rollbackWindow).toEqual(window);
    expect(component.rollbackSpace.snapshot_bytes_lower_bound).toBe(1000);
    expect(component.rollbackSnapshotSpace()).toContain('1000');
    expect(component.rollbackOriginSpace()).toContain('24');
    expect(component.canRollback).toBeTrue();
    expect(component.canRemoveRollback).toBeTrue();
  });

  it('renders zero-byte accounting instead of hiding it', () => {
    component.rollbackSpace = {
      ...space,
      snapshot_count: 0,
      snapshot_bytes_lower_bound: 0,
      origin_be_bytes_estimate: 0,
    };

    expect(component.rollbackSnapshotSpace()).toContain('0');
    expect(component.rollbackOriginSpace()).toContain('0');
  });

  it('retains an unavailable window and its exact backend reason', () => {
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of(window);
      }
      if (method === 'system.rollback.space') {
        return of(null);
      }
      return of({ available: false, reason: 'snapshots_missing' });
    });
    component.loadRollbackWindow();

    expect(component.rollbackWindow).toEqual(window);
    expect(component.rollbackAvailability.reason).toBe('snapshots_missing');
    expect(component.rollbackUnavailableMessage()).toContain('snapshots');
    expect(component.canRollback).toBeFalse();
  });

  it('disables the action and surfaces an availability API error', () => {
    ws.call.and.callFake((method) => (method === 'system.rollback.config'
      ? of(window)
      : throwError(() => ({ reason: 'rollback status failed' }))));
    component.loadRollbackWindow();

    expect(component.rollbackWindow).toEqual(window);
    expect(component.rollbackError).toBe('rollback status failed');
    expect(component.canRollback).toBeFalse();
  });

  it('surfaces a space-accounting API error separately from availability', () => {
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of(window);
      }
      if (method === 'system.rollback.available') {
        return of({ available: true, reason: null });
      }
      return throwError(() => ({ reason: 'space query failed' }));
    });

    component.loadRollbackWindow();

    expect(component.rollbackAvailability.available).toBeTrue();
    expect(component.rollbackSpace).toBeNull();
    expect(component.rollbackSpaceError).toBe('space query failed');
  });

  it('requires destructive confirmation before starting the reboot job', () => {
    const success = new Subject();
    const failure = new Subject();
    const job = {
      setCall: jasmine.createSpy('setCall'),
      submit: jasmine.createSpy('submit'),
      success,
      failure,
    };
    dialogService.confirm.and.returnValue(of(true));
    dialog.open.and.returnValue({ componentInstance: job });
    component.rollbackWindow = window;
    component.rollbackCapturedAt = window.captured_at.$date;
    component.rollbackAvailability = { available: true, reason: null };

    component.rollbackToOrigin();

    const confirmation = dialogService.confirm.calls.mostRecent().args[0];
    expect(confirmation.message).toContain('discards system, jail, and plugin changes');
    expect(confirmation.message).toContain('Does not restore unrelated user datasets');
    expect(confirmation.message).toContain('13.3-U1.2');
    expect(job.setCall).toHaveBeenCalledWith('system.rollback.execute');
    expect(job.submit).toHaveBeenCalled();

    success.next({});
    expect(router.navigate).toHaveBeenCalledWith(['/others/reboot'], { skipLocationChange: true });
  });

  it('requires destructive confirmation before removing the capture', () => {
    const success = new Subject();
    const failure = new Subject();
    const job = {
      setCall: jasmine.createSpy('setCall'),
      submit: jasmine.createSpy('submit'),
      success,
      failure,
    };
    dialogService.confirm.and.returnValue(of(true));
    dialog.open.and.returnValue({ componentInstance: job });
    component.rollbackWindow = window;
    component.rollbackAvailability = { available: true, reason: null };
    component.rollbackSpace = space;

    component.removeRollback();

    const confirmation = dialogService.confirm.calls.mostRecent().args[0];
    expect(confirmation.message).toContain('permanently removes the ability to return');
    expect(confirmation.message).toContain('Captured snapshot space');
    expect(confirmation.message).toContain('does not delete');
    expect(job.setCall).toHaveBeenCalledWith('system.rollback.remove');
    expect(job.submit).toHaveBeenCalled();
    expect(component.canRollback).toBeFalse();
  });

  it('allows retrying residual cleanup without reopening the return', () => {
    component.rollbackWindow = { ...window, closed_reason: 'removed' };
    component.rollbackSpace = { ...space, origin_be_pinned: false };

    expect(component.canRollback).toBeFalse();
    expect(component.canRemoveRollback).toBeTrue();
    expect(component.rollbackRemoveLabel()).toBe('Retry Cleanup');

    component.rollbackSpace = { ...component.rollbackSpace, cleanup_pending: false };
    expect(component.canRemoveRollback).toBeFalse();
  });

  it('does not start the job when confirmation is declined', () => {
    dialogService.confirm.and.returnValue(of(false));
    component.rollbackWindow = window;
    component.rollbackAvailability = { available: true, reason: null };

    component.rollbackToOrigin();

    expect(dialog.open).not.toHaveBeenCalled();
  });
});
