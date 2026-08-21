import { SimpleChange } from '@angular/core';
import { WidgetPoolComponent } from './widgetpool.component';

describe('Pools stacked-row projection (#444)', () => {
  function pool(name: string, overrides = {}) {
    return { name, status: 'ONLINE', healthy: true, is_decrypted: true,
      topology: { data: [{ type: 'DISK', stats: { read_errors: 0, write_errors: 0, checksum_errors: 0 } }] }, ...overrides };
  }

  function project(pools: any[], volumeData: any): WidgetPoolComponent {
    const widget = Object.create(WidgetPoolComponent.prototype) as WidgetPoolComponent;
    widget.pools = pools;
    widget.volumeData = volumeData;
    widget.ngOnChanges({ pools: new SimpleChange(undefined, pools, true), volumeData: new SimpleChange(undefined, volumeData, true) });
    return widget;
  }

  it('joins capacity by pool name regardless of dataset order and keeps zero used distinct from unavailable', () => {
    const widget = project([pool('tank'), pool('backup'), pool('empty'), pool('missing')], {
      backup: { used: 80, avail: 20 }, tank: { used: 25, avail: 75 }, empty: { used: 0, avail: 100 },
    });
    expect(widget.rows.map((row) => [row.name, row.percent])).toEqual([
      ['tank', 25], ['backup', 80], ['empty', 0], ['missing', null],
    ]);
    expect(widget.rows.every((row) => row.errorsKnown && row.errors === 0)).toBeTrue();
  });

  it('keeps locked/degraded states and rejects nonfinite, negative, zero-total and nonnumeric capacity', () => {
    const widget = project([pool('locked', { is_decrypted: false }), pool('degraded', { healthy: false, status: 'DEGRADED' })], {
      locked: { used: 1, avail: 9 }, degraded: { used: 1, avail: 9 },
    });
    expect(widget.rows[0].status).toBe('Locked');
    expect(widget.rows[0].percent).toBeNull();
    expect(widget.rows[1].percent).toBe(10);
    expect(widget.rows.every((row) => row.unhealthy)).toBeTrue();
    for (const capacity of [{ used: NaN, avail: 9 }, { used: 1, avail: Infinity }, { used: -1, avail: 9 },
      { used: 0, avail: 0 }, { used: '1', avail: 9 }, { used: 1 }]) {
      expect(project([pool('tank')], { tank: capacity }).rows[0].percent).toBeNull();
    }
  });

  it('sums nested leaf counters across roles once and marks incomplete counters instead of claiming zero', () => {
    const stats = (read: number) => ({ read_errors: read, write_errors: 0, checksum_errors: 0 });
    const widget = project([
      pool('nested', { topology: { data: [{ stats: stats(99), children: [{ children: [{ stats: stats(2) }] }, { stats: stats(3) }] }],
        special: [{ stats: stats(4) }] } }),
      pool('partial', { topology: { data: [{ stats: { read_errors: 2 } }] } }),
      pool('unknown', { topology: null }),
    ], {});
    expect(widget.rows.map((row) => [row.errors, row.errorsKnown])).toEqual([[9, true], [2, false], [0, false]]);
  });

  it('retains positive scan errors separately from zero I/O counters and keeps absent scans quiet', () => {
    const widget = project([
      pool('scan-only', { scan: { errors: 4 } }), pool('never-scanned'),
      pool('no-scan', { scan: null }), pool('clean-scan', { scan: { errors: 0 } }),
    ], {});
    expect(widget.rows[0].errors).toBe(0);
    expect(widget.rows[0].errorsKnown).toBeTrue();
    expect(widget.rows.map((row) => row.scanErrors)).toEqual([4, 0, 0, 0]);
  });

  it('recomputes additions, removal, status, errors and capacity when current inputs are replaced', () => {
    const widget = project([pool('old'), pool('tank')], { tank: { used: 25, avail: 75 } });
    widget.pools = [pool('tank', { status: 'DEGRADED', healthy: false }), pool('new')];
    widget.ngOnChanges({ pools: new SimpleChange([], widget.pools, false) });
    expect(widget.rows.map((row) => row.name)).toEqual(['tank', 'new']);
    expect(widget.rows[0].unhealthy).toBeTrue();
    widget.volumeData = { tank: { used: 50, avail: 50 }, new: { used: 0, avail: 100 } };
    widget.ngOnChanges({ volumeData: new SimpleChange({}, widget.volumeData, false) });
    expect(widget.rows.map((row) => row.percent)).toEqual([50, 0]);
    widget.pools = [];
    widget.ngOnChanges({ pools: new SimpleChange([], [], false) });
    expect(widget.rows).toEqual([]);
  });
});
