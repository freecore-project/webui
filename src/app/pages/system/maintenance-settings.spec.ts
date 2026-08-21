import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, StorageService, SystemGeneralService, WebSocketService } from 'app/services';
import { LocaleService } from 'app/services/locale.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityFormComponent } from '../common/entity/entity-form/entity-form.component';
import { SystemModule } from './system.module';
import { BootEnvironmentCreateComponent } from './bootenv/bootenv-create/bootenv-create.component';
import { BootEnvironmentCloneComponent } from './bootenv/bootenv-clone/bootenv-clone.component';
import { BootEnvironmentRenameComponent } from './bootenv/bootenv-rename/bootenv-rename.component';
import { BootEnvAttachFormComponent } from './bootenv/bootenv-attach/bootenv-attach-form.component';
import { BootEnvReplaceFormComponent } from './bootenv/bootenv-replace/bootenv-replace-form.component';
import { BootStatusListComponent } from './bootenv/bootenv-status/bootenv-status.component';
import { BootEnvironmentListComponent } from './bootenv/bootenv-list/bootenv-list.component';
import { UpdateComponent } from './update/update.component';
import { SupportComponent } from './support/support.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class MaintenanceProductionStylesComponent {}

const bootState = {
  name: 'freecore-boot', status: 'ONLINE', scan: { end_time: { $date: 1788739800000 } },
  properties: { health: { value: 'ONLINE' }, size: { parsed: 64 }, allocated: { parsed: 8 }, capacity: { value: '12%' } },
  groups: { data: [{ type: 'disk', path: 'ada0p2', status: 'ONLINE', stats: { read_errors: 0, write_errors: 0, checksum_errors: 0 } }] },
};
const fixtures = {
  'boot.get_state': bootState,
  'disk.get_unused': [{ name: 'da4', size: 137438953472 }],
  'system.advanced.config': { advancedmode: false, boot_scrub: 7 }, 'system.product_type': 'CORE',
  'system.info': { version: 'FreeCORE-15.2-LOCAL-REVIEW', system_product: 'Local UI review', physmem: 34359738368, system_serial: '', license: null },
  'update.get_auto_download': true,
  'update.get_trains': { current: 'FreeCORE-15.2-LOCAL-REVIEW', trains: { 'FreeCORE-15.2-LOCAL-REVIEW': { description: 'Local review [prerelease]' } } },
  'update.get_pending': [], 'core.get_jobs': [],
  'update.check_available': { status: 'AVAILABLE', version: '15.2-preview', changes: [{ operation: 'upgrade', old: { name: 'freecore-webui', version: '15.1-preview' }, new: { name: 'freecore-webui', version: '15.2-preview' } }] },
  'system.rollback.config': { origin_be: 'Review_13.3_origin', arrival_path: 'manual_update', captured_at: { $date: 1788739200000 }, closed_reason: null },
  'system.rollback.available': { available: true, reason: null },
  'system.rollback.space': { snapshot_count: 3, snapshot_bytes_lower_bound: 1073741824, origin_be_bytes_estimate: 3221225472, origin_be_pinned: true, cleanup_pending: true },
};

