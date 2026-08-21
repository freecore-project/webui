import { Component, ChangeDetectionStrategy } from '@angular/core';

import { EntityTreeTable } from '../../common/entity/entity-tree-table/entity-tree-table.model';

@Component({
  standalone: false,
  selector: 'app-storage-multipath',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './multipaths.component.html',
})
export class MultipathsComponent {
  treeTableConfig: EntityTreeTable = {
    columns: [
      { name: 'Name', prop: 'name' },
      { name: 'Status', prop: 'status' },
      { name: 'LUN ID', prop: 'lun_id' },
    ],
    queryCall: 'multipath.query',
  };
  constructor() {}
}
