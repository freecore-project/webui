// the internal development record: the read-only Releases table must render its rows.
//
// The unit spec checked the conf; it never mounted the entity table, so it could
// not see that an empty action list made every row throw in the actions cell
// (`this.actions[0].actionName`) and the table show "1 - 2 of 2" above nothing.
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { MaterialModule } from '../../../appMaterial.module';
import { CoreService } from '../../../core/services/core.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { DialogService, JobService, RestService, WebSocketService } from '../../../services';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DocsService } from '../../../services/docs.service';
import { ErdService } from '../../../services/erd.service';
import { LocaleService } from '../../../services/locale.service';
import { StorageService } from '../../../services/storage.service';
import { EntityModule } from '../../common/entity/entity.module';
import { EntityTableComponent } from '../../common/entity/entity-table/entity-table.component';
import { BastilleRelease, BastilleReleasesComponent } from './bastille-releases.component';

const ready = { installed: true, configured: true, configuration_valid: true, enabled: true, pool: 'tank' };
const releases: BastilleRelease[] = [
  { name: '15.1-RELEASE', consumers: ['web'], used_bytes: 389750784, cache_bytes: 164868096 },
  { name: '15.0-RELEASE', consumers: [], used_bytes: 576548864, cache_bytes: 165371904 },
];

describe('Bastille releases rendered in the entity table', () => {
  let ws: { call: jasmine.Spy };

  beforeEach(async () => {
    ws = {
      call: jasmine.createSpy('call').and.callFake((method: string) => of({
        'bastille.config': ready,
        'bastille.releases': releases,
      }[method])),
    };
    await TestBed.configureTestingModule({
      imports: [CommonModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        DialogService, JobService, StorageService, ErdService,
        { provide: Router, useValue: { events: NEVER, url: '/jails/bastille/releases', navigate: () => {} } },
        { provide: WebSocketService, useValue: { ...ws, onCloseSubject: NEVER } },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
        { provide: DocsService, useValue: { getDocs: () => of('') } },
        { provide: PreferencesService, useValue: {
          preferences: { tableDisplayedColumns: [], preferIconsOnly: false }, savePreferences: () => {},
        } },
        { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
      ],
    }).compileComponents();
  });

  it('shows one row per release, with its jails and sizes, and no actions column', fakeAsync(() => {
    const fixture = TestBed.createComponent(EntityTableComponent);
    const table = fixture.componentInstance;
    const conf = new BastilleReleasesComponent(
      TestBed.inject(WebSocketService), TestBed.inject(Router), TestBed.inject(TranslateService),
    );
    table.title = conf.title;
    table.conf = conf;
    const root = fixture.nativeElement as HTMLElement;
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick(2100);
    fixture.detectChanges();
    table.fixedTableHight = true;
    table.tableHeight = 350;
    fixture.detectChanges();
    table.table.recalculate();
    tick(32);
    fixture.detectChanges();

    // The table sorts by its first column, so 15.0 precedes 15.1 whatever the API order.
    const rows = Array.from(root.querySelectorAll<HTMLElement>('datatable-body-row'))
      .map((row) => row.textContent.replace(/\s+/g, ' ').trim())
      .filter((text) => text.length > 0);
    expect(rows.length).withContext(JSON.stringify(rows)).toBe(2);
    expect(rows[0]).toMatch(/^15\.0-RELEASE\s+—\s+550 MiB\s*158 MiB$/);
    expect(rows[1]).toMatch(/^15\.1-RELEASE\s+web\s+372 MiB\s*157 MiB$/);
    expect(root.querySelector('app-entity-table-actions')).toBeNull();
    expect(table.hasActions).toBeFalse();
    // The entity table builds (and never subscribes) its own queryCall observable before
    // the page replaces it; the page's own pipeline is the configuration check, then the list.
    const calls = ws.call.calls.allArgs().map((args) => args[0]);
    expect(calls.slice(-2)).withContext(JSON.stringify(calls)).toEqual(['bastille.config', 'bastille.releases']);
    fixture.destroy();
  }));
});
