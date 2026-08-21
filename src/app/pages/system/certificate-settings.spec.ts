import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { UntypedFormArray } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
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
import { SystemModule } from './system.module';
import { CertificateAuthorityAddComponent } from './ca/ca-add/ca-add.component';
import { CertificateAuthorityEditComponent } from './ca/ca-edit/ca-edit.component';
import { CertificateAuthoritySignComponent } from './ca/ca-sign/ca-sign.component';
import { CertificateAddComponent } from './certificates/certificate-add/certificate-add.component';
import { CertificateEditComponent } from './certificates/certificate-edit/certificate-edit.component';
import { CertificateAcmeAddComponent } from './certificates/certificate-acme-add/certificate-acme-add.component';
import { AcmednsFormComponent } from './acmedns/acmedns-add/acmedns-form.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class CertificateProductionStylesComponent {}

// Metadata only; empty material still distinguishes a CSR from a signed certificate.
const fixtures = {
  'certificateauthority.query': [{ id: 21, name: 'Local_CA', certificate: '', privatekey: '' }],
  'certificate.query': [{ id: 32, name: 'Web_UI_Request', CSR: '', certificate: null, privatekey: '', common: 'freecore.example.test' }],
  'certificate.country_choices': { SE: 'Sweden' },
  'certificate.ec_curve_choices': { BrainpoolP512R1: 'BrainpoolP512R1' },
  'certificate.extended_key_usage_choices': { SERVER_AUTH: 'SERVER_AUTH' },
  'certificate.profiles': { 'Review profile': { key_length: 4096, cert_extensions: { ExtendedKeyUsage: { enabled: true, usages: ['SERVER_AUTH'] } } } },
  'certificateauthority.profiles': {},
  'certificate.get_domain_names': ['freecore.example.test', '*.example.test'],
  'acme.dns.authenticator.query': [{ id: 41, name: 'Example_DNS', authenticator: 'cloudflare', attributes: { api_token: '' } }],
  'acme.dns.authenticator.authenticator_schemas': [
    { key: 'cloudflare', schema: [{ _name_: 'api_token', _private_: true, _required_: false, title: 'API Token', type: ['string', 'null'], default: null }] },
    { key: 'route53', schema: [{ _name_: 'secret_access_key', _private_: true, _required_: true, title: 'Secret Access Key', type: 'string' }] },
  ],
  'system.product_type': 'CORE', 'system.info': { license: null }, 'system.advanced.config': { advancedmode: false },
};

