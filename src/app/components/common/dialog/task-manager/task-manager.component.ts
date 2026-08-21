import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from 'app/services/locale.service';
import { Observable, Subscription } from 'rxjs';
import {
  animate, state, style, transition, trigger,
} from '@angular/animations';
import { HttpClient } from '@angular/common/http';

import {
  WebSocketService, JobService, SystemGeneralService, DialogService, StorageService,
} from '../../../../services';
import { T } from '../../../../translate-marker';
import { EntityUtils } from '../../../../pages/common/entity/utils';
import * as _ from 'lodash';

type TaskSortKey = 'state' | 'method' | 'percent';

@Component({
  standalone: false,
  selector: 'task-manager',
  templateUrl: './task-manager.component.html',
  styleUrls: ['./task-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    trigger('detailExpand', [
      state('collapsed, void', style({ height: '0px', minHeight: '0', display: 'none' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('expanded <=> void', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class TaskManagerComponent implements OnInit, OnDestroy {
  // the internal development record: the native table's model -- the loaded jobs, the filtered + sorted view the template renders,
  // and the sort/filter state MatTableDataSource + MatSort used to own.
  jobs: any[] = [];
  view: any[] = [];
  sortKey: TaskSortKey | null = null;
  sortDir: 'asc' | 'desc' | '' = '';
  private filterValue = '';
  private floorId: number | null = null;
  private subscrition: Subscription;
  expandedElement: any | null;
  timeZone: string;

  constructor(
    public dialogRef: MatDialogRef<TaskManagerComponent>,
    private ws: WebSocketService,
    protected translate: TranslateService,
    protected job: JobService,
    protected localeService: LocaleService,
    protected sysGeneralService: SystemGeneralService,
    protected dialogService: DialogService,
    protected storageService: StorageService,
    protected http: HttpClient,
  ) {}

  ngOnInit() {
    this.sysGeneralService.getSysInfo().subscribe((res) => {
      this.timeZone = res.timezone;
    });
    this.ws.call('core.get_jobs', [[], { order_by: ['-id'], limit: 50 }]).subscribe(
      (res) => {
        this.jobs = res;
        // the oldest job shown (the list is newest first); younger events update or join it
        this.floorId = res.length ? res[res.length - 1].id : null;
        this.refresh();
      },
      (err) => {

      },
    );

    this.getData().subscribe(
      (res) => {
        // only update exist jobs or add latest jobs. the internal development record: the floor was `data[49].id`, which threw on
        // every event while fewer than 50 jobs existed, so a young box's list never updated live.
        if (this.floorId === null || res.id >= this.floorId) {
          const row = _.find(this.jobs, { id: res.id });
          if (row) {
            Object.assign(row, res); // the same object, so an open detail stays open
          } else {
            this.jobs.push(res);
          }
          this.refresh();
        }
      },
    );
  }

  /** The rows the table renders: the filter, then the sort (MatTableDataSource's order of operations). */
  refresh(): void {
    const filter = this.filterValue;
    const rows = filter ? this.jobs.filter((job) => this.matches(job, filter)) : [...this.jobs];
    if (this.sortKey && this.sortDir) {
      const direction = this.sortDir === 'asc' ? 1 : -1;
      rows.sort((a, b) => this.compare(this.sortValue(a), this.sortValue(b)) * direction);
    }
    this.view = rows;
  }

  /** MatTableDataSource's default filter: the job's fields joined and lowercased (its primitive ones -- the object
   * fields only ever contributed "[object Object]"). */
  private matches(job: any, filter: string): boolean {
    return Object.values(job).filter((value) => value !== null && typeof value !== 'object')
      .join('\u25EC').toLowerCase().includes(filter);
  }

  private sortValue(job: any): string | number {
    // Progress sorts by the job's percent (MatSort's default accessor read `job.percent`, which jobs lack).
    return this.sortKey === 'percent' ? Number(job.progress?.percent) || 0 : (job[this.sortKey] ?? '');
  }

  private compare(a: string | number, b: string | number): number {
    return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  }

  /** A header click cycles ascending -> descending -> off, like MatSort. */
  sortBy(key: TaskSortKey): void {
    if (this.sortKey !== key) {
      this.sortKey = key;
      this.sortDir = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else {
      this.sortKey = null;
      this.sortDir = '';
    }
    this.refresh();
  }

  ariaSort(key: TaskSortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey !== key) return 'none';
    return this.sortDir === 'asc' ? 'ascending' : 'descending';
  }

  toggle(element: any): void {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  // the internal development record: the helm progress throws on a value outside 0..100 (Material clamped silently), and a job
  // can report a null percent or overshoot by rounding -- clamp here so the bar never breaks the task list.
  barValue(percent: number): number {
    return Math.min(100, Math.max(0, Number(percent) || 0));
  }

  ngOnDestroy() {
    this.subscrition.unsubscribe();
  }

  getData(): Observable<any> {
    const source = Observable.create((observer) => {
      this.subscrition = this.ws.subscribe('core.get_jobs').subscribe((res) => {
        observer.next(res.fields);
      });
    });
    return source;
  }

  applyFilter(filterValue: string) {
    this.filterValue = filterValue.trim().toLowerCase();
    this.refresh();
  }

  getReadableDate(data: any) {
    if (data != null) {
      return this.localeService.formatDateTime(new Date(data.$date), this.timeZone);
    }
  }

  showLogs(element) {
    this.dialogService.confirm(T('Logs'), `<pre>${element.logs_excerpt}</pre>`, true, T('Download Logs'),
      false, '', '', '', '', false, T('Close'), true).subscribe(
      (dialog_res) => {
        if (dialog_res) {
          this.ws.call('core.download', ['filesystem.get', [element.logs_path], element.id + '.log']).subscribe(
            (snack_res) => {
              const url = snack_res[1];
              const mimetype = 'text/plain';
              let failed = false;
              this.storageService.streamDownloadFile(this.http, url, element.id + '.log', mimetype).subscribe((file) => {
                this.storageService.downloadBlob(file, element.id + '.log');
              }, (err) => {
                failed = true;
                new EntityUtils().handleWSError(this, err);
              });
            },
            (snack_res) => {
              new EntityUtils().handleWSError(this, snack_res);
            },
          );
        }
      },
    );
  }
}
