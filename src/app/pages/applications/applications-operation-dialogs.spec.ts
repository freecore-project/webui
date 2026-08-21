import { OverlayContainer } from '@angular/cdk/overlay';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { createEnvironmentInjector, EnvironmentInjector, importProvidersFrom } from '@angular/core';
import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { BrnTabsImports } from '@spartan-ng/brain/tabs';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MaterialModule } from '../../appMaterial.module';
import { DialogService, RestService, WebSocketService } from '../../services';
import { AppLoaderService } from '../../services/app-loader/app-loader.service';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';
import { ConfirmDialog } from '../common/confirm-dialog/confirm-dialog.component';
import { EntityModule } from '../common/entity/entity.module';
import { EntityJobComponent } from '../common/entity/entity-job/entity-job.component';
import { ApplicationsComponent } from './applications.component';
import { ApplicationsStore } from './applications.store';
import { CatalogListComponent } from './catalog-list/catalog-list.component';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';
import { installedTableProviders } from './installed-applications-testing';

const installed: any = { name: 'mail', catalog: { id: 'daemonless:bichon', compose_sha256: 'a'.repeat(64), version: '1.0' } };
const detail: any = { id: installed.catalog.id, available: true, catalog_app: true,
  catalog: { compose_sha256: 'b'.repeat(64), version: '1.1' } };

