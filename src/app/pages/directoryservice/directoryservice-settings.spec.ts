import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, WebSocketService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityFormComponent } from '../common/entity/entity-form/entity-form.component';
import { DirectoryServiceModule } from './directoryservice.module';
import { ActiveDirectoryComponent } from './activedirectory/activedirectory.component';
import { LdapComponent } from './ldap/ldap.component';
import { NISComponent } from './nis/nis.component';
import { KerberosSettingsComponent } from './kerberossettings/kerberossettings.component';
import { KerberosRealmsFormComponent } from './kerberosrealms/kerberosrealms-form/kerberosrealms-form.component';
import { IdmapFormComponent } from './idmap-form/idmap-form.component';
import { KerberosKeytabsFormComponent } from './kerberoskeytabs/kerberoskeytabs-form/kerberoskeytabs-form.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/material-reduction.css', '../../../assets/styles/freecore-ui.css'],
})
class DirectoryProductionStylesComponent {}

const directoryFixtures = {
  'activedirectory.config': { domainname: 'example.test', bindname: 'directory-admin', enable: false, kerberos_realm: null,
    kerberos_principal: '', netbiosname: 'FREECORE', netbiosalias: [], site: '', timeout: 60, dns_timeout: 10, nss_info: 'RFC2307' },
  'ldap.config': { hostname: ['ldap.example.test'], basedn: 'dc=example,dc=test', binddn: '', enable: false,
    kerberos_realm: null, kerberos_principal: '', ssl: 'OFF', certificate: null, schema: 'RFC2307', timeout: 10, dns_timeout: 10 },
  'nis.config': { domain: 'example.test', servers: ['nis.example.test'], secure_mode: false, manycast: false, enable: false },
  'kerberos.config': { appdefaults_aux: '', libdefaults_aux: '' },
  'kerberos.realm.query': [{ id: 1, realm: 'EXAMPLE.TEST', kdc: ['kdc.example.test'], admin_server: [], kpasswd_server: [] }],
  'kerberos.keytab.query': [],
  'idmap.query': [],
  'idmap.backend_options': { AD: { parameters: { schema_mode: { required: false, default: 'RFC2307' } } }, TDB: { parameters: {} }, LDAP: { parameters: { ldap_url: { required: true, default: '' } } } },
  'kerberos.keytab.kerberos_principal_choices': ['host/freecore.example.test@EXAMPLE.TEST'],
  'activedirectory.nss_info_choices': ['RFC2307'],
  'ldap.ssl_choices': ['OFF', 'ON', 'START_TLS'],
  'ldap.schema_choices': ['RFC2307', 'RFC2307BIS'],
  'certificate.query': [],
  'system.advanced.config': { advancedmode: false },
  'directoryservices.get_state': { activedirectory: 'DISABLED', ldap: 'DISABLED', nis: 'DISABLED' },
};

