import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, WebSocketService } from 'app/services';
import { LocaleService } from 'app/services/locale.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { WebauthnService } from 'app/services/webauthn.service';
import { EntityFormComponent } from '../common/entity/entity-form/entity-form.component';
import { SystemModule } from './system.module';
import { AlertConfigComponent } from './alert/alert.component';
import { TwoFactorComponent, QRDialog } from './two-factor/two-factor.component';
import { WebauthnComponent } from './webauthn/webauthn.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class SecurityProductionStylesComponent {}

const securityFixtures = {
  'alert.list_policies': ['IMMEDIATELY', 'HOURLY', 'DAILY', 'NEVER'],
  'alert.list_categories': [
    { id: 'STORAGE', title: 'Storage', classes: [
      { id: 'VolumeStatus', title: 'Pool Status Is Not Healthy', level: 'CRITICAL' },
      { id: 'QuotaWarning', title: 'Quota Exceeded on Dataset', level: 'WARNING' },
    ] },
    { id: 'SYSTEM', title: 'System', classes: [{ id: 'HasUpdate', title: 'Update Available', level: 'INFO' }] },
  ],
  'alertclasses.config': { classes: { QuotaWarning: { policy: 'DAILY' } } },
  'auth.twofactor.config': { enabled: false, otp_digits: 6, interval: 30, window: 0, secret: '', services: { ssh: false, console: false } },
  'auth.twofactor.provisioning_uri': '',
  'auth.webauthn.config': { enabled: false },
  'auth.webauthn.credentials': [{ id: 1, name: 'Review key', created_at: { $date: 1788912000000 }, last_used: null }],
  'system.product_type': 'CORE', 'system.info': { license: null }, 'system.advanced.config': { advancedmode: false },
};

