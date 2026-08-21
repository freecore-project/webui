import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from 'app/services/ws.service';
import { Subject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreEvent, CoreService } from 'app/core/services/core.service';
import { HttpClient } from '@angular/common/http';

/*
 * This service acts as a proxy between middleware/web worker
 * and reports page components.
 * */

export interface Command {
  command: string; // Use '|' or '--pipe' to use the output of previous command as input
  input: any;
  options?: any[]; // Function parameters
}

export enum ReportingDatabaseError {
  FailedExport = 22,
  InvalidTimestamp = 206,
}

export interface ReportResponse {
  requestId: number;
  result: any;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService implements OnDestroy {
  dataEvents: Subject<CoreEvent> = new Subject<CoreEvent>();
  private reportsUtils: Worker;
  private requests = new Subscription();

  constructor(private ws: WebSocketService, private core: CoreService, private http: HttpClient) {
    // @ts-ignore
    this.reportsUtils = new Worker(new URL('./reports-utils.worker', import.meta.url), { type: 'module' });

    this.core.register({ observerClass: this, eventName: 'ReportDataRequest' }).subscribe((evt: CoreEvent) => {
      // Preserve the originating intent, even if the component has moved on by
      // the time middleware or the worker completes this request.
      const sender = evt.sender.chartId;
      const requestId = evt.data.requestId;
      this.requests.add(this.ws.call('reporting.get_data', [[evt.data.params], evt.data.timeFrame]).subscribe((raw_res) => {
        let res;

        // If requested, we truncate trailing null values
        if (evt.data.truncate) {
          const truncated = this.truncateData(raw_res[0].data);
          res = Object.assign([], raw_res);
          res[0].data = truncated;
        } else {
          res = raw_res;
        }

        const commands = [
          {
            command: 'optimizeLegend',
            input: res[0],
          },
          {
            command: 'convertAggregations',
            input: '|',
            options: [evt.data.report.vertical_label], // units
          },
        ];

        // We average out cputemps for v11.3.
        // Move this to backend for 12.
        if (evt.data.report.name == 'cputemp') {
          // Do a complete replacement instead...
          const repl = [{
            command: 'avgCpuTempReport',
            input: res[0],
          }];

          this.reportsUtils.postMessage({ name: 'ProcessCommandsAsReportData', data: repl, sender, requestId });
        } else {
          this.reportsUtils.postMessage({ name: 'ProcessCommandsAsReportData', data: commands, sender, requestId });
        }
      }, (err) => {
        this.reportsUtils.postMessage({ name: 'FetchingError', data: err, sender, requestId });
      }));
    });

    this.reportsUtils.onmessage = ({ data }) => {
      if (data.name == 'ReportData') {
        this.core.emit({ name: 'ReportData-' + data.sender, data: { requestId: data.requestId, result: data.data }, sender: this });
      }
    };
  }

  ngOnDestroy() {
    this.core.unregister({ observerClass: this });
    this.requests.unsubscribe();
    this.reportsUtils.onmessage = null;
    this.reportsUtils.terminate();
  }

  prepReport(evt: CoreEvent) {
    this.reportsUtils.onmessage = ({ data }) => {
      const evt = data;
    };

    const pipeLine: Command[] = [
      {
        command: 'maxDecimals',
        input: 3.145679156,
        options: [3],
      },
    ];

    this.reportsUtils.postMessage({ name: 'ProcessCommands', data: pipeLine, sender: 'chartID' });
  }

  truncateData(data) {
    if (data.length === 0) { return data; }
    let finished = false;
    let index = data.length - 1;
    do {
      // True only when all the values are null
      const isEmpty = !data[index].reduce((acc, v) => {
        // Treat zero as a value
        const value = v !== null ? 1 : v;
        return acc + value;
      });

      if (isEmpty) {
        data.splice(index, 1);
      } else {
        finished = true;
      }
      index--;
    } while (!finished && data.length > 0);

    return data;
  }

  getServerTime(): Observable<Date> {
    return this.ws.call('system.info')
      .pipe(map((systemInfo) => {
        const msToTrim = 60_000;
        return new Date(systemInfo.datetime.$date - msToTrim);
      }));
  }
}