describe('15.2 Directory Services settings', () => {
  let previousVersion: string;
  const ws = { call: jasmine.createSpy('call') };
  const dialog = { report: jasmine.createSpy('report'), dialogForm: jasmine.createSpy('dialogForm') };
  beforeEach(async () => {
    previousVersion = localStorage.getItem('running_version');
    localStorage.setItem('running_version', 'FreeCORE-15.2-LOCAL-REVIEW');
    ws.call.calls.reset(); dialog.report.calls.reset(); dialog.dialogForm.calls.reset();
    ws.call.and.callFake((method: string) => of(structuredClone(directoryFixtures[method] ?? {})).pipe(delay(0)));
    await TestBed.configureTestingModule({
      declarations: [DirectoryProductionStylesComponent],
      imports: [CommonModule, DirectoryServiceModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: DialogService, useValue: dialog },
        { provide: AdminLayoutComponent, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(DirectoryProductionStylesComponent).detectChanges();
  });

  afterEach(() => {
    if (previousVersion === null) localStorage.removeItem('running_version');
    else localStorage.setItem('running_version', previousVersion);
  });

  function createPage<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    const root = fixture.nativeElement as HTMLElement;
    root.classList.add('ix-blue', 'fc-ui'); root.style.cssText = 'display:block;width:1000px;--fg1:rgb(220,228,232);--fg2:rgb(151,166,174)';
    fixture.detectChanges(); tick(501); fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(EntityFormComponent)).componentInstance as EntityFormComponent;
    return { fixture, root, form };
  }

  function action(root: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('.buttons button')).find((button) => button.textContent.trim() === text);
  }

  function visibleSections(root: HTMLElement): Element[] {
    return Array.from(root.querySelectorAll('.fc-settings-section')).filter((section) => getComputedStyle(section).display !== 'none');
  }

  it('keeps AD advanced sections, credential switching, Idmap and healthy-only Leave Domain gates', fakeAsync(() => {
    const { fixture, root, form } = createPage(ActiveDirectoryComponent);
    expect(visibleSections(root).length).toBe(1);
    expect(action(root, 'Leave Domain')).toBeUndefined();
    // Dynamic required directives register during child rendering; settle them before checking Save.
    form.formGroup.controls.enable.setValue(true); fixture.detectChanges(false); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.controls.enable.setValue(false); fixture.detectChanges(false); fixture.detectChanges();
    form.formGroup.controls.netbiosname.setValue(''); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.controls.netbiosname.setValue('FREECORE'); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeFalse();
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(visibleSections(root).length).toBe(5);
    expect(action(root, 'Edit Idmap')).toBeDefined();
    expect(action(root, 'Leave Domain')).toBeUndefined();
    form.formGroup.controls.kerberos_principal.setValue('host/freecore.example.test@EXAMPLE.TEST'); fixture.detectChanges();
    expect(form.formGroup.controls.bindpw.disabled).toBeTrue();
    expect(root.querySelector('#bindpw hlm-input-group input')).toBeNull();
    form.formGroup.controls.kerberos_principal.setValue(''); fixture.detectChanges();
    expect(form.formGroup.controls.bindpw.disabled).toBeFalse();
    expect(root.querySelector('#bindpw hlm-input-group input')).not.toBeNull();
    form.formGroup.controls.site.setValue('Review site');
    action(root, 'Basic Options').click(); fixture.detectChanges();
    expect(visibleSections(root).length).toBe(1);
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(form.formGroup.controls.site.value).toBe('Review site');
    fixture.componentInstance.adStatus = true; fixture.detectChanges();
    action(root, 'Leave Domain').click();
    expect(dialog.dialogForm).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Leave Domain' }));
    fixture.destroy();
  }));

  it('retains LDAP hostname values and validation while enabling and disabling the configuration', fakeAsync(() => {
    const { fixture, root, form } = createPage(LdapComponent);
    expect(visibleSections(root).length).toBe(1);
    expect(form.formGroup.controls.hostname.disabled).toBeTrue();
    // the internal development record: the chip is a badge on the ladder -- fg1 text, fg2 remove glyph. The spartan
    // tokens resolve on :root (where ThemeService writes the ladder in the app), not on this
    // fixture's root, so here they read the fence's default-theme fallback for fg1.
    expect(getComputedStyle(root.querySelector('#hostname_noreq .form-chip-row .form-chip-text')).color).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(root.querySelector('#hostname_noreq .form-chip-remove')).color).toBe('rgb(151, 166, 174)');
    form.formGroup.controls.hostname_noreq.setValue(['directory.example.test']);
    form.formGroup.controls.enable.setValue(true); fixture.detectChanges();
    expect(form.formGroup.controls.hostname.value).toEqual(['directory.example.test']);
    expect(form.formGroup.controls.hostname.enabled).toBeTrue();
    expect(form.formGroup.controls.hostname_noreq.disabled).toBeTrue();
    form.formGroup.controls.hostname.setValue([]); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    form.formGroup.controls.hostname.setValue(['second.example.test']);
    form.formGroup.controls.enable.setValue(false); fixture.detectChanges();
    expect(form.formGroup.controls.hostname_noreq.value).toEqual(['second.example.test']);
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(visibleSections(root).length).toBe(3);
    expect(root.querySelector('#ssl hlm-select')).not.toBeNull();
    expect(root.querySelector('#certificate hlm-select')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick(); fixture.detectChanges();
    const update = ws.call.calls.allArgs().find(([method]) => method === 'ldap.update');
    expect(update[1][0].hostname).toEqual(['second.example.test']);
    expect(update[1][0].hostname_noreq).toBeUndefined();
    fixture.destroy();
  }));

  it('keeps NIS update and cache actions connected to their original methods', fakeAsync(() => {
    const { fixture, root } = createPage(NISComponent);
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick(); fixture.detectChanges();
    expect(ws.call).toHaveBeenCalledWith('nis.update', [jasmine.objectContaining({ servers: ['nis.example.test'], enable: false })]);
    action(root, 'Rebuild Directory Service Cache').click(); tick();
    expect(ws.call).toHaveBeenCalledWith('directoryservices.cache_refresh');
    fixture.destroy();
  }));

  it('preserves auxiliary parameters and remains inside narrow containers', fakeAsync(() => {
    const { fixture, root, form } = createPage(KerberosSettingsComponent);
    form.formGroup.controls.libdefaults_aux.setValue('dns_lookup_kdc = true'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('#save_button').click(); tick(); fixture.detectChanges();
    expect(ws.call).toHaveBeenCalledWith('kerberos.update', [jasmine.objectContaining({ libdefaults_aux: 'dns_lookup_kdc = true' })]);
    [1000, 320].forEach((width) => {
      root.style.width = `${width}px`; fixture.detectChanges();
      // Tooltips are positioned against the viewport; check the form controls against their container.
      root.querySelectorAll('.fc-settings-section, textarea, .buttons, .buttons button').forEach((element) => {
        expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
      });
    });
    fixture.destroy();
  }));

  it('keeps realm server chips behind Advanced Options without losing their values', fakeAsync(() => {
    const { fixture, root, form } = createPage(KerberosRealmsFormComponent);
    expect(root.querySelector('h1').textContent).toContain('Kerberos Realm'); // the internal development record: the object noun
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    form.formGroup.controls.kdc.setValue(['kdc.example.test']);
    action(root, 'Basic Options').click(); fixture.detectChanges();
    expect(getComputedStyle(root.querySelector('#form_field_kdc').parentElement).display).toBe('none');
    action(root, 'Advanced Options').click(); fixture.detectChanges();
    expect(form.formGroup.controls.kdc.value).toEqual(['kdc.example.test']);
    fixture.destroy();
  }));


  it('retains Idmap backend options, default-domain restrictions and ID range validation', fakeAsync(() => {
    const { fixture, root, form } = createPage(IdmapFormComponent);
    expect(root.querySelector('h1').textContent).toContain('Idmap');
    expect(form.formGroup.controls.schema_mode.enabled).toBeTrue();
    expect(form.formGroup.controls.ldap_url.disabled).toBeTrue();
    form.formGroup.controls.idmap_backend.setValue('LDAP'); fixture.detectChanges();
    expect(form.formGroup.controls.schema_mode.disabled).toBeTrue();
    expect(form.formGroup.controls.ldap_url.enabled).toBeTrue();
    expect(form.formGroup.controls.certificate.enabled).toBeTrue();
    form.formGroup.controls.name.setValue('DS_TYPE_DEFAULT_DOMAIN'); fixture.detectChanges();
    expect(form.formGroup.controls.idmap_backend.value).toBe('TDB');
    expect(getComputedStyle(root.querySelector('#idmap_backend')).display).toBe('none');
    expect(visibleSections(root).length).toBe(1);
    form.formGroup.controls.name.setValue('custom'); fixture.detectChanges();
    expect(form.formGroup.controls.custom_name.enabled).toBeTrue();
    form.formGroup.controls.range_low.setValue(2000);
    form.formGroup.controls.range_high.setValue(1500);
    expect(form.formGroup.controls.range_high.invalid).toBeTrue();
    form.formGroup.controls.range_high.setValue(5000);
    expect(form.formGroup.controls.range_high.valid).toBeTrue();
    fixture.destroy();
  }));

  it('retains a real file input and prevents a name-only keytab submission', fakeAsync(() => {
    const { fixture, root, form } = createPage(KerberosKeytabsFormComponent);
    expect(root.querySelector('h1').textContent).toContain('Kerberos Keytab'); // the internal development record: the object noun
    expect(root.querySelector('input[type=file]')).not.toBeNull();
    form.formGroup.controls.name.setValue('Example keytab'); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('#save_button').disabled).toBeTrue();
    expect(root.querySelector('input[type=file]').closest('.fc-settings-wide')).not.toBeNull();
    fixture.destroy();
  }));
});
