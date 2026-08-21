import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, WebSocketService } from 'app/services';
import { LocaleService } from 'app/services/locale.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityFormComponent } from '../common/entity/entity-form/entity-form.component';
import { SharingModule } from './sharing.module';
import { AFPFormComponent } from './afp/afp-form';
import { WebdavFormComponent } from './webdav/webdav-form';
import { GlobalconfigurationComponent } from './iscsi/globalconfiguration';
import { PortalFormComponent } from './iscsi/portal/portal-form';
import { AuthorizedAccessFormComponent } from './iscsi/authorizedaccess/authorizedaccess-form';
import { TargetFormComponent } from './iscsi/target/target-form';
import { ExtentFormComponent } from './iscsi/extent/extent-form';
import { AssociatedTargetFormComponent } from './iscsi/associated-target/associated-target-form';
import { InitiatorFormComponent } from './iscsi/initiator/initiator-form';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class SharingProductionStylesComponent {}

const sharingFixtures = {
  'sharing.afp.query': [],
  'iscsi.global.config': { basename: 'iqn.2026-09.test.example:freecore', isns_servers: [], pool_avail_threshold: 20, alua: false },
  'iscsi.portal.query': [{ id: 1, tag: 1, comment: 'Storage', listen: [{ ip: '192.0.2.10', port: 3260 }] }],
  'iscsi.portal.listen_ip_choices': { '192.0.2.10': '192.0.2.10', '192.0.2.11': '192.0.2.11', '192.0.2.12': '192.0.2.12' },
  'iscsi.initiator.query': [{ id: 1, tag: 1, initiators: [], auth_network: [] }],
  'iscsi.auth.query': [{ id: 1, tag: 1, user: 'example-client' }],
  'iscsi.target.query': [{ id: 1, name: 'vm-storage' }],
  'iscsi.extent.query': [{ id: 1, name: 'vm-volume' }],
  'iscsi.extent.disk_choices': { 'zvol/tank/vm-volume': 'tank/vm-volume (100 GiB)' },
  'iscsi.global.sessions': [{ initiator: 'iqn.2026-09.test.example:host', initiator_addr: '192.0.2.20' }],
  'system.product_type': 'CORE', 'system.info': { license: null },
  'system.advanced.config': { advancedmode: false }, 'filesystem.listdir': [], 'pool.query': [], 'pool.dataset.query': [],
  'service.query': [{ id: 1, service: 'afp', enable: true }, { id: 2, service: 'webdav', enable: true }, { id: 3, service: 'iscsitarget', enable: false }],
};

