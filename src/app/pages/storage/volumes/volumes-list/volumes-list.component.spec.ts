import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';

import helptext from '../../../../helptext/storage/volumes/volume-list';
import { VolumesListComponent, VolumesListTableConfig } from './volumes-list.component';

describe('VolumesListComponent navigation state', () => {
  const createComponent = (navigation: any): any => {
    const component = Object.create(VolumesListComponent.prototype);
    component.navigation = navigation;
    component.zfsPoolRows = [];
    component.sorter = {
      tableSorter: jasmine.createSpy('tableSorter').and.callFake((rows) => rows),
    };
    component.dialogService = {
      errorReport: jasmine.createSpy('errorReport'),
    };
    component.ws = {
      call: jasmine.createSpy('call').and.callFake((method) => {
        switch (method) {
          case 'systemdataset.config':
            return of({ pool: null });
          case 'pool.dataset.query_encrypted_roots_keys':
            return of({});
          case 'pool.query':
            return of([{
              id: 1,
              name: 'ocdqa',
              is_decrypted: true,
              status: 'ONLINE',
            }]);
          case 'pool.dataset.query':
            return of([]);
          case 'pool.is_upgraded':
            return of(true);
          default:
            throw new Error(`Unexpected middleware call: ${method}`);
        }
      }),
    };

    return component;
  };

  it('loads a non-empty pool and stops the spinner without transient navigation state', fakeAsync(() => {
    const component = createComponent(null);

    component.ngOnInit();
    flushMicrotasks();

    expect(component.zfsPoolRows.length).toBe(1);
    expect(component.zfsPoolRows[0].volumesListTableConfig).toEqual(jasmine.any(VolumesListTableConfig));
    expect(component.showDefaults).toBe(true);
    expect(component.showSpinner).toBe(false);
  }));

  it('continues forwarding an optional dataset highlight', fakeAsync(() => {
    const component = createComponent({ extras: { state: { highlightDataset: 'ocdqa/child' } } });

    component.ngOnInit();
    flushMicrotasks();

    expect((component.zfsPoolRows[0].volumesListTableConfig as any).highlightNode).toBe('ocdqa/child');
  }));
});

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