describe('15.2 System alert and authentication settings', () => {
  let previousVersion: string;
  const ws = { call: jasmine.createSpy('call') };
  const dialog = { report: jasmine.createSpy('report'), confirm: jasmine.createSpy('confirm'), dialogForm: jasmine.createSpy('dialogForm'), errorReport: jasmine.createSpy('errorReport') };
  const modal = { open: jasmine.createSpy('open') };
  const webauthn = { available: jasmine.createSpy('available'), register: jasmine.createSpy('register') };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW');
    [ws.call, dialog.report, dialog.confirm, dialog.dialogForm, dialog.errorReport, modal.open, webauthn.available, webauthn.register].forEach((spy) => spy.calls.reset());
    dialog.confirm.and.returnValue(of(false));
    ws.call.and.callFake((method: string) => of(structuredClone(securityFixtures[method] ?? {})).pipe(delay(0)));
    webauthn.available.and.returnValue(true); webauthn.register.and.returnValue(of({}));
    modal.open.and.returnValue({ close: () => {} });
    await TestBed.configureTestingModule({
      declarations: [SecurityProductionStylesComponent],
      imports: [SystemModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { params: new BehaviorSubject({}), paramMap: of(convertToParamMap({})) } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: { get: () => of({}) } }, { provide: HttpClient, useValue: {} }, { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: dialog }, { provide: AdminLayoutComponent, useValue: {} },
        { provide: MatDialog, useValue: modal }, { provide: WebauthnService, useValue: webauthn },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(SecurityProductionStylesComponent).detectChanges();
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
  function button(root: HTMLElement, label: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((element) => element.textContent.trim() === label);
  }

  it('keeps paired alert controls, category names, default markers and persisted overrides', fakeAsync(() => {
    const { fixture, root } = createPage(AlertConfigComponent);
    expect(root.querySelectorAll('.fc-alert-category').length).toBe(2);
    expect(root.querySelectorAll('.fc-alert-rule').length).toBe(3);
    root.querySelectorAll('.fc-alert-rule').forEach((row) => {
      const selects = row.querySelectorAll('hlm-select, hlm-select-multiple');
      expect(selects.length).toBe(2);
      expect(selects[0].getBoundingClientRect().top).toBeCloseTo(selects[1].getBoundingClientRect().top, 0);
      expect(selects[0].getBoundingClientRect().right).toBeLessThan(selects[1].getBoundingClientRect().left);
    });
    expect(root.querySelector('.fc-alert-rule h3').textContent).toContain('Pool Status Is Not Healthy');
    const instance = fixture.componentInstance;
    expect(instance.fieldConfig.find((field) => field.name === 'VolumeStatus_level').options).toContain(jasmine.objectContaining({ label: 'CRITICAL (Default)' }));
    expect(instance.fieldConfig.find((field) => field.name === 'QuotaWarning_policy').options.map((option) => option.value)).toEqual(['IMMEDIATELY', 'HOURLY', 'DAILY', 'NEVER']);
    expect(instance.formGroup.controls.QuotaWarning_policy.value).toBe('DAILY');
    button(root, 'Save').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('alertclasses.update', [{ classes: { QuotaWarning: { policy: 'DAILY' } } }]);
    fixture.destroy();
  }));

  it('saves only changed alert values and removes overrides when restored to defaults', fakeAsync(() => {
    const { fixture, root } = createPage(AlertConfigComponent);
    const controls = fixture.componentInstance.formGroup.controls;
    controls.QuotaWarning_policy.setValue('IMMEDIATELY'); controls.VolumeStatus_level.setValue('EMERGENCY'); controls.HasUpdate_policy.setValue('NEVER');
    fixture.detectChanges(); button(root, 'Save').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('alertclasses.update', [{ classes: { VolumeStatus: { level: 'EMERGENCY' }, HasUpdate: { policy: 'NEVER' } } }]);
    controls.VolumeStatus_level.setValue('CRITICAL'); controls.HasUpdate_policy.setValue('IMMEDIATELY');
    fixture.detectChanges(); button(root, 'Save').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('alertclasses.update', [{ classes: {} }]);
    root.style.width = '320px'; fixture.detectChanges();
    root.querySelectorAll('.fc-alert-options mat-form-field, .buttons').forEach((field) => {
      expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    });
    fixture.destroy();
  }));

  it('keeps 2FA secret fields read-only and masks them, and retains interval validation', fakeAsync(() => {
    const { fixture, root, form } = createPage(TwoFactorComponent);
    ['secret', 'uri'].forEach((name) => expect(root.querySelector<HTMLInputElement>('#' + name + ' input.password-field').readOnly).toBeTrue());
    expect(button(root, 'Show QR').disabled).toBeTrue(); expect(button(root, 'Renew Secret').disabled).toBeTrue();
    form.formGroup.controls.interval.setValue(4); fixture.detectChanges();
    expect(form.formGroup.controls.interval.hasError('min')).toBeTrue(); expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.controls.interval.setValue(60); fixture.detectChanges();
    expect(root.textContent).toContain('do not support custom intervals');
    fixture.destroy();
  }));

  it('keeps the 2FA reconfiguration confirmation and excludes displayed secrets from updates', fakeAsync(() => {
    const { fixture, root, form } = createPage(TwoFactorComponent);
    form.formGroup.controls.otp_digits.setValue(8); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'auth.twofactor.update')).toBeFalse();
    dialog.confirm.and.returnValue(of(true));
    form.formGroup.patchValue({ ssh: true, console: true }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('auth.twofactor.update', [{ otp_digits: 8, interval: 30, window: 0, enabled: false, services: { ssh: true, console: true } }]);
    expect(modal.open).toHaveBeenCalledWith(QRDialog, jasmine.objectContaining({ width: '300px' }));
    fixture.destroy();
  }));

  it('keeps 2FA enable confirmation and the renewal gate', fakeAsync(() => {
    const { fixture, root } = createPage(TwoFactorComponent);
    button(root, 'Enable Two-Factor Authentication').click(); tick();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'auth.twofactor.update')).toBeFalse();
    fixture.componentInstance.resourceTransformIncomingRestData({ ...structuredClone(securityFixtures['auth.twofactor.config']), enabled: true }); fixture.detectChanges();
    expect(button(root, 'Enable Two-Factor Authentication')).toBeUndefined();
    expect(button(root, 'Renew Secret').disabled).toBeFalse();
    button(root, 'Renew Secret').click(); tick();
    expect(ws.call.calls.allArgs().some(([method]) => method === 'auth.twofactor.renew_secret')).toBeFalse();
    root.style.width = '320px'; fixture.detectChanges();
    root.querySelectorAll('.fc-settings-section, .buttons button').forEach((field) => {
      expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    });
    fixture.destroy();
  }));

  it('retains security-key capability and TOTP requirements and an accessible delete action', fakeAsync(() => {
    webauthn.available.and.returnValue(false);
    const { fixture, root } = createPage(WebauthnComponent);
    expect(button(root, 'Add Security Key').disabled).toBeTrue(); expect(button(root, 'Enable WebAuthn').disabled).toBeTrue();
    expect(root.textContent).toContain('Security keys are unavailable on this connection');
    expect(root.querySelector('[aria-label="Delete Review key"]')).not.toBeNull();
    expect(root.textContent).toContain('Never');
    fixture.componentInstance.twoFactorEnabled = true; fixture.detectChanges();
    expect(button(root, 'Enable WebAuthn').disabled).toBeFalse();
    fixture.componentInstance.credentials = []; fixture.detectChanges();
    expect(button(root, 'Enable WebAuthn').disabled).toBeTrue(); expect(root.textContent).toContain('No security keys enrolled yet.');
    fixture.destroy();
  }));

  it('retains key enforcement and deletion confirmations before sending mutations', fakeAsync(() => {
    const { fixture, root } = createPage(WebauthnComponent);
    fixture.componentInstance.twoFactorEnabled = true; fixture.detectChanges();
    button(root, 'Enable WebAuthn').click(); tick();
    root.querySelector<HTMLButtonElement>('[aria-label="Delete Review key"]').click(); tick();
    expect(ws.call.calls.allArgs().some(([method]) => ['auth.webauthn.update', 'auth.webauthn.delete_credential'].includes(method))).toBeFalse();
    dialog.confirm.and.returnValue(of(true)); button(root, 'Enable WebAuthn').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('auth.webauthn.update', [{ enabled: true }]);
    root.querySelector<HTMLButtonElement>('[aria-label="Delete Review key"]').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('auth.webauthn.delete_credential', [1]);
    fixture.destroy();
  }));

  it('passes the named key to the registration service and preserves cancellation errors', fakeAsync(() => {
    const { fixture, root } = createPage(WebauthnComponent);
    button(root, 'Add Security Key').click();
    const conf = dialog.dialogForm.calls.mostRecent().args[0];
    expect(conf.fieldConfig[0].required).toBeTrue();
    webauthn.register.and.returnValue(throwError(() => ({ name: 'NotAllowedError' })));
    conf.customSubmit({ formValue: { name: 'Review key' }, dialogRef: { close: () => {} } }); tick();
    expect(webauthn.register).toHaveBeenCalledWith('Review key');
    expect(dialog.errorReport).toHaveBeenCalledWith('Security Key', 'The security key ceremony was cancelled or timed out.');
    root.style.width = '320px'; fixture.detectChanges();
    const region = root.querySelector<HTMLElement>('.fc-security-table');
    expect(getComputedStyle(region).overflowX).toBe('auto');
    expect(region.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    fixture.destroy();
  }));
});
