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

  it('says plainly when a capture points at a FreeCORE boot environment', () => {
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of(window);
      }
      if (method === 'system.rollback.space') {
        return of(null);
      }
      return of({ available: false, reason: 'origin_not_13_3' });
    });
    component.loadRollbackWindow();

    expect(component.rollbackUnavailableMessage()).toBe('The origin boot environment is a FreeCORE release, not TrueNAS CORE 13.3.');
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

  it('closes the pinned job dialog once the capture has been removed', () => {
    const success = new Subject();
    const failure = new Subject();
    const job = {
      setCall: jasmine.createSpy('setCall'),
      submit: jasmine.createSpy('submit'),
      success,
      failure,
    };
    const dialogRef = { componentInstance: job, close: jasmine.createSpy('close') };
    dialogService.confirm.and.returnValue(of(true));
    dialog.open.and.returnValue(dialogRef);
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of(null);
      }
      return throwError({ reason: 'unexpected call' });
    });
    component.rollbackWindow = window;
    component.rollbackAvailability = { available: true, reason: null };
    component.rollbackSpace = space;

    component.removeRollback();

    // The dialog is opened pinned, so the job component hides its own Close
    // button; the page has to release it itself when the job succeeds.
    expect(dialog.open.calls.mostRecent().args[1].disableClose).toBeTrue();
    expect(component.rollbackRemoving).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();

    success.next({});

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(component.rollbackRemoving).toBeFalse();
    expect(ws.call).toHaveBeenCalledWith('system.rollback.config');
    expect(component.rollbackWindow).toBeNull();
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

  it('withdraws the card once a removed capture has nothing left to clean up', () => {
    ws.call.and.callFake((method) => {
      if (method === 'system.rollback.config') {
        return of({ ...window, closed_reason: 'removed' });
      }
      if (method === 'system.rollback.space') {
        return of({
          snapshot_count: 0,
          snapshot_bytes_lower_bound: 0,
          origin_be_bytes_estimate: null,
          origin_be_pinned: false,
          cleanup_pending: false,
        });
      }
      return of({ available: false, reason: 'removed' });
    });

    component.loadRollbackWindow();

    expect(component.rollbackWindow.closed_reason).toBe('removed');
    expect(component.showRollbackCard).toBeFalse();
    expect(component.showRollbackReturn).toBeFalse();
    expect(component.canRemoveRollback).toBeFalse();
  });

  it('does not show a closed capture before its space is known', () => {
    component.rollbackWindow = { ...window, closed_reason: 'removed' };

    expect(component.showRollbackCard).toBeFalse();
  });

  it('keeps a closed capture on the page while residual state still stands', () => {
    component.rollbackWindow = { ...window, closed_reason: 'removed' };
    component.rollbackSpace = { ...space, origin_be_pinned: false };

    expect(component.showRollbackCard).toBeTrue();
    expect(component.showRollbackReturn).toBeFalse();
    expect(component.canRemoveRollback).toBeTrue();

    component.rollbackSpace = null;
    component.rollbackSpaceError = 'space query failed';
    expect(component.showRollbackCard).toBeTrue();
    expect(component.canRemoveRollback).toBeTrue();
  });

  it('withdraws the return but not the capture when it can no longer be taken', () => {
    component.rollbackWindow = window;
    component.rollbackAvailability = { available: false, reason: 'origin_be_missing' };
    component.rollbackSpace = space;

    expect(component.showRollbackCard).toBeTrue();
    expect(component.showRollbackReturn).toBeFalse();
    expect(component.canRollback).toBeFalse();
    expect(component.canRemoveRollback).toBeTrue();
  });

  it('keeps an open window on the page while its status is still being read', () => {
    component.rollbackWindow = window;

    expect(component.showRollbackCard).toBeTrue();
    expect(component.showRollbackReturn).toBeFalse();

    component.rollbackAvailability = { available: true, reason: null };
    expect(component.showRollbackReturn).toBeTrue();
  });

  it('does not start the job when confirmation is declined', () => {
    dialogService.confirm.and.returnValue(of(false));
    component.rollbackWindow = window;
    component.rollbackAvailability = { available: true, reason: null };

    component.rollbackToOrigin();

    expect(dialog.open).not.toHaveBeenCalled();
  });
});