describe('15.2 Sharing settings', () => {
  let previousVersion: string;
  const ws = { call: jasmine.createSpy('call') };
  const dialog = { report: jasmine.createSpy('report'), dialogFormWide: jasmine.createSpy('dialogFormWide'), confirm: jasmine.createSpy('confirm') };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW');
    ws.call.calls.reset(); dialog.report.calls.reset(); dialog.dialogFormWide.calls.reset(); dialog.confirm.calls.reset();
    dialog.confirm.and.returnValue(of(false));
    ws.call.and.callFake((method: string) => of(structuredClone(sharingFixtures[method] ?? {})).pipe(delay(0)));
    await TestBed.configureTestingModule({
      declarations: [SharingProductionStylesComponent],
      imports: [SharingModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { params: new BehaviorSubject({}), paramMap: of(convertToParamMap({})) } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: {} }, { provide: HttpClient, useValue: {} }, { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: dialog }, { provide: AdminLayoutComponent, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(SharingProductionStylesComponent).detectChanges();
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
  function action(root: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('.buttons button')).find((button) => button.textContent.trim() === text);
  }

  it('retains AFP setup guidance, path naming and advanced Time Machine quota values', fakeAsync(() => {
    const { fixture, root, form } = createPage(AFPFormComponent);
    expect(dialog.dialogFormWide).toHaveBeenCalled();
    expect(root.querySelector('.fc-settings-form')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.controls.path.setValue('/mnt/tank/backups'); fixture.detectChanges();
    expect(form.formGroup.controls.name.value).toBe('backups');
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(form.fieldConfig.find((field) => field.name === 'timemachine_quota').isHidden).toBeTrue();
    form.formGroup.controls.timemachine.setValue(true); fixture.detectChanges();
    form.formGroup.controls.timemachine_quota.setValue(512);
    expect(form.fieldConfig.find((field) => field.name === 'timemachine_quota').isHidden).toBeFalse();
    action(root, 'Basic Options').click(); fixture.detectChanges();
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(form.formGroup.controls.timemachine_quota.value).toBe(512);
    fixture.destroy();
  }));

  it('keeps the WebDAV ownership confirmation before sending a share create', fakeAsync(() => {
    const { fixture, root, form } = createPage(WebdavFormComponent);
    form.formGroup.patchValue({ name: 'documents', path: '/mnt/tank/documents', perm: true }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'sharing.webdav.create')).toBeFalse();
    form.formGroup.controls.perm.setValue(false); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('sharing.webdav.create', [jasmine.objectContaining({ name: 'documents', perm: false })]);
    fixture.destroy();
  }));

  it('keeps ALUA gated and asks before enabling the iSCSI service', fakeAsync(() => {
    const { fixture, root, form } = createPage(GlobalconfigurationComponent);
    expect(form.formGroup.controls.alua.disabled).toBeTrue();
    form.formGroup.controls.pool_avail_threshold.setValue(''); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('iscsi.global.update', [jasmine.objectContaining({ pool_avail_threshold: null })]);
    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'service.start')).toBeFalse();
    fixture.destroy();
  }));

  it('keeps nested portal addresses and their port together in the submitted payload', fakeAsync(() => {
    const { fixture, root, form } = createPage(PortalFormComponent);
    const listen = form.formGroup.controls.listen;
    expect(root.querySelector('.fc-settings-form')).not.toBeNull();
    listen.patchValue([{ ip: ['192.0.2.11', '192.0.2.12'], port: 3260 }]); tick(); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('iscsi.portal.create', [jasmine.objectContaining({ listen: [{ ip: '192.0.2.11', port: 3260 }, { ip: '192.0.2.12', port: 3260 }] })]);
    fixture.destroy();
  }));

  it('retains required CHAP inputs and conditional peer validation', fakeAsync(() => {
    const { fixture, root, form } = createPage(AuthorizedAccessFormComponent);
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    ['secret', 'secret_confirm', 'peersecret', 'peersecret_confirm'].forEach((name) => {
      expect(root.querySelector('#' + name + ' input.password-field')).not.toBeNull();
    });
    form.formGroup.controls.peeruser.setValue('example-peer'); fixture.detectChanges(false); fixture.detectChanges();
    expect(form.formGroup.controls.peersecret.hasError('required')).toBeTrue();
    form.formGroup.controls.peeruser.setValue(''); fixture.detectChanges(false); fixture.detectChanges();
    expect(form.formGroup.controls.peersecret.hasError('required')).toBeFalse();
    fixture.destroy();
  }));

  it('retains target group choices and the Fibre Channel display gate', fakeAsync(() => {
    const { fixture, root, form } = createPage(TargetFormComponent);
    const groups = form.fieldConfig.find((field) => field.name === 'groups').templateListField;
    expect(groups.find((field) => field.name === 'portal').options).toContain(jasmine.objectContaining({ value: 1 }));
    expect(groups.find((field) => field.name === 'initiator').options).toContain(jasmine.objectContaining({ value: 1 }));
    expect(groups.find((field) => field.name === 'auth').options).toContain(jasmine.objectContaining({ value: 1 }));
    expect(form.fieldConfig.find((field) => field.name === 'mode').isHidden).toBeTrue();
    expect(root.querySelector('.fc-settings-form')).not.toBeNull();
    fixture.destroy();
  }));

  it('keeps extent File and Device controls mutually gated without losing entered values', fakeAsync(() => {
    const { fixture, root, form } = createPage(ExtentFormComponent);
    const controls = form.formGroup.controls;
    expect(controls.type.value).toBe('DISK'); expect(controls.path.disabled).toBeTrue();
    controls.disk.setValue('zvol/tank/vm-volume'); controls.type.setValue('FILE'); fixture.detectChanges();
    expect(controls.disk.disabled).toBeTrue(); expect(controls.path.enabled).toBeTrue();
    controls.path.setValue('/mnt/tank/extent'); controls.filesize.setValue('10 GiB');
    controls.type.setValue('DISK'); fixture.detectChanges();
    expect(controls.disk.value).toBe('zvol/tank/vm-volume');
    controls.type.setValue('FILE'); fixture.detectChanges();
    expect(controls.path.value).toBe('/mnt/tank/extent'); expect(controls.filesize.value).toBe('10 GiB');
    root.style.width = '320px'; fixture.detectChanges();
    root.querySelectorAll('.fc-settings-section, .buttons, .buttons button').forEach((element) => {
      expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    });
    fixture.destroy();
  }));

  it('allows the backend to assign a LUN when the associated target field is left blank', fakeAsync(() => {
    const { fixture, root, form } = createPage(AssociatedTargetFormComponent);
    form.formGroup.patchValue({ target: 1, extent: 1, lunid: '' }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('iscsi.targetextent.create', [{ target: 1, extent: 1 }]);
    fixture.destroy();
  }));

  it('keeps connected initiators, All gating and the original create payload', fakeAsync(() => {
    const { fixture, root } = createPage(InitiatorFormComponent);
    const form = fixture.componentInstance.formGroup;
    expect(root.textContent).toContain('iqn.2026-09.test.example:host');
    // the internal development record: the pick list is kit checkboxes in a labelled group; ticking one and pressing the
    // mover copies it into Allowed Initiators through the selectedOptions shape, then clears the pick.
    const list = root.querySelector('.connected-initiators-list');
    expect(list.getAttribute('role')).toBe('group');
    expect(root.querySelector('mat-selection-list, mat-list-option')).toBeNull();
    const pick = list.querySelector<HTMLButtonElement>('button[role="checkbox"]');
    expect(list.querySelector('label.checkbox-label').textContent.trim()).toBe('iqn.2026-09.test.example:host (192.0.2.20)');
    pick.click(); fixture.detectChanges();
    expect(pick.getAttribute('aria-checked')).toBe('true');
    root.querySelector<HTMLButtonElement>('[aria-label="Add selected items to Allowed Initiators (IQN)"]').click(); fixture.detectChanges();
    expect([...form.controls.initiators.value]).toEqual(['iqn.2026-09.test.example:host']);
    expect(pick.getAttribute('aria-checked')).toBe('false');
    // the added row sits where the mat-list-item drew it: 48px, the title from a 16px lead on a 24px line,
    // the 32px remove button in the meta slot (28px before it, 16px after), no Material left
    const row = root.querySelector<HTMLElement>('li.dynamic-list');
    const title = row.querySelector<HTMLElement>('label.dynamic-list-item').getBoundingClientRect();
    const remove = row.querySelector<HTMLElement>('button').getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    expect(Math.round(rowBox.height)).toBe(48);
    expect(Math.round(title.left - rowBox.left)).toBe(16);
    expect(Math.round(title.height)).toBe(24);
    expect(Math.round(remove.width)).toBe(32);
    expect(Math.round(rowBox.right - remove.right)).toBe(16);
    expect(Math.round(remove.left - title.right)).toBe(28);
    expect(root.querySelector('mat-list, mat-list-item')).toBeNull();
    form.controls.initiators.setValue(new Set());
    form.controls.initiators.setValue(new Set(['iqn.2026-09.test.example:host']));
    form.controls.auth_network.setValue(new Set(['192.0.2.0/24']));
    form.controls.all.setValue(true); fixture.detectChanges();
    expect(form.controls.initiators.disabled).toBeTrue();
    expect(root.querySelector<HTMLButtonElement>('[ix-auto-identifier="refresh"]').disabled).toBeTrue();
    form.controls.all.setValue(false); fixture.detectChanges();
    expect(form.controls.initiators.value.size).toBe(1);
    root.querySelector<HTMLButtonElement>('button[type="submit"]').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('iscsi.initiator.create', [jasmine.objectContaining({ initiators: ['iqn.2026-09.test.example:host'], auth_network: ['192.0.2.0/24'] })]);
    expect(getComputedStyle(root.querySelector('.fc-settings-fields')).display).toBe('grid');
    fixture.destroy();
  }));
});
