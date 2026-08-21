import { GroupListComponent } from '../../../account/groups/group-list/group-list.component';
import { JailListComponent } from '../../../jails/jail-list/jail-list.component';
import { VMwareSnapshotListComponent } from '../../../storage/VMware-snapshot/VMware-snapshot-list/VMware-snapshot-list.component';
import { SnapshotListComponent } from '../../../storage/snapshots/snapshot-list/snapshot-list.component';
import { BootEnvironmentListComponent } from '../../../system/bootenv/bootenv-list/bootenv-list.component';
import { CloudsyncListComponent } from '../../../task-calendar/cloudsync/cloudsync-list/cloudsync-list.component';
import { ReplicationListComponent } from '../../../task-calendar/replication/replication-list/replication-list.component';
import { DeviceListComponent } from '../../../vm/devices/device-list/device-list.component';
import { VMListComponent } from '../../../vm/vm-list/vm-list.component';

// the internal development record: every table's row actions read in the same five groups -- run, change, look,
// derive, destroy -- with Delete always the last entry. The orders here are built from each table's
// own config class (getActions touches nothing but the row until an action is clicked), so this pins
// the sequence the band (#538) and the row menu both render.
interface RowActionTable {
  name: string;
  actions: () => { label: string }[];
  expected: string[];
}

const labels = (table: RowActionTable): string[] => table.actions().map((action) => action.label);

describe('entity table row actions in one order (the internal development record)', () => {
  const tables: RowActionTable[] = [
    {
      name: 'Jails',
      actions: () => JailListComponent.prototype.getActions.call({}, { host_hostuuid: 'web', state: 'up' }),
      // 15.0 has no Applications, so no Convert to application between Shell and Delete.
      expected: ['Start', 'Stop', 'Restart', 'Update', 'Edit', 'Mount points', 'Shell', 'Delete'],
    },
    {
      name: 'Virtual Machines',
      actions: () => VMListComponent.prototype.getActions.call({}, { id: 1, name: 'vm' }),
      expected: ['Start', 'Stop', 'Power Off', 'Restart', 'Edit', 'Devices', 'VNC', 'Serial Shell', 'Clone', 'Delete'],
    },
    {
      name: 'VM devices',
      actions: () => DeviceListComponent.prototype.getActions.call({}, { id: 1, dtype: 'DISK' }),
      expected: ['Edit', 'Change Device Order', 'Details', 'Delete'],
    },
    {
      name: 'Snapshots',
      actions: () => SnapshotListComponent.prototype.getActions.call({ config: { name: 'snapshot' } }),
      expected: ['Clone to New Dataset', 'Rollback', 'Delete'],
    },
    {
      name: 'VMware snapshots',
      actions: () => VMwareSnapshotListComponent.prototype.getActions.call({}, { hostname: 'esxi', id: 1 }),
      expected: ['Edit', 'Delete'],
    },
    {
      name: 'Boot environments (inactive)',
      actions: () => BootEnvironmentListComponent.prototype.getActions.call({}, { id: 'be', active: '-', keep: false }),
      expected: ['Activate', 'Rename', 'Keep', 'Clone', 'Delete'],
    },
    {
      name: 'Boot environments (active, kept)',
      actions: () => BootEnvironmentListComponent.prototype.getActions.call({}, { id: 'be', active: 'N', keep: true }),
      expected: ['Activate', 'Rename', 'Unkeep', 'Clone'],
    },
    {
      name: 'Cloud sync tasks',
      actions: () => CloudsyncListComponent.prototype.getActions.call({}, { description: 'sync', id: 1 }),
      expected: ['Run Now', 'Stop', 'Dry Run', 'Edit', 'Restore', 'Delete'],
    },
    {
      name: 'Replication tasks',
      actions: () => ReplicationListComponent.prototype.getActions.call({}, { name: 'repl', description: 'repl', id: 1 }),
      expected: ['Run Now', 'Edit', 'Restore', 'Delete'],
    },
    {
      name: 'Groups',
      actions: () => GroupListComponent.prototype.getActions.call({}, { group: 'wheel', id: 1, builtin: false }),
      expected: ['Edit', 'Members', 'Delete'],
    },
    {
      name: 'Groups (builtin)',
      actions: () => GroupListComponent.prototype.getActions.call({}, { group: 'wheel', id: 1, builtin: true }),
      expected: ['Members'],
    },
  ];

  for (const table of tables) {
    it(`${table.name}: run, change, look, derive, destroy`, () => {
      expect(labels(table)).toEqual(table.expected);
    });
  }

  it('offers Delete last wherever it is offered', () => {
    for (const table of tables) {
      const sequence = labels(table);
      if (sequence.includes('Delete')) {
        expect(sequence[sequence.length - 1]).withContext(table.name).toBe('Delete');
      }
    }
  });
});
