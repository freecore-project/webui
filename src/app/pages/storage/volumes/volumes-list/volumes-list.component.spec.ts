import { of } from 'rxjs';

import helptext from '../../../../helptext/storage/volumes/volume-list';
import { VolumesListTableConfig } from './volumes-list.component';

describe('VolumesListTableConfig persistent-return pool upgrade', () => {
  let config: any;
  let dialogService: any;
  let ws: any;

  beforeEach(() => {
    dialogService = {
      confirm: jasmine.createSpy('confirm').and.returnValue(of(true)),
      report: jasmine.createSpy('report').and.returnValue(of(true)),
      errorReport: jasmine.createSpy('errorReport'),
    };

    config = Object.create(VolumesListTableConfig.prototype);
    config.dialogService = dialogService;
    config.loader = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
    };
    config.parentVolumesListComponent = { repaintMe: jasmine.createSpy('repaintMe') };
    config.translate = {
      get: jasmine.createSpy('get').and.callFake((value) => of(value)),
    };
  });

  it('passes rollback-loss consent only after naming the captured return', () => {
    ws = {
      call: jasmine.createSpy('call').and.callFake((method) => {
        if (method === 'system.rollback.available') {
          return of({ available: true, reason: null });
        }
        return of(true);
      }),
    };
    config.ws = ws;

    config.upgradePool({ id: 7 }, { name: 'tank' });

    expect(dialogService.confirm.calls.mostRecent().args[1]).toContain(
      'permanently forfeit the captured return to TrueNAS CORE 13.3',
    );
    expect(ws.call).toHaveBeenCalledWith('pool.upgrade', [
      7,
      { confirm_rollback_loss: true },
    ]);
  });

  it('uses the ordinary warning and declines rollback-loss consent when no return exists', () => {
    ws = {
      call: jasmine.createSpy('call').and.callFake((method) => {
        if (method === 'system.rollback.available') {
          return of({ available: false, reason: 'no_window' });
        }
        return of(true);
      }),
    };
    config.ws = ws;

    config.upgradePool({ id: 8 }, { name: 'archive' });

    expect(config.translate.get).toHaveBeenCalledWith(helptext.upgradePoolDialog_warning);
    expect(ws.call).toHaveBeenCalledWith('pool.upgrade', [
      8,
      { confirm_rollback_loss: false },
    ]);
  });

  it('does not consent to rollback loss when the operator cancels', () => {
    dialogService.confirm.and.returnValue(of(false));
    ws = {
      call: jasmine.createSpy('call').and.returnValue(of({ available: true, reason: null })),
    };
    config.ws = ws;

    config.upgradePool({ id: 9 }, { name: 'cancelled' });

    expect(dialogService.confirm.calls.mostRecent().args[1]).toContain(
      'permanently forfeit the captured return to TrueNAS CORE 13.3',
    );
    expect(ws.call).not.toHaveBeenCalledWith('pool.upgrade', jasmine.anything());
  });
});