describe('15.2 certificate settings', () => {
  let previousVersion: string;
  let params: BehaviorSubject<Record<string, string>>;
  const ws = { call: jasmine.createSpy('call') };
  const router = { events: NEVER, navigate: jasmine.createSpy('navigate') };
  const job = { setCall: jasmine.createSpy('setCall'), submit: jasmine.createSpy('submit'), setDescription: () => {}, success: NEVER, failure: NEVER };
  const modal = { open: jasmine.createSpy('open'), closeAll: () => {} };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW');
    params = new BehaviorSubject<Record<string, string>>({});
    [ws.call, router.navigate, job.setCall, job.submit, modal.open].forEach((spy) => spy.calls.reset());
    ws.call.and.callFake((method: string) => of(structuredClone(fixtures[method] ?? {})).pipe(delay(0)));
    modal.open.and.returnValue({ componentInstance: job, close: () => {} });
    await TestBed.configureTestingModule({
      declarations: [CertificateProductionStylesComponent],
      imports: [SystemModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { params, paramMap: of(convertToParamMap({})) } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: { get: () => of({}) } },
        { provide: HttpClient, useValue: {} }, { provide: LocaleService, useValue: {} },
        { provide: DialogService, useValue: { report: () => {}, confirm: () => of(false), errorReport: () => {} } },
        { provide: AdminLayoutComponent, useValue: {} }, { provide: MatDialog, useValue: modal },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(CertificateProductionStylesComponent).detectChanges();
  });
  afterEach(() => {
    document.querySelectorAll('[data-certificate-test]').forEach((host) => host.remove());
    if (previousVersion === null) localStorage.removeItem('running_version');
    else localStorage.setItem('running_version', previousVersion);
  });
  function createPage<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    const root = fixture.nativeElement as HTMLElement;
    const host = document.createElement('div');
    host.classList.add('fc-ui'); host.setAttribute('data-certificate-test', '');
    // TestBed mounts the component on a div; retain the native selector for scoped styles.
    const page = document.createElement(component === CertificateAcmeAddComponent ? 'app-certificate-acme-add' : 'div');
    root.before(host); host.append(page); page.append(root);
    root.classList.add('ix-blue', 'fc-ui'); root.style.cssText = 'display:block;width:1000px;--fg1:rgb(220,228,232);--fg2:rgb(151,166,174)';
    fixture.detectChanges(false); tick(501); fixture.detectChanges(); tick(); fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(EntityFormComponent)).componentInstance as EntityFormComponent;
    return { fixture, root, form };
  }
  function visible(root: HTMLElement, name: string) {
    return !root.querySelector('#form_field_' + name).parentElement.hidden;
  }
  function checkNarrow(root: HTMLElement) {
    root.style.width = '320px';
    root.querySelectorAll('.fc-settings-section, mat-form-field, .buttons button').forEach((field) => {
      if (field.getBoundingClientRect().width) expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    });
  }

  it('keeps CA internal, intermediate and import fields and hides empty sections', fakeAsync(() => {
    const { fixture, root, form } = createPage(CertificateAuthorityAddComponent);
    expect(root.querySelector('h1').textContent).toBe('Certificate Authority'); // the internal development record: the object noun
    expect(visible(root, 'signedby')).toBeFalse(); expect(visible(root, 'country')).toBeTrue();
    form.formGroup.controls.create_type.setValue('CA_CREATE_INTERMEDIATE'); fixture.detectChanges();
    expect(visible(root, 'signedby')).toBeTrue(); expect(form.formGroup.controls.signedby.hasError('required')).toBeTrue();
    form.formGroup.controls.create_type.setValue('CA_CREATE_IMPORTED'); fixture.detectChanges();
    expect(visible(root, 'certificate')).toBeTrue(); expect(visible(root, 'country')).toBeFalse();
    expect(root.querySelector<HTMLElement>('.fc-settings-section.type').hidden).toBeTrue();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    checkNarrow(root); fixture.destroy();
  }));

  it('keeps all certificate modes, profile loading and extension validation', fakeAsync(() => {
    const { fixture, root, form } = createPage(CertificateAddComponent);
    const controls = form.formGroup.controls;
    controls.profiles.setValue(fixtures['certificate.profiles']['Review profile']); fixture.detectChanges();
    expect(controls.key_length.value).toBe(4096); expect(controls['ExtendedKeyUsage-usages'].value).toEqual(['SERVER_AUTH']);
    controls['ExtendedKeyUsage-usages'].setValue([]); expect(controls['ExtendedKeyUsage-usages'].hasError('required')).toBeTrue();
    controls.create_type.setValue('CERTIFICATE_CREATE_CSR'); fixture.detectChanges();
    expect(visible(root, 'signedby')).toBeFalse(); expect(visible(root, 'country')).toBeTrue();
    controls.create_type.setValue('CERTIFICATE_CREATE_IMPORTED'); fixture.detectChanges();
    expect(visible(root, 'certificate')).toBeTrue(); expect(visible(root, 'CSR')).toBeFalse();
    controls.csronsys.setValue(true); fixture.detectChanges(); expect(controls.privatekey.disabled).toBeTrue();
    controls.create_type.setValue('CERTIFICATE_CREATE_IMPORTED_CSR'); fixture.detectChanges();
    expect(visible(root, 'CSR')).toBeTrue(); expect(visible(root, 'certificate')).toBeFalse();
    expect(visible(root, 'country')).toBeFalse(); checkNarrow(root); fixture.destroy();
  }));

  it('keeps CA material read-only and updates only its identifier', fakeAsync(() => {
    params.next({ pk: '21' });
    const { fixture, root, form } = createPage(CertificateAuthorityEditComponent);
    ['certificate', 'privatekey'].forEach((name) => expect(root.querySelector<HTMLTextAreaElement>('#' + name + ' textarea').readOnly).toBeTrue());
    form.formGroup.controls.name.setValue('Renamed_CA'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('certificateauthority.update', [21, { name: 'Renamed_CA' }]);
    checkNarrow(root); fixture.destroy();
  }));

  it('keeps unsigned CSR selection and CA targeting in the signing form', fakeAsync(() => {
    params.next({ pk: '21' });
    const { fixture, root, form } = createPage(CertificateAuthoritySignComponent);
    expect(ws.call).toHaveBeenCalledWith('certificate.query', [[['CSR', '!=', null]]]);
    expect(form.formGroup.controls.csr_cert_id.hasError('required')).toBeTrue();
    form.formGroup.patchValue({ name: 'Signed_request', csr_cert_id: 32 }); fixture.detectChanges();
    const payload = { ...form.formGroup.value }; fixture.componentInstance.beforeSubmit(payload);
    expect(payload.ca_id).toBe(21); expect(payload.csr_cert_id).toBe(32);
    expect(visible(root, 'ca_id')).toBeFalse(); checkNarrow(root); fixture.destroy();
  }));

  it('keeps CSR views read-only and sends only the renamed identifier to the existing job', fakeAsync(() => {
    params.next({ pk: '32' });
    const { fixture, root, form } = createPage(CertificateEditComponent);
    expect(visible(root, 'CSR')).toBeTrue(); expect(visible(root, 'certificate')).toBeFalse();
    ['CSR', 'privatekey'].forEach((name) => expect(root.querySelector<HTMLTextAreaElement>('#' + name + ' textarea').readOnly).toBeTrue());
    form.formGroup.controls.name.setValue('Renamed_request'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(job.setCall).toHaveBeenCalledWith('certificate.update', [32, { name: 'Renamed_request' }]);
    expect(job.submit).toHaveBeenCalledTimes(1); checkNarrow(root); fixture.destroy();
  }));

  it('shows the certificate instead of CSR for a signed certificate', fakeAsync(() => {
    ws.call.and.callFake((method: string) => of(structuredClone(method === 'certificate.query'
      ? [{ id: 31, name: 'Web_UI', CSR: null, certificate: '', privatekey: '' }]
      : fixtures[method] ?? {})).pipe(delay(0)));
    params.next({ pk: '31' });
    const { fixture, root } = createPage(CertificateEditComponent);
    expect(visible(root, 'certificate')).toBeTrue(); expect(visible(root, 'CSR')).toBeFalse();
    expect(root.querySelector<HTMLTextAreaElement>('#certificate textarea').readOnly).toBeTrue();
    fixture.destroy();
  }));

  it('keeps required DNS mappings, renewal days and terms in the ACME job payload', fakeAsync(() => {
    params.next({ pk: '32' });
    const { fixture, root, form } = createPage(CertificateAcmeAddComponent);
    const domains = form.formGroup.controls.domains as UntypedFormArray;
    expect(domains.length).toBe(2); expect(root.querySelectorAll('#domains .form-list-item-layout').length).toBe(2);
    expect(domains.at(0).get('authenticators').hasError('required')).toBeTrue();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    domains.controls.forEach((control) => control.get('authenticators').setValue(41));
    form.formGroup.patchValue({ identifier: 'ACME_UI', tos: true, renew_days: 15 }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick();
    expect(job.setCall).toHaveBeenCalledWith('certificate.create', [jasmine.objectContaining({ name: 'ACME_UI', csr_id: 32, create_type: 'CERTIFICATE_CREATE_ACME', tos: true, renew_days: 15, dns_mapping: { 'freecore.example.test': 41, '*.example.test': 41 } })]);
    expect(job.setCall.calls.mostRecent().args[1][0].domains).toBeUndefined();
    const rows = root.querySelectorAll('#domains .form-list-item-layout');
    rows.forEach((row) => expect(getComputedStyle(row).gridTemplateColumns.split(' ').length).toBe(2));
    checkNarrow(root); rows.forEach((row) => expect(getComputedStyle(row).gridTemplateColumns.split(' ').length).toBe(1));
    fixture.destroy();
  }));

  it('keeps schema-driven DNS provider changes, masked fields and the edit provider lock', fakeAsync(() => {
    const { fixture, root, form } = createPage(AcmednsFormComponent);
    expect(visible(root, 'secret_access_key-route53')).toBeTrue();
    expect(root.querySelector('#secret_access_key-route53 input.password-field')).not.toBeNull();
    form.formGroup.controls.authenticator.setValue('cloudflare'); fixture.detectChanges();
    expect(visible(root, 'secret_access_key-route53')).toBeFalse(); expect(visible(root, 'api_token-cloudflare')).toBeTrue();
    expect(root.querySelectorAll('.fc-settings-section:not([hidden])').length).toBe(2);
    checkNarrow(root); fixture.destroy();
    params.next({ pk: '41' });
    const edit = createPage(AcmednsFormComponent);
    expect(edit.form.formGroup.controls.authenticator.disabled).toBeTrue();
    expect(edit.form.formGroup.controls.name.value).toBe('Example_DNS');
    expect(edit.form.formGroup.controls.authenticator.value).toBe('cloudflare');
    expect(ws.call).toHaveBeenCalledWith('acme.dns.authenticator.query', [[['id', '=', 41]]]);
    edit.fixture.destroy();
  }));
});
