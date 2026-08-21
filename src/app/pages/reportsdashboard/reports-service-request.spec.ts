import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CoreEvent, CoreService } from '../../core/services/core.service';
import { reportData } from './reportsdashboard-testing';
import { ReportsService } from './reports.service';

// #440: exercise the actual service and browser worker. The middleware boundary
// is deferred; request IDs are not echoed by a mock worker or a mock service.
describe('Reporting request transport (#440)', () => {
  let service: ReportsService;
  let core: CoreService;
  let calls: { result: Subject<any>; finished: boolean }[];
  let ws: { call: jasmine.Spy };
  const observer = {};

  beforeEach(() => {
    core = new CoreService();
    calls = [];
    ws = { call: jasmine.createSpy('call').and.callFake(() => {
      const call = { result: new Subject<any>(), finished: false };
      calls.push(call);
      return call.result.pipe(finalize(() => { call.finished = true; }));
    }) };
    service = new ReportsService(ws as any, core, null);
  });

  afterEach(() => {
    service.ngOnDestroy();
    core.unregister({ observerClass: observer });
  });

  function response(chartId: string, requestId: number): Promise<CoreEvent> {
    return new Promise((resolve) => {
      core.register({ observerClass: observer, eventName: 'ReportData-' + chartId }).subscribe((event) => {
        if (event.data.requestId === requestId) { resolve(event); }
      });
    });
  }

  function request(requestId: number, name = 'cpu', chartId = 'chart-request-test'): CoreEvent {
    const event = {
      name: 'ReportDataRequest', sender: { chartId }, data: {
        requestId, report: { name, vertical_label: '% CPU' },
        params: { name }, timeFrame: { start: 1790000000, end: 1790000600 }, truncate: false,
      },
    };
    core.emit(event);
    return event;
  }

  it('preserves originating chart and request IDs through reverse ordinary-response completion', async () => {
    const olderResponse = response('chart-request-test', 1);
    const latestResponse = response('chart-request-test', 2);
    const older = request(1);
    request(2);
    // A later intent must never relabel already submitted work.
    older.sender.chartId = 'changed-after-dispatch';
    older.data.requestId = 99;
    const latestSamples = { ...reportData(1), legend: ['latest'] };
    calls[1].result.next([latestSamples]);
    calls[1].result.complete();
    const latest = await latestResponse;
    const olderSamples = { ...reportData(1), legend: ['older'] };
    calls[0].result.next([olderSamples]);
    calls[0].result.complete();
    const earlier = await olderResponse;
    expect(latest.data.requestId).toBe(2);
    expect(latest.data.result.legend).toEqual(['latest']);
    expect(earlier.data.requestId).toBe(1);
    expect(earlier.name).toBe('ReportData-chart-request-test');
    expect(earlier.data.result.legend).toEqual(['older']);
    expect(calls.every((call) => call.finished)).toBeTrue();
  });

  it('preserves request identity through the cputemp worker branch and export failure', async () => {
    const temperatureResponse = response('temperature-chart', 8);
    const failedResponse = response('failed-chart', 8);
    request(8, 'cputemp', 'temperature-chart');
    request(8, 'memory', 'failed-chart');
    calls[0].result.next([{
      ...reportData(2), name: 'cputemp', data: [[20, 40], [30, 50]],
      aggregations: { min: [20, 40], mean: [25, 45], max: [30, 50] },
    }]);
    calls[0].result.complete();
    calls[1].result.error({ error: 206, reason: 'Invalid timestamp' });
    const temperature = await temperatureResponse;
    const failed = await failedResponse;
    expect(temperature.data.requestId).toBe(8);
    expect(temperature.data.result.legend).toEqual(['Avg Temp']);
    expect(temperature.data.result.data).toEqual([[30], [40]]);
    expect(failed.data.requestId).toBe(8);
    expect(failed.data.result.name).toBe('FetchingError');
    expect(failed.data.result.data).toEqual({ error: 206, reason: 'Invalid timestamp' });
  });

  it('settles genuinely empty and all-null current windows through the real worker', async () => {
    for (const [index, samples] of [[], [[null], [null]]].entries()) {
      const requestId = index + 1;
      const received = response('chart-request-test', requestId);
      // Publish the truncation flag before dispatch; this is the live-end path.
      core.emit({
        name: 'ReportDataRequest', sender: { chartId: 'chart-request-test' }, data: {
          requestId, report: { name: 'cpu', vertical_label: '% CPU' },
          params: { name: 'cpu' }, timeFrame: { start: 1790000000, end: 1790000600 }, truncate: true,
        },
      });
      calls[index].result.next([{ ...reportData(1), data: samples }]);
      calls[index].result.complete();
      const event = await received;
      expect(event.data.requestId).toBe(requestId);
      expect(event.data.result.data).toEqual([]);
      expect(event.data.result.name).toBe('cpu');
    }
  });

  it('settles an empty cputemp export with the backend\'s empty aggregation arrays', async () => {
    const worker: Worker = (service as any).reportsUtils;
    let onWorkerError: (event: ErrorEvent) => void;
    const failed = new Promise<never>((_resolve, reject) => {
      onWorkerError = (event) => {
        // Surface the inherited worker exception as this test's failure, rather
        // than an unrelated global error followed by a response timeout.
        event.preventDefault();
        reject(new Error(event.message));
      };
      worker.addEventListener('error', onWorkerError);
    });
    const received = response('empty-temperature-chart', 9);
    try {
      request(9, 'cputemp', 'empty-temperature-chart');
      // rrd_utils.py produces empty aggregate arrays when there are no rows.
      calls[0].result.next([{
        ...reportData(2), name: 'cputemp', data: [],
        aggregations: { min: [], mean: [], max: [] },
      }]);
      calls[0].result.complete();
      const event = await Promise.race([received, failed]);
      expect(event.data.requestId).toBe(9);
      expect(event.data.result.name).toBe('cputemp');
      expect(event.data.result.data).toEqual([]);
      expect(event.data.result.aggregations).toEqual({ min: [], mean: [], max: [] });
      expect(calls[0].finished).toBeTrue();
    } finally {
      worker.removeEventListener('error', onWorkerError);
    }
  });

  it('unsubscribes unresolved exports before terminating its worker', () => {
    request(1);
    const worker: Worker = (service as any).reportsUtils;
    const post = spyOn(worker, 'postMessage').and.callThrough();
    const terminate = spyOn(worker, 'terminate').and.callFake(() => {
      expect(calls[0].finished).toBeTrue();
    });
    service.ngOnDestroy();
    expect(terminate).toHaveBeenCalledTimes(1);
    calls[0].result.next([reportData(1)]);
    calls[0].result.complete();
    expect(post).not.toHaveBeenCalled();
    // The spy observes ordering, then allow the actual worker to be cleaned up.
    terminate.and.callThrough();
    worker.terminate();
  });
});
