import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';
import { VolumesListComponent, VolumesListTableConfig } from './volumes-list.component';

describe('maintenance Pools navigation state', () => {
  const createComponent = (navigation: any): any => {
    const component = Object.create(VolumesListComponent.prototype);
    component.navigation = navigation;
    component.zfsPoolRows = [];
    component.sorter = { tableSorter: (rows) => rows };
    component.dialogService = { errorReport: jasmine.createSpy('errorReport') };
    component.ws = {
      call: jasmine.createSpy('call').and.callFake((method) => {
        switch (method) {
          case 'systemdataset.config': return of({ pool: null });
          case 'pool.dataset.query_encrypted_roots_keys': return of({});
          case 'pool.query': return of([{
            id: 1, name: 'ocdqa', is_decrypted: true, status: 'ONLINE',
          }]);
          case 'pool.dataset.query': return of([]);
          case 'pool.is_upgraded': return of(true);
          default: throw new Error(`Unexpected middleware call: ${method}`);
        }
      }),
    };
    return component;
  };

  it('loads a populated pool and settles without transient router navigation', fakeAsync(() => {
    const component = createComponent(null);
    component.ngOnInit();
    flushMicrotasks();
    expect(component.zfsPoolRows.length).toBe(1);
    expect(component.zfsPoolRows[0].volumesListTableConfig).toEqual(jasmine.any(VolumesListTableConfig));
    expect(component.showDefaults).toBe(true);
    expect(component.showSpinner).toBe(false);
  }));

  it('preserves the optional dataset highlight', fakeAsync(() => {
    const component = createComponent({ extras: { state: { highlightDataset: 'ocdqa/child' } } });
    component.ngOnInit();
    flushMicrotasks();
    expect((component.zfsPoolRows[0].volumesListTableConfig as any).highlightNode).toBe('ocdqa/child');
  }));
});