describe('UpdateComponent move to TrueNAS SCALE (the internal development record)', () => {
  let component: UpdateComponent;
  let router: any;
  let ws: any;
  let dialog: any;
  let dialogService: any;

  const ready = {
    available: true,
    target: {
      version: '24.04.2.5', filename: 'TrueNAS-SCALE-24.04.2.5.update', filesize: 1320603648,
      checksum: 'd'.repeat(64), source: 'iX', url: 'https://update.freenas.org/scale/x',
    },
    blockers: [] as string[],
    pools: [] as any[],
    not_carried: ['Applications (2 installed)'],
    way_back: 'To return to FreeCORE, activate its boot environment under System -> Boot in TrueNAS SCALE, '
      + 'then power the system off and on. A restart from TrueNAS SCALE does not return to FreeCORE.',
  };
  const poolWarning = {
    pool: 'nf', unavailable: true, read_only_import: true, features: ['block_cloning_endian'], until: 'TrueNAS 26',
    text: 'Pool nf uses OpenZFS features TrueNAS SCALE 24.04 can only read (block_cloning_endian). '
      + 'TrueNAS SCALE does not import it on its own: it stays unavailable until TrueNAS 26 or later runs, '
      + 'and can only be imported read-only from the shell until then.',
  };

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate'), url: '/system/update' };
    ws = { call: jasmine.createSpy('call') };
    dialog = { open: jasmine.createSpy('open') };
    dialogService = { confirm: jasmine.createSpy('confirm') };
    component = new UpdateComponent(
      router, {} as any, ws, dialog, { updateRunning: of('false') } as any, {} as any, dialogService,
      {} as any, {} as any, {} as any, {} as any,
    );
  });

  it('runs the check, which downloads nothing, and shows what it found', () => {
    ws.call.and.returnValue(of(ready));
    component.scaleMoveAcknowledged = true;

    component.checkScaleMove();

    expect(ws.call).toHaveBeenCalledWith('update.scale_move_check');
    expect(component.scaleMove).toEqual(ready);
    expect(component.scaleMoveChecking).toBe(false);
    expect(component.scaleMoveAcknowledged).toBe(false);
    expect(component.canMoveToScale).toBe(true);
    expect(component.scaleMoveSize()).toContain('GiB');
  });

  it('surfaces a failed check and offers no move', () => {
    ws.call.and.returnValue(throwError({ reason: 'middleware unreachable' }));

    component.checkScaleMove();

    expect(component.scaleMove).toBeNull();
    expect(component.scaleMoveError).toBe('middleware unreachable');
    expect(component.canMoveToScale).toBe(false);
  });

  it('stops on a blocker', () => {
    component.scaleMove = { ...ready, available: false, blockers: ['The boot pool boot-pool was created with ashift 14 ...'] };

    expect(component.canMoveToScale).toBe(false);
    component.moveToScale();
    expect(dialogService.confirm).not.toHaveBeenCalled();
  });

  it('lets a pool warning through only once it is acknowledged', () => {
    component.scaleMove = { ...ready, pools: [poolWarning] };

    expect(component.canMoveToScale).toBe(false);
    component.scaleMoveAcknowledged = true;
    expect(component.canMoveToScale).toBe(true);
  });

  it('confirms with the target and the way back, then runs the move job and restarts', () => {
    const success = new Subject();
    const failure = new Subject();
    const job = { setCall: jasmine.createSpy('setCall'), submit: jasmine.createSpy('submit'), success, failure };
    dialogService.confirm.and.returnValue(of(true));
    dialog.open.and.returnValue({ componentInstance: job });
    component.scaleMove = ready;

    component.moveToScale();

    const confirmation = dialogService.confirm.calls.mostRecent().args[0];
    expect(confirmation.message).toContain('installs TrueNAS SCALE 24.04 next to FreeCORE');
    expect(confirmation.message).toContain('TrueNAS SCALE 24.04.2.5');
    expect(confirmation.message).toContain('power the system off and on');
    expect(confirmation.disableClose).toBe(true);
    expect(dialog.open.calls.mostRecent().args[1].disableClose).toBe(true);
    expect(job.setCall).toHaveBeenCalledWith('update.scale_move', [{ reboot: true }]);
    expect(job.submit).toHaveBeenCalled();

    success.next({});
    expect(router.navigate).toHaveBeenCalledWith(['/others/reboot'], { skipLocationChange: true });
  });

  it('does not start the move when the confirmation is declined', () => {
    dialogService.confirm.and.returnValue(of(false));
    component.scaleMove = ready;

    component.moveToScale();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(component.scaleMoveExecuting).toBe(false);
  });

  it('cancels back to the plain page', () => {
    component.scaleMove = ready;
    component.scaleMoveAcknowledged = true;

    component.cancelScaleMove();

    expect(component.scaleMove).toBeNull();
    expect(component.scaleMoveAcknowledged).toBe(false);
  });
});
