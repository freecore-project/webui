import { Router } from '@angular/router';

import { DialogService } from '../../services/dialog.service';
import { T } from '../../translate-marker';

export function showNoPoolDialog(dialog: DialogService, router: Router): void {
  dialog.confirm({
    title: T('No Pools'),
    message: T('Cannot create plugins or jails until a pool is present for storing them.'),
    hideCheckBox: true,
    buttonMsg: T('Create Pool'),
  }).subscribe((createPool) => {
    if (createPool) {
      router.navigate(['/storage', 'pools', 'manager']);
    }
  });
}
