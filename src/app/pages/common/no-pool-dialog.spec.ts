import { of } from 'rxjs';

import { showNoPoolDialog } from './no-pool-dialog';

describe('showNoPoolDialog', () => {
  let dialog: any;
  let router: any;

  beforeEach(() => {
    dialog = { confirm: jasmine.createSpy('confirm').and.returnValue(of(false)) };
    router = { navigate: jasmine.createSpy('navigate') };
  });

  it('uses the native actionable no-pool confirmation', () => {
    showNoPoolDialog(dialog, router);

    expect(dialog.confirm).toHaveBeenCalledOnceWith({
      title: 'No Pools',
      // the internal development record: the 15.0 wording (plugins and jails share the pool; no Applications)
      message: 'Cannot create plugins or jails until a pool is present for storing them.',
      hideCheckBox: true,
      buttonMsg: 'Create Pool',
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes to the existing pool manager only after confirmation', () => {
    dialog.confirm.and.returnValue(of(true));

    showNoPoolDialog(dialog, router);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/storage', 'pools', 'manager']);
  });
});
