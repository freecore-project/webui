import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, JobService, RestService, WebSocketService } from 'app/services';
import { LocaleService } from 'app/services/locale.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityFormComponent } from '../common/entity/entity-form/entity-form.component';
import { EntityJobComponent } from '../common/entity/entity-job/entity-job.component';
import { StorageModule } from './storage.module';
import { VMwareSnapshotFormComponent } from './VMware-snapshot/VMware-snapshot';
import { ImportDiskComponent } from './import-disk';
import { MultipathsComponent } from './multipaths/multipaths.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class StorageProductionStylesComponent {}

const storageFixtures = {
  'vmware.query': [],
  'vmware.match_datastores_with_datasets': {
    filesystems: [{ name: 'tank/vms', description: 'VM storage' }, { name: 'tank/archive', description: 'Archive' }],
    datastores: [{ name: 'vm-storage', description: 'VM storage', filesystems: ['tank/vms'] }],
  },
  'disk.get_unused': [{ name: 'da4', partitions: [{ path: '/dev/da4p1' }] }],
  'pool.import_disk_msdosfs_locales': ['en_US.UTF-8', 'sv_SE.UTF-8'],
  'pool.import_disk_autodetect_fs_type': 'msdosfs',
  'multipath.query': [{ name: 'multipath/disk5', status: 'OPTIMAL', children: [
    { name: 'da1', status: 'PASSIVE', lun_id: '5000cca05c9e1400' },
    { name: 'da23', status: 'ACTIVE', lun_id: '5000cca05c9e1400' },
  ] }],
  'system.product_type': 'CORE', 'system.info': { license: null },
  'system.advanced.config': { advancedmode: false }, 'filesystem.listdir': [], 'pool.query': [], 'pool.dataset.query': [],
};

