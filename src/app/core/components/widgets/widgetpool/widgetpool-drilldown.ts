// the internal development record: the Pools card opens a pool inside the card -- pool -> vdev -> disk -- as
// 13.3's per-pool card did. This file turns one pool.query record into what those three levels
// show; it holds no Angular state so the projection can be tested on its own.

export type PoolRole = 'data' | 'special' | 'dedup' | 'log' | 'cache' | 'spare';

// 13.3's overview listed Data, then Caches, Spares and Logs. The two newer allocation classes sit
// with Data because they hold pool data too.
export const POOL_ROLES: { role: PoolRole; label: string }[] = [
  { role: 'data', label: 'Data' },
  { role: 'special', label: 'Special' },
  { role: 'dedup', label: 'Dedup' },
  { role: 'log', label: 'Log' },
  { role: 'cache', label: 'Cache' },
  { role: 'spare', label: 'Spare' },
];

export interface PoolMember {
  /** ZFS GUID of the leaf vdev; the key the card re-finds a disk by. */
  guid: string;
  /** Whole-disk name (da4), or null when ZFS no longer knows the disk. */
  disk: string | null;
  /** Partition ZFS uses (da4p2). */
  device: string | null;
  /** gptid/... (or whatever label ZFS opened), without /dev/. */
  label: string | null;
  status: string;
  read: number | null;
  write: number | null;
  checksum: number | null;
}

export interface PoolVdev {
  guid: string;
  role: PoolRole;
  /** raidz2-0, mirror-1 ...; for a single-disk vdev the disk name. */
  name: string;
  /** RAIDZ2, MIRROR, DISK ... as pool.query reports it. */
  type: string;
  status: string;
  /** A single-disk vdev (stripe, log or cache disk, spare): the card opens its disk directly. */
  single: boolean;
  members: PoolMember[];
}

export interface DiskFacts {
  serial?: string;
  model?: string;
  size?: number;
}

function counter(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function member(device: any): PoolMember {
  const path = text(device?.path);
  return {
    guid: String(device?.guid ?? ''),
    disk: text(device?.disk),
    device: text(device?.device),
    label: path ? path.replace(/^\/dev\//, '') : text(device?.name),
    status: text(device?.status) || 'UNKNOWN',
    read: counter(device?.stats?.read_errors),
    write: counter(device?.stats?.write_errors),
    checksum: counter(device?.stats?.checksum_errors),
  };
}

// A top-level vdev's leaves. A replacing/spare vdev nested under raidz or mirror while a disk is
// being swapped contributes its own leaves, so the old and the new disk are both listed.
function leaves(device: any): any[] {
  if (device?.children?.length) {
    return device.children.reduce((all: any[], child: any) => all.concat(leaves(child)), []);
  }
  return [device];
}

export function poolVdevs(pool: any): PoolVdev[] {
  const topology = pool?.topology;
  if (!topology) { return []; }
  const vdevs: PoolVdev[] = [];
  for (const { role } of POOL_ROLES) {
    for (const item of topology[role] || []) {
      if (!item) { continue; }
      const single = !item.children?.length;
      const members = leaves(item).map(member);
      vdevs.push({
        guid: String(item.guid ?? ''),
        role,
        name: single ? (members[0].disk || members[0].label || members[0].guid) : (text(item.name) || String(item.type || '').toLowerCase()),
        type: text(item.type) || 'UNKNOWN',
        status: text(item.status) || 'UNKNOWN',
        single,
        members,
      });
    }
  }
  return vdevs;
}

export function poolDiskNames(vdevs: PoolVdev[]): string[] {
  const names = new Set<string>();
  for (const vdev of vdevs) {
    for (const leaf of vdev.members) {
      if (leaf.disk) { names.add(leaf.disk); }
    }
  }
  return Array.from(names);
}

export function memberErrors(leaf: PoolMember): { count: number; known: boolean } {
  const values = [leaf.read, leaf.write, leaf.checksum];
  return {
    count: values.reduce((sum: number, value) => sum + (value ?? 0), 0),
    known: values.every((value) => value !== null),
  };
}

export function isOnline(status: string): boolean {
  return status === 'ONLINE' || status === 'HEALTHY' || status === 'AVAIL';
}
