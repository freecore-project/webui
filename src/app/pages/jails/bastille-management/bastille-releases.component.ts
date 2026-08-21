import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { WebSocketService } from '../../../services';
import { T } from '../../../translate-marker';
import { InputTableConf } from '../../common/entity/entity-table/entity-table.component';

export interface BastilleRelease {
  name: string;
  consumers: string[];
  used_bytes: number;
  cache_bytes: number;
  deletable?: boolean;
  reason?: string | null;
}

/** Render an exact byte count the way an operator reads disk or memory usage. */
export function bastilleSize(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) { return '—'; }
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${unit === 0 || size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

// the internal development record: releases are observed here and managed on the console
// (`bastille bootstrap`, `bastille destroy`). Nothing on this page writes.
@Component({
  standalone: false,
  selector: 'app-bastille-releases',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './bastille-releases.component.html',
  styleUrls: ['./bastille-management.component.scss'],
})
export class BastilleReleasesComponent implements InputTableConf, OnDestroy {
  title = T('Bastille Releases');
  queryCall = 'bastille.releases';
  rowIdentifier = 'name';
  autoFillWindowHeight = true;
  columns = [
    { name: T('Release'), prop: 'name', always_display: true },
    { name: T('Used'), prop: 'used_label' },
    { name: T('Cache'), prop: 'cache_label' },
    { name: T('Jails'), prop: 'jails_label', always_display: true },
  ];
  config = { paging: true, sorting: { columns: this.columns }, multiSelect: false };
  // the internal development record: a table without row actions says so, and the entity table
  // leaves the actions column out. An empty action list is not the same thing: the
  // actions cell dereferences actions[0] and every row failed to render.
  noActions = true;
  custActions = [
    { id: 'refresh', name: T('Refresh'), function: () => this.refresh() },
    { id: 'jails', name: T('Back to Bastille Jails'), function: () => this.router.navigate(['/jails', 'bastille']) }, // the crumb chain is Jails › Releases: Jails is the iocage list
  ];
  ready = false;
  loading = false;
  error = '';
  entityList: any;
  private destroyed = new Subject<void>();

  constructor(
    private ws: WebSocketService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  callGetFunction(entity: any): void {
    this.entityList = entity;
    this.loading = true;
    entity.getFunction = this.ws.call('bastille.config').pipe(
      tap(() => { this.error = ''; }),
      switchMap((config: any) => {
        this.ready = !!(config.installed && config.configured && config.configuration_valid);
        if (!this.ready) {
          this.error = config.configuration_error || T('Select a data pool in Bastille Settings.');
          return of([]);
        }
        return this.ws.call('bastille.releases');
      }),
      catchError((error) => {
        this.error = this.describeError(error);
        this.ready = false;
        return of([]);
      }),
      takeUntil(this.destroyed),
      finalize(() => { this.loading = false; }),
    );
    entity.callGetFunction();
  }

  resourceTransformIncomingRestData(releases: BastilleRelease[]): any[] {
    return releases.map((release) => ({
      ...release,
      used_label: bastilleSize(release.used_bytes),
      cache_label: bastilleSize(release.cache_bytes),
      jails_label: Array.isArray(release.consumers) && release.consumers.length ? release.consumers.join(', ') : '—',
    }));
  }

  refresh(): void {
    if (!this.loading) { this.entityList?.getData(); }
  }

  private describeError(error: any): string {
    return error?.reason || error?.message || error?.error || T('Unable to read Bastille releases.');
  }
}
