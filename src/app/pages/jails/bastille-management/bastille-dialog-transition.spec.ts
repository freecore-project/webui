import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpClient } from '@angular/common/http';
import { Component, createEnvironmentInjector, EnvironmentInjector, importProvidersFrom } from '@angular/core';
import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RestService, WebSocketService } from '../../../services';
import { EntityJobComponent } from '../../common/entity/entity-job/entity-job.component';
import { BastilleManagementComponent } from './bastille-management.component';

// Keep real Material dialogs and their provider scopes. Only form fields are
// reduced here; submission executes each Bastille component's real callback.
@Component({ standalone: false, template: '<button (click)="submit()">Submit</button>' })
class FormDialogComponent {
  conf: any;
  formValue: any;
  constructor(public dialogRef: MatDialogRef<FormDialogComponent>) {}
  submit(): void { this.conf.customSubmit(this); }
}

const ready = { installed: true, configured: true, configuration_valid: true, enabled: true };
const jail = { name: 'web', state: 'down', release: '15.0-RELEASE', ip4_addr: '', boot: true, operable: true };
// the internal development record: Bastille Settings is the only form this page still opens; jails
// and releases are managed on the console.
const flows = [
  { name: 'Bastille Settings', method: 'bastille.configure', value: { pool: 'tank', startup_delay: 2, parallel_limit: 4 } },
];

describe('Bastille form-to-job dialog transitions', () => {
  let rootDialog: MatDialog;
  let lazyDialog: MatDialog;
  let lazyInjector: EnvironmentInjector;
  let root: HTMLElement;
  let form: MatDialogRef<FormDialogComponent>;
  let component: BastilleManagementComponent;
  let job: Subject<any>;
  let ws: any;

  beforeEach(async () => {
    job = new Subject();
    ws = {
      onCloseSubject: new Subject<boolean>(),
      subscribe: () => job.pipe(map((fields) => ({ id: 42, fields }))),
      unsubscribe: () => {},
      sub: () => of(),
      dispatch: jasmine.createSpy('dispatch').and.returnValue(of(42)),
      call: (method, args) => {
        const result = {
          'bastille.config': ready,
          'pool.query': [{ name: 'tank', status: 'ONLINE', healthy: true, is_decrypted: true }],
          'bastille.query': [{ ...jail, state: 'up' }],
          'bastille.adoption_preview': { state: 'ABSENT' },
          'core.get_jobs': [{ id: 42, state: 'RUNNING' }],
        }[method];
        return result === undefined ? ws.dispatch(method, args) : of(result);
      },
    };
    await TestBed.configureTestingModule({
      declarations: [FormDialogComponent, EntityJobComponent],
      imports: [MatDialogModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
      ],
    }).overrideComponent(EntityJobComponent, {
      set: { template: '<button (click)="dialogRef.close()">Close</button>' },
    }).compileComponents();
    rootDialog = TestBed.inject(MatDialog);
    // JailsModule imports MaterialModule into a lazy environment, whereas
    // DialogService is provided at the application root.
    lazyInjector = createEnvironmentInjector([importProvidersFrom(MatDialogModule)], TestBed.inject(EnvironmentInjector));
    lazyDialog = lazyInjector.get(MatDialog);
    expect(lazyDialog).not.toBe(rootDialog);
    expect(lazyDialog.openDialogs).toBe(rootDialog.openDialogs);
    expect(lazyInjector.get(OverlayContainer)).toBe(TestBed.inject(OverlayContainer));
    root = document.createElement('app-root');
    root.innerHTML = '<button>Actions</button>';
    document.body.appendChild(root);
  });

  afterEach(fakeAsync(() => {
    component?.ngOnDestroy();
    rootDialog.closeAll();
    flush();
    lazyInjector.destroy();
    TestBed.inject(OverlayContainer).ngOnDestroy();
    root.remove();
    component = undefined;
    TestBed.resetTestingModule();
  }));

  function openFlow(flow: typeof flows[number]): void {
    const forms: any = {
      dialogForm: (conf) => {
        form = rootDialog.open(FormDialogComponent);
        form.componentInstance.conf = conf;
        form.componentInstance.formValue = flow.value;
        conf.afterInit?.(form.componentInstance);
        return form.afterClosed();
      },
    };
    const router: any = {};
    const entity: any = { getData: () => {}, callGetFunction: () => entity.getFunction.subscribe() };
    {
      const management = new BastilleManagementComponent(ws, forms, lazyDialog, router, { instant: (key) => key } as any);
      component = management;
      management.serviceConfig = ready;
      management.entityList = entity;
      management.jails = [{ ...jail } as any];
      management.globalConfig.actions[0].onClick();
    }
    form.componentRef.changeDetectorRef.detectChanges();
    flush();
    expect(root.getAttribute('aria-hidden')).toBe('true');
  }

  for (const flow of flows) {
    it(`${flow.name} restores page accessibility after the root form and lazy job close`, fakeAsync(() => {
      openFlow(flow);
      form.componentInstance.submit();
      expect(ws.dispatch).not.toHaveBeenCalled();
      flush();
      expect(ws.dispatch).toHaveBeenCalledTimes(1);
      expect(ws.dispatch.calls.mostRecent().args[0]).toBe(flow.method);
      const jobDialog = lazyDialog.openDialogs[0];
      expect(jobDialog.componentInstance instanceof EntityJobComponent).toBeTrue();
      jobDialog.componentRef.changeDetectorRef.detectChanges();
      flush();
      expect(root.getAttribute('aria-hidden')).toBe('true');
      job.next({ state: 'SUCCESS', result: true });
      flush();
      expect(lazyDialog.openDialogs.length).toBe(0);
      expect(root.hasAttribute('aria-hidden')).toBeFalse();
    }));

    it(`${flow.name} does not start a job when the form is cancelled`, fakeAsync(() => {
      openFlow(flow);
      form.close(false);
      flush();
      expect(ws.dispatch).not.toHaveBeenCalled();
      expect(root.hasAttribute('aria-hidden')).toBeFalse();
    }));

    it(`${flow.name} does not start a job after navigation during form close`, fakeAsync(() => {
      openFlow(flow);
      form.componentInstance.submit();
      component.ngOnDestroy();
      component = undefined;
      flush();
      expect(ws.dispatch).not.toHaveBeenCalled();
      expect(root.hasAttribute('aria-hidden')).toBeFalse();
    }));

    it(`${flow.name} checks eligibility again after the form closes`, fakeAsync(() => {
      openFlow(flow);
      form.componentInstance.submit();
      if (component instanceof BastilleManagementComponent) {
        component.busy = true;
      }
      flush();
      expect(ws.dispatch).not.toHaveBeenCalled();
      expect(root.hasAttribute('aria-hidden')).toBeFalse();
    }));
  }
});