describe('Applications native operation dialogs', () => {
  let rootDialog: MatDialog;
  let lazyDialog: MatDialog;
  let lazy: EnvironmentInjector;
  let root: HTMLElement;
  let component: ApplicationsComponent;
  let store: ApplicationsStore;
  let ws: any;
  let events: Subject<any>;
  let nextJobId: number;
  let snapshot: any;

  beforeEach(async () => {
    events = new Subject();
    nextJobId = 40;
    snapshot = { state: 'RUNNING' };
    ws = {
      onCloseSubject: new Subject(), subscribe: () => events, unsubscribe: () => {},
      dispatch: jasmine.createSpy('dispatch').and.callFake(() => of(++nextJobId)),
      call: (method, args) => {
        const response = {
          'applications.config': { configured: true, runtime_ready: true, pool: 'tank' },
          'applications.query': [installed], 'pool.query': [],
          'applications.catalog.details': detail,
          'core.get_jobs': [{ ...snapshot, id: nextJobId }],
        }[method];
        return response === undefined ? ws.dispatch(method, args) : of(response);
      },
    };
    await TestBed.configureTestingModule({
      declarations: [ConfirmDialog, ApplicationsComponent, CatalogListComponent, InstalledApplicationsComponent],
      imports: [FormsModule, EntityModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmLabelImports, HlmDropdownMenuImports, HlmTooltipImports, CommonDirectivesModule,
        // the internal development record/#534: the catalog list child + the helm form kit the page template compiles against
        HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmSelectImports, HlmSpinnerImports, HlmTextareaImports, HlmRadioGroupImports,
        BrnTabsImports], // the internal development record: Catalog / Installed
      providers: [...installedTableProviders(), DialogService,
        { provide: ApplicationsStore, useFactory: () => store },
        { provide: Router, useValue: { events: NEVER, url: '/applications' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } }, { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} }, { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: {} }],
    }).compileComponents();
    rootDialog = TestBed.inject(MatDialog);
    lazy = createEnvironmentInjector([importProvidersFrom(MatDialogModule)], TestBed.inject(EnvironmentInjector));
    lazyDialog = lazy.get(MatDialog);
    expect(rootDialog).not.toBe(lazyDialog);
    store = new ApplicationsStore(ws, lazyDialog);
    store.config = { configured: true, runtime_ready: true } as any;
    component = new ApplicationsComponent(store, {} as any, TestBed.inject(DialogService), {} as any,
      TestBed.inject(TranslateService), { nativeElement: document.createElement('div') } as any, {} as any);
    root = document.createElement('app-root');
    root.innerHTML = '<button>Installed</button>';
    document.body.appendChild(root);
  });

  afterEach(fakeAsync(() => {
    component.ngOnDestroy();
    rootDialog.closeAll();
    flush();
    lazy.destroy();
    TestBed.inject(OverlayContainer).ngOnDestroy();
    root.remove();
    TestBed.resetTestingModule();
  }));

  it('waits for native confirmation to close before opening progress and restores page accessibility', fakeAsync(() => {
    component.reviewReplacement(installed, false);
    flush();
    expect(rootDialog.openDialogs[0].componentInstance instanceof ConfirmDialog).toBeTrue();
    rootDialog.openDialogs[0].close(true);
    expect(ws.dispatch).not.toHaveBeenCalled();
    flush();
    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.catalog.update', [{
      id: detail.id, compose_sha256: detail.catalog.compose_sha256, name: 'mail', recreate: false,
    }]);
    expect(lazyDialog.openDialogs.length).toBe(1);
    expect(lazyDialog.openDialogs[0].componentInstance instanceof EntityJobComponent).toBeTrue();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    events.next({ id: 41, fields: { state: 'SUCCESS', result: {} } });
    flush();
    expect(rootDialog.openDialogs.length).toBe(0);
    expect(root.hasAttribute('aria-hidden')).toBeFalse();
    expect(store.activeJob).toBeNull();
  }));

  it('serializes first-use Configure and Install progress dialogs', fakeAsync(() => {
    store.config = { configured: false } as any;
    store.install({ name: 'mail', ports: [], environment: [], volumes: [], restart_policy: 'always' } as any, 'tank', undefined, detail);
    flush();
    expect(ws.dispatch.calls.mostRecent().args[0]).toBe('applications.configure');
    events.next({ id: 41, fields: { state: 'SUCCESS', result: {} } });
    expect(ws.dispatch).toHaveBeenCalledTimes(1);
    flush();
    expect(ws.dispatch).toHaveBeenCalledTimes(2);
    expect(ws.dispatch.calls.mostRecent().args[0]).toBe('applications.catalog.install');
    expect(lazyDialog.openDialogs.length).toBe(1);
    events.next({ id: 42, fields: { state: 'SUCCESS', result: {} } });
    flush();
    expect(root.hasAttribute('aria-hidden')).toBeFalse();
    expect(store.activeJob).toBeNull();
  }));

  for (const state of ['FAILED', 'ABORTED']) {
    it(`shows ${state} as a native result and preserves the error after Close`, fakeAsync(() => {
      store.start(installed);
      flush();
      events.next({ id: 41, fields: { state, error: '<img src=x> Failed to start.' } });
      const ref = lazyDialog.openDialogs[0];
      ref.componentRef.changeDetectorRef.detectChanges();
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      expect(overlay.querySelector('.entity-job-dialog img')).toBeNull();
      expect(overlay.querySelector('.fc-status-brand img').getAttribute('src')).toBe('assets/images/freecore-fork-mark.svg');
      expect(overlay.textContent).toContain(state === 'ABORTED' ? 'aborted' : '<img src=x>');
      store.restart(installed);
      expect(ws.dispatch).toHaveBeenCalledTimes(1);
      ref.close();
      flush();
      expect(store.operationError).toContain(state === 'ABORTED' ? 'aborted' : 'Failed to start');
      expect(store.activeJob).toBeNull();
    }));
  }

  // the internal development record (the internal development record): the middleware's refusal names the step and the
  // applications; the page shows those words and nothing of its own.
  it('shows the unconfigure refusal verbatim and closes on success', fakeAsync(() => {
    const refusal = 'Remove the installed applications first, or unconfigure with remove_applications: mail.';
    store.unconfigure(false, true);
    flush();
    expect(ws.dispatch).toHaveBeenCalledOnceWith('applications.unconfigure', [{ remove_applications: false, keep_data: true }]);
    events.next({ id: nextJobId, fields: { state: 'FAILED', error: refusal } });
    const ref = lazyDialog.openDialogs[0];
    ref.componentRef.changeDetectorRef.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.textContent).toContain(refusal);
    expect(ref.componentInstance.showCloseButton).toBeTrue();
    ref.close();
    flush();
    expect(store.operationError).toBe(refusal);
    expect(store.activeJob).toBeNull();

    store.unconfigure(true, false);
    flush();
    expect(ws.dispatch.calls.mostRecent().args).toEqual(['applications.unconfigure', [{ remove_applications: true, keep_data: false }]]);
    // The reload after the refusal routes unknown calls through dispatch in this
    // fixture, so the second job's id is whatever the counter says now.
    events.next({ id: nextJobId, fields: { state: 'SUCCESS', result: true } });
    flush();
    expect(lazyDialog.openDialogs.length).toBe(0);
    expect(root.hasAttribute('aria-hidden')).toBeFalse();
    expect(store.activeJob).toBeNull();
  }));

  it('reconciles an already-completed job and closes its progress dialog', fakeAsync(() => {
    snapshot = { state: 'SUCCESS', result: true };
    store.restart(installed);
    flush();
    expect(rootDialog.openDialogs.length).toBe(0);
    expect(store.activeJob).toBeNull();
    expect(store.operationError).toBe('');
  }));

  it('reports actual RPC failure without leaving an unclosable progress dialog', fakeAsync(() => {
    ws.dispatch.and.returnValue(throwError(() => ({ reason: 'Permission denied.' })));
    store.restart(installed);
    flush();
    const ref = lazyDialog.openDialogs[0];
    ref.componentRef.changeDetectorRef.detectChanges();
    expect(ref.componentInstance.job.state).toBe('FAILED');
    expect(TestBed.inject(OverlayContainer).getContainerElement().textContent).toContain('Permission denied.');
    ref.close();
    flush();
    expect(store.operationError).toBe('Permission denied.');
    expect(store.activeJob).toBeNull();
  }));
  it('settles a transport disconnect when the root dialog service closes all dialogs', fakeAsync(() => {
    store.start(installed);
    flush();
    ws.onCloseSubject.next(true);
    flush();
    expect(store.operationError).toContain('Connection lost');
    expect(store.activeJob).toBeNull();
    expect(root.hasAttribute('aria-hidden')).toBeFalse();
  }));

  it('renders the retained error in the actual Applications page after the failed dialog closes', fakeAsync(() => {
    spyOn(store, 'load');
    const fixture = TestBed.createComponent(ApplicationsComponent);
    // the internal development record opens on Installed; its entity table's layout timers never settle under flush().
    fixture.componentInstance.selectedTab = 'catalog';
    fixture.detectChanges();
    store.start(installed);
    flush();
    events.next({ id: 41, fields: { state: 'FAILED', error: '<img src=x> Previous application restored.' } });
    lazyDialog.openDialogs[0].close();
    flush();
    fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('.notice.error');
    expect(notice.textContent).toContain('<img src=x> Previous application restored.');
    expect(notice.querySelector('img')).toBeNull();
    fixture.destroy();
  }));

  it('keeps tracking when navigation closes progress early and settles when the job finishes', fakeAsync(() => {
    store.start(installed);
    flush();
    lazyDialog.openDialogs[0].close();
    flush();
    expect(store.activeJob).not.toBeNull();
    events.next({ id: 41, fields: { state: 'SUCCESS', result: true } });
    flush();
    expect(store.activeJob).toBeNull();
    expect(store.operationError).toBe('');
    expect(root.hasAttribute('aria-hidden')).toBeFalse();
  }));

});