describe('15.2 Storage settings', () => {
  let previousVersion: string;
  const ws = { call: jasmine.createSpy('call') };
  const dialog = { report: jasmine.createSpy('report'), confirm: jasmine.createSpy('confirm') };
  const jobService = { showLogs: jasmine.createSpy('showLogs') };
  let job: { setDescription: jasmine.Spy; setCall: jasmine.Spy; submit: jasmine.Spy; success: Subject<unknown>; aborted: Subject<unknown>; failure: Subject<unknown> };
  let jobDialog: { componentInstance: typeof job; close: jasmine.Spy };
  const modal = { open: jasmine.createSpy('open') };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW');
    ws.call.calls.reset(); dialog.report.calls.reset(); dialog.confirm.calls.reset(); jobService.showLogs.calls.reset(); modal.open.calls.reset();
    dialog.confirm.and.returnValue(of(false));
    ws.call.and.callFake((method: string) => of(structuredClone(storageFixtures[method] ?? {})).pipe(delay(0)));
    job = { setDescription: jasmine.createSpy(), setCall: jasmine.createSpy(), submit: jasmine.createSpy(), success: new Subject(), aborted: new Subject(), failure: new Subject() };
    jobDialog = { componentInstance: job, close: jasmine.createSpy('close') };
    modal.open.and.returnValue(jobDialog);
    await TestBed.configureTestingModule({
      declarations: [StorageProductionStylesComponent],
      imports: [StorageModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { params: new BehaviorSubject({}), paramMap: of(convertToParamMap({})) } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: { get: () => of({}) } }, { provide: HttpClient, useValue: {} }, { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: dialog }, { provide: AdminLayoutComponent, useValue: {} },
        { provide: MatDialog, useValue: modal }, { provide: JobService, useValue: jobService },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(StorageProductionStylesComponent).detectChanges();
  });
  afterEach(() => {
    if (previousVersion === null) localStorage.removeItem('running_version');
    else localStorage.setItem('running_version', previousVersion);
  });
  function createPage<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    const root = fixture.nativeElement as HTMLElement;
    root.classList.add('ix-blue', 'fc-ui'); root.style.cssText = 'display:block;width:1000px;--fg1:rgb(220,228,232);--fg2:rgb(151,166,174)';
    fixture.detectChanges(); tick(501); fixture.detectChanges(); tick(); fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(EntityFormComponent))?.componentInstance as EntityFormComponent;
    return { fixture, root, form };
  }

  it('retains VMware discovery, automatic dataset matching and mismatch confirmation', fakeAsync(() => {
    const { fixture, root, form } = createPage(VMwareSnapshotFormComponent);
    expect(root.querySelector('#password input.password-field')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.patchValue({ hostname: 'esxi.example.test', username: 'review', password: 'local-test-only' });
    fixture.componentInstance.custActions[0].function(); tick(); fixture.detectChanges();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'vmware.match_datastores_with_datasets')).toBeTrue();
    form.formGroup.controls.datastore.setValue('vm-storage'); fixture.detectChanges();
    expect(form.formGroup.controls.filesystem.value).toBe('tank/vms');
    form.formGroup.controls.filesystem.setValue('tank/archive'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'vmware.create')).toBeFalse();
    form.formGroup.controls.filesystem.setValue('tank/vms'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('vmware.create', [jasmine.objectContaining({ datastore: 'vm-storage', filesystem: 'tank/vms' })]);
    fixture.destroy();
  }));

  it('keeps an edited VMware password blank and uses the existing update method', fakeAsync(() => {
    const { fixture, form } = createPage(VMwareSnapshotFormComponent);
    expect(fixture.componentInstance.resourceTransformIncomingRestData({ hostname: 'esxi.example.test', password: 'local-test-only' }).password).toBe('');
    form.pk = 7;
    fixture.componentInstance.customEditCall({ hostname: 'esxi.example.test', datastore: 'vm-storage' }); tick();
    expect(ws.call).toHaveBeenCalledWith('vmware.update', [7, jasmine.objectContaining({ datastore: 'vm-storage' })]);
    fixture.destroy();
  }));

  it('retains detected filesystem, conditional locale and responsive destination controls', fakeAsync(() => {
    const { fixture, root, form } = createPage(ImportDiskComponent);
    const controls = form.formGroup.controls;
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    expect(fixture.componentInstance.volume.options).toContain(jasmine.objectContaining({ value: '/dev/da4p1' }));
    controls.volume.setValue('/dev/da4p1'); tick(); fixture.detectChanges();
    expect(controls.fs_type.value).toBe('msdosfs');
    expect(fixture.componentInstance.msdosfs_locale.isHidden).toBeFalse();
    controls.msdosfs_locale.setValue('sv_SE.UTF-8'); controls.fs_type.setValue('ntfs'); fixture.detectChanges();
    expect(fixture.componentInstance.msdosfs_locale.isHidden).toBeTrue();
    controls.fs_type.setValue('msdosfs'); fixture.detectChanges();
    expect(controls.msdosfs_locale.value).toBe('sv_SE.UTF-8');
    root.style.width = '320px'; fixture.detectChanges();
    root.querySelectorAll('.fc-settings-section, .buttons, .buttons button, #box1 button, #box2, #fs_type_radiogroup').forEach((element) => {
      expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
      expect(element.getBoundingClientRect().left).toBeGreaterThanOrEqual(root.getBoundingClientRect().left);
    });
    fixture.destroy();
  }));

  it('submits the existing import job and exposes completion logs again', fakeAsync(() => {
    const { fixture, root, form } = createPage(ImportDiskComponent);
    form.formGroup.controls.volume.setValue('/dev/da4p1'); tick();
    form.formGroup.patchValue({ fs_type: 'msdosfs', msdosfs_locale: 'sv_SE.UTF-8', dst_path: '/mnt/tank/imports' }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(modal.open).toHaveBeenCalledWith(EntityJobComponent, jasmine.any(Object));
    expect(job.setCall).toHaveBeenCalledWith('pool.import_disk', ['/dev/da4p1', 'msdosfs', { locale: 'sv_SE.UTF-8' }, '/mnt/tank/imports']);
    expect(job.submit).toHaveBeenCalled();
    const result = { id: 42, state: 'SUCCESS' };
    job.success.next(result); fixture.detectChanges();
    expect(jobDialog.close).toHaveBeenCalled(); expect(form.success).toBeTrue();
    expect(jobService.showLogs).toHaveBeenCalledWith(result, 'Disk Imported: Log Summary', 'Close');
    fixture.componentInstance.custActions[0].function();
    expect(jobService.showLogs).toHaveBeenCalledWith(result, 'Logs', 'Close');
    fixture.destroy();
  }));

  it('keeps aborted import logs and omits an irrelevant locale for NTFS', fakeAsync(() => {
    const { fixture, form } = createPage(ImportDiskComponent);
    fixture.componentInstance.customSubmit({ volume: '/dev/da4p1', fs_type: 'ntfs', msdosfs_locale: 'sv_SE.UTF-8', dst_path: '/mnt/tank/imports' });
    expect(job.setCall).toHaveBeenCalledWith('pool.import_disk', ['/dev/da4p1', 'ntfs', {}, '/mnt/tank/imports']);
    const result = { id: 43, state: 'ABORTED' };
    job.aborted.next(result); fixture.detectChanges();
    expect(form.success).toBeFalse();
    expect(jobService.showLogs).toHaveBeenCalledWith(result, 'Disk Import Aborted: Log Summary', 'Close');
    fixture.componentInstance.custActions[0].function();
    expect(jobService.showLogs).toHaveBeenCalledWith(result, 'Logs', 'Close');
    fixture.destroy();
  }));

  it('retains expanded paths, raw statuses, keyboard sorting and local horizontal scrolling', fakeAsync(() => {
    const { fixture, root } = createPage(MultipathsComponent);
    expect(root.querySelectorAll('tbody tr').length).toBe(3);
    expect(root.textContent).toContain('OPTIMAL'); expect(root.textContent).toContain('PASSIVE'); expect(root.textContent).toContain('ACTIVE');
    const toggle = root.querySelector<HTMLButtonElement>('[aria-expanded="true"]');
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(root.querySelectorAll('tbody tr').length).toBe(1);
    toggle.click(); fixture.detectChanges();
    const header = root.querySelector<HTMLElement>('#theader_name');
    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); fixture.detectChanges();
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    root.style.width = '320px'; fixture.detectChanges();
    const wrapper = root.querySelector<HTMLElement>('.entity-tree-table__wrapper');
    expect(getComputedStyle(wrapper).overflowX).toBe('auto');
    expect(wrapper.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    fixture.destroy();
  }));
});
