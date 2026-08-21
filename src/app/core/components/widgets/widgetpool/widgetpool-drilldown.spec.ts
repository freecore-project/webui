import { isOnline, memberErrors, poolDiskNames, poolVdevs } from './widgetpool-drilldown';

// the internal development record: the pool -> vdev -> disk projection behind the Pools card's in-card levels.
describe('Pools card drill-down projection (#565)', () => {
  const leaf = (disk: string | null, guid: string, overrides = {}) => ({
    type: 'DISK', name: disk ? `gptid/${guid}` : guid, guid, disk, device: disk ? `${disk}p2` : null,
    path: disk ? `/dev/gptid/${guid}` : null, status: 'ONLINE', children: [],
    stats: { read_errors: 0, write_errors: 0, checksum_errors: 0 }, ...overrides,
  });

  it('lists vdevs in 13.3 role order with their leaves, single-disk vdevs flagged and named by disk', () => {
    const vdevs = poolVdevs({
      topology: {
        spare: [leaf('da6', 's6', { status: 'AVAIL' })],
        log: [leaf('da5', 'l5')],
        data: [
          { type: 'RAIDZ2', name: 'raidz2-0', guid: 'v0', status: 'ONLINE', children: [leaf('da0', 'g0'), leaf('da1', 'g1')] },
          leaf('da4', 'g4'),
        ],
        cache: [], special: null,
      },
    });
    expect(vdevs.map((vdev) => [vdev.role, vdev.name, vdev.single, vdev.members.length]))
      .toEqual([['data', 'raidz2-0', false, 2], ['data', 'da4', true, 1], ['log', 'da5', true, 1], ['spare', 'da6', true, 1]]);
    expect(vdevs[0].members[1]).toEqual(jasmine.objectContaining({
      guid: 'g1', disk: 'da1', device: 'da1p2', label: 'gptid/g1', status: 'ONLINE', read: 0, write: 0, checksum: 0,
    }));
    expect(isOnline(vdevs[3].status)).toBeTrue();
    expect(poolDiskNames(vdevs)).toEqual(['da0', 'da1', 'da4', 'da5', 'da6']);
  });

  it('flattens a replacing vdev so the old and the new disk are both members, and keeps a missing disk by GUID', () => {
    const [vdev] = poolVdevs({
      topology: {
        data: [{
          type: 'MIRROR', name: 'mirror-0', guid: 'm0', status: 'DEGRADED', children: [
            leaf('da0', 'g0'),
            { type: 'REPLACING', name: 'replacing-1', guid: 'r1', status: 'DEGRADED', children: [
              leaf(null, '1234567890', { status: 'UNAVAIL', stats: {} }), leaf('da7', 'g7'),
            ] },
          ],
        }],
      },
    });
    expect(vdev.members.map((member) => [member.disk, member.guid, member.status]))
      .toEqual([['da0', 'g0', 'ONLINE'], [null, '1234567890', 'UNAVAIL'], ['da7', 'g7', 'ONLINE']]);
    expect(vdev.members[1].label).toBe('1234567890');
    expect(memberErrors(vdev.members[1])).toEqual({ count: 0, known: false });
    expect(poolDiskNames([vdev])).toEqual(['da0', 'da7']);
  });

  it('sums a leaf\'s counters and treats a pool without topology as having no vdevs', () => {
    expect(memberErrors(poolVdevs({ topology: { data: [leaf('da1', 'g1', {
      stats: { read_errors: 1, write_errors: 0, checksum_errors: 2 },
    })] } })[0].members[0])).toEqual({ count: 3, known: true });
    expect(poolVdevs({ topology: null })).toEqual([]);
    expect(poolVdevs(undefined)).toEqual([]);
  });
});