describe('15.2 Boot, Update and Support', () => {
  let previousVersion: string;
  let previousProduct: string;
  let previousFilesize: unknown;
  let params: BehaviorSubject<Record<string, string>>;
  const ws = { call: jasmine.createSpy('call') };
  const router = { events: NEVER, navigate: jasmine.createSpy('navigate'), url: '/system/update' };
  const dialog = { report: jasmine.createSpy('report'), confirm: jasmine.createSpy('confirm'), dialogForm: jasmine.createSpy('dialogForm'), errorReport: jasmine.createSpy('errorReport'), closeAllDialogs: () => {} };
  const job = { setCall: jasmine.createSpy('setCall'), submit: jasmine.createSpy('submit'), setDescription: () => {}, success: NEVER, failure: NEVER };
  const modal = { open: jasmine.createSpy('open'), closeAll: () => {} };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version'); previousProduct = localStorage.getItem('product_type');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW'); localStorage.setItem('product_type', 'CORE');
    previousFilesize = (window as any).filesize; (window as any).filesize = () => '128 GiB';
    params = new BehaviorSubject<Record<string, string>>({});
    [ws.call, router.navigate, dialog.report, dialog.confirm, dialog.dialogForm, dialog.errorReport, job.setCall, job.submit, modal.open].forEach((spy) => spy.calls.reset());
    dialog.confirm.and.returnValue(of(false)); dialog.report.and.returnValue(of(true)); dialog.dialogForm.and.returnValue(NEVER);
    ws.call.and.callFake((method: string) => of(structuredClone(fixtures[method] ?? {})).pipe(delay(0)));
    modal.open.and.returnValue({ componentInstance: job, close: () => {} });
    await TestBed.configureTestingModule({
      declarations: [MaintenanceProductionStylesComponent],
      imports: [SystemModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { params, paramMap: of(convertToParamMap({})) } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: { get: () => of({}) } },
        { provide: HttpClient, useValue: {} }, { provide: LocaleService, useValue: { formatDateTime: () => 'Sep 7, 2026' } },
        { provide: StorageService, useValue: { convertBytestoHumanReadable: (value) => value + ' GiB' } },
        { provide: SystemGeneralService, useValue: { updateRunning: NEVER, updateRunningNoticeSent: { emit: () => {} } } },
        { provide: DialogService, useValue: dialog }, { provide: AdminLayoutComponent, useValue: {} }, { provide: MatDialog, useValue: modal },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(MaintenanceProductionStylesComponent).detectChanges();
  });
  afterEach(() => {
    for (const [key, previous] of [['running_version', previousVersion], ['product_type', previousProduct]]) {
      if (previous === null) localStorage.removeItem(key); else localStorage.setItem(key, previous);
    }
    (window as any).filesize = previousFilesize;
  });
  function createPage<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    const root = fixture.nativeElement as HTMLElement;
    root.classList.add('ix-blue', 'fc-ui'); root.style.cssText = 'display:block;width:1000px;--fg1:rgb(220,228,232);--fg2:rgb(151,166,174)';
    fixture.detectChanges(false); tick(501); fixture.detectChanges(false); tick(); fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(EntityFormComponent))?.componentInstance as EntityFormComponent;
    return { fixture, root, form };
  }
  function button(root: HTMLElement, label: string) {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((element) => element.textContent.trim() === label);
  }
  function checkNarrow(root: HTMLElement) {
    root.style.width = '320px';
    root.querySelectorAll('mat-form-field, .buttons button, #system-update-page, .fc-system-facts, #fn-instructions').forEach((field) => {
      if (field.getBoundingClientRect().width) expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    });
  }

  it('keeps boot create and rename validation and dispatches their original payloads', fakeAsync(() => {
    const create = createPage(BootEnvironmentCreateComponent);
    expect(create.root.querySelector('h1').textContent).toBe('Boot Environment'); // the internal development record: the object noun
    expect(create.root.querySelector('#save_button').textContent.trim()).toBe('Create'); // the verb on the button
    create.form.formGroup.controls.name.setValue('invalid/name'); create.fixture.detectChanges();
    expect(create.root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    create.form.formGroup.controls.name.setValue('Before_UI_Review'); create.fixture.detectChanges();
    create.root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('bootenv.create', [{ name: 'Before_UI_Review' }]); checkNarrow(create.root); create.fixture.destroy();
    params.next({ pk: 'Previous_Review' });
    const rename = createPage(BootEnvironmentRenameComponent);
    rename.form.formGroup.controls.name.setValue('Renamed_Review'); rename.fixture.detectChanges();
    rename.root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('bootenv.update', ['Previous_Review', { name: 'Renamed_Review' }]); rename.fixture.destroy();
  }));

  it('retains the readonly clone source and original source/name payload', fakeAsync(() => {
    params.next({ pk: 'Previous_Review' });
    const { fixture, root, form } = createPage(BootEnvironmentCloneComponent);
    expect(root.querySelector<HTMLInputElement>('#source hlm-input-group input').readOnly).toBeTrue();
    form.formGroup.controls.name.setValue('Clone_Review'); fixture.detectChanges(); root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('bootenv.create', [jasmine.objectContaining({ name: 'Clone_Review', source: 'Previous_Review' })]);
    checkNarrow(root); fixture.destroy();
  }));

  it('retains disk choices, attach expansion and replacement targeting', fakeAsync(() => {
    params.next({ pk: 'ada0p2' });
    const attach = createPage(BootEnvAttachFormComponent);
    expect(attach.fixture.componentInstance.fieldConfig[0].options).toContain(jasmine.objectContaining({ value: 'da4' }));
    attach.form.formGroup.patchValue({ dev: 'da4', expand: true }); attach.fixture.detectChanges();
    attach.root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(job.setCall).toHaveBeenCalledWith('boot.attach', ['da4', { expand: true }]); checkNarrow(attach.root); attach.fixture.destroy();
    const replace = createPage(BootEnvReplaceFormComponent);
    replace.form.formGroup.controls.dev.setValue('da4'); replace.fixture.detectChanges(); replace.root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('boot.replace', ['ada0p2', 'da4']); replace.fixture.destroy();
  }));

  it('retains boot topology, health/error states and single-disk versus mirror actions', fakeAsync(() => {
    const { fixture, root } = createPage(BootStatusListComponent);
    expect(root.querySelector('h1').textContent).toBe('Boot Pool Status'); expect(root.textContent).toContain('Healthy');
    const instance = fixture.componentInstance;
    expect(instance.treeTableConfig.tableData[0].children[0].data.actions.map((action) => action.label)).toEqual(['Attach', 'Replace']);
    const degraded = instance.parseData({ type: 'disk', path: 'ada1p2', status: 'DEGRADED', stats: { read_errors: 1 } }, 'data', { type: 'mirror' });
    expect(degraded.status).toBe('DEGRADED'); expect(degraded.read).toBe(1); expect(degraded.actions.map((action) => action.label)).toEqual(['Detach', 'Replace']);
    root.style.width = '320px'; fixture.detectChanges();
    const table = root.querySelector<HTMLElement>('.entity-tree-table__wrapper'); expect(getComputedStyle(table).overflowX).toBe('auto');
    fixture.destroy();
  }));

  it('retains boot active/delete/keep gates and confirmations', fakeAsync(() => {
    const instance = new BootEnvironmentListComponent(TestBed.inject(RestService), router as any, ws as any, dialog as any, TestBed.inject(AppLoaderService), TestBed.inject(StorageService), TestBed.inject(LocaleService));
    instance.preInit(); tick(); expect(instance.condition).toBe('Healthy');
    expect(instance.rowValue({ active: 'NR' }, 'active')).toBe('Now/Reboot');
    expect(instance.getActions({ active: 'Now/Reboot', keep: true }).map((action) => action.label)).toEqual(['Clone', 'Rename', 'Unkeep']);
    expect(instance.getSelectedNames([{ id: 'active', active: 'NR' }, { id: 'previous', active: '-' }])).toEqual([['previous']]);
    instance.doActivate('previous'); instance.toggleKeep('previous', false); instance.scrub(); tick();
    expect(dialog.confirm).toHaveBeenCalledTimes(3);
    expect(ws.call.calls.allArgs().some(([method]) => ['bootenv.activate', 'bootenv.set_attribute', 'boot.scrub'].includes(method))).toBeFalse();
    instance.getAddActions()[0].onClick(); tick();
    const settings = dialog.dialogForm.calls.mostRecent().args[0];
    settings.customSubmit({ formValue: { new_scrub_interval: 0 } }); tick();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'boot.set_scrub_interval')).toBeFalse();
  }));

  it('renders update package, download, pending and running states without losing controls', fakeAsync(() => {
    const { fixture, root } = createPage(UpdateComponent);
    expect(root.querySelector('h1').textContent).toBe('Update'); expect(root.textContent).toContain('freecore-webui-15.1-preview -> freecore-webui-15.2-preview');
    expect(button(root, 'Download Updates')).toBeDefined(); expect(button(root, 'Apply Pending update')).toBeUndefined();
    fixture.componentInstance.update_downloaded = true; fixture.detectChanges(); expect(button(root, 'Apply Pending update')).toBeDefined();
    fixture.componentInstance.status = 'REBOOT_REQUIRED'; fixture.detectChanges(); expect(button(root, 'Download Updates').disabled).toBeTrue();
    expect(root.textContent).toContain('An update is already applied.');
    fixture.componentInstance.isUpdateRunning = true; fixture.detectChanges(); expect(root.querySelector('#button-card')).toBeNull(); expect(root.querySelector('#update-in-progress-card')).not.toBeNull();
    checkNarrow(root); fixture.destroy();
  }));

  it('preserves rollback return/removal/cleanup visibility and declined confirmations', fakeAsync(() => {
    const { fixture, root } = createPage(UpdateComponent);
    expect(button(root, 'Return to 13.3').disabled).toBeFalse(); expect(root.textContent).toContain('Review_13.3_origin');
    button(root, 'Return to 13.3').click(); button(root, 'Remove Captured Return').click(); tick();
    expect(dialog.confirm).toHaveBeenCalledTimes(2);
    expect(ws.call.calls.allArgs().some(([method]) => ['system.rollback.rollback', 'system.rollback.remove'].includes(method))).toBeFalse();
    const instance = fixture.componentInstance;
    instance.rollbackWindow.closed_reason = 'removed'; instance.rollbackAvailability = { available: false, reason: 'window_closed' }; fixture.detectChanges();
    expect(button(root, 'Return to 13.3')).toBeUndefined(); expect(button(root, 'Retry Cleanup')).toBeDefined();
    instance.rollbackSpace.cleanup_pending = false; fixture.detectChanges(); expect(root.querySelector('#rollback-card')).toBeNull();
    instance.rollbackSpaceError = 'Review accounting error'; fixture.detectChanges(); expect(root.querySelector('#rollback-card')).not.toBeNull();
    checkNarrow(root); fixture.destroy();
  }));

  it('keeps the manual-update configuration-backup step and accessible refresh control', fakeAsync(() => {
    const { fixture, root } = createPage(UpdateComponent);
    button(root, 'Install Manual Update File').click();
    expect(dialog.dialogForm).toHaveBeenCalledWith(fixture.componentInstance.saveConfigFormConf);
    expect(router.navigate).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('[aria-label="Refresh"]').click(); tick(); fixture.detectChanges();
    expect(ws.call).toHaveBeenCalledWith('update.check_available');
    checkNarrow(root); fixture.destroy();
  }));

  it('renders Support system facts and the existing FreeCORE tracker only', fakeAsync(() => {
    const { fixture, root } = createPage(SupportComponent);
    expect(root.querySelector('h1').textContent).toBe('Support'); expect(root.querySelectorAll('.fc-system-facts > div').length).toBe(4);
    expect(root.textContent).toContain('32 GiB'); expect(root.textContent).toContain('FreeCORE-15.2-LOCAL-REVIEW');
    expect(root.querySelector<HTMLAnchorElement>('#fn-instructions a').href).toBe('https://codeberg.org/freecore/freecore/issues');
    expect(root.querySelector('form')).toBeNull(); expect(root.querySelector('button')).toBeNull(); checkNarrow(root); fixture.destroy();
  }));
});
