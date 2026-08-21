import { OverlayContainer } from '@angular/cdk/overlay';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { of } from 'rxjs';
import {
  DialogService, NetworkService, RestService, TooltipsService, WebSocketService,
} from '../../../services';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { IPMIComponent } from './ipmi.component';

// the internal development record: the IPMI scope pickers -- the real component, its entity-form left unrendered
// (CUSTOM_ELEMENTS_SCHEMA) and afterInit driven with a stand-in form group, so the page's own markup is
// what is measured: no Material card or select, the form's first section, a spartan select that
// names its channels and re-queries the chosen one.
describe('IPMI scope pickers (the internal development record)', () => {
  let fixture: ComponentFixture<IPMIComponent>;
  let component: IPMIComponent;
  let overlay: OverlayContainer;
  let calls: [string, unknown][];
  let manage: HTMLButtonElement;
  const rows = [
    { channel: 1, netmask: '255.255.255.0', dhcp: false, ipaddress: '192.0.2.5', gateway: '192.0.2.1', vlan: null },
    { channel: 2, netmask: '255.255.255.0', dhcp: true, ipaddress: '192.0.2.6', gateway: '192.0.2.1', vlan: 12 },
  ];
  const ws = {
    call: (method: string, args?: unknown) => {
      calls.push([method, args]);
      if (method !== 'ipmi.query') return of(null);
      const filter = (args as unknown[][][] | undefined)?.[0]?.[0];
      return of(filter ? rows.filter((row) => row.channel === filter[2]) : rows);
    },
  };
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const items = (): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll('hlm-select-item')) as HTMLElement[];
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    calls = [];
    await TestBed.configureTestingModule({
      declarations: [IPMIComponent],
      imports: [FormsModule, TranslateModule.forRoot(), HlmFieldImports, HlmSelectImports, HlmSpinnerImports],
      providers: [
        { provide: Router, useValue: {} },
        { provide: RestService, useValue: {} },
        { provide: WebSocketService, useValue: ws },
        { provide: NetworkService, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(IPMIComponent, { set: { providers: [{ provide: TooltipsService, useValue: {} }] } }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(IPMIComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '1000px';
    fixture.detectChanges();
    // what entity-form does before afterInit: flatten the fieldsets into conf.fieldConfig, build the group,
    // render the custom action buttons (afterInit toggles Manage off the address status)
    manage = document.body.appendChild(Object.assign(document.createElement('button'), { id: 'cust_button_Manage' }));
    component.fieldConfig = component.fieldSets.reduce((all, set) => all.concat(set.config || []), []);
    const formGroup = new UntypedFormGroup(['password', 'ipaddress', 'netmask', 'gateway', 'dhcp', 'vlan']
      .reduce((controls, name) => ({ ...controls, [name]: new UntypedFormControl(null) }), {}));
    component.afterInit({ formGroup });
    await settle();
  });

  afterEach(() => {
    overlay.ngOnDestroy();
    manage.remove();
  });

  it('renders the pickers as the settings form\'s first section, not a Material card', () => {
    expect(q('mat-card, .mat-mdc-card, mat-select, mat-spinner')).toBeNull();
    const section = q('.fc-settings-form.ipmi-scope > section.fc-settings-section');
    expect(section).not.toBeNull();
    expect(section.getAttribute('aria-labelledby')).toBe('ipmi-scope-title');
    expect(q('#ipmi-scope-title').textContent.trim()).toBe('Channel');
    expect(getComputedStyle(section).display).toBe('grid');
    // non-HA: the one channel picker, labelled for assistive tech only (the section title is the visible word)
    expect(q('#ipmi_controller')).toBeNull();
    const label = q('label[for="ipmi_channel"]');
    expect(label.classList).toContain('cdk-visually-hidden');
    expect(q('button#ipmi_channel[data-slot="select-trigger"]')).not.toBeNull();
  });

  it('names the loaded channel on the trigger and re-queries the channel picked', async () => {
    expect(component.selectedValue as unknown).toBe(2);
    expect(q('button#ipmi_channel').textContent).toContain('Channel 2');
    q('button#ipmi_channel').click();
    await settle();
    expect(items().map((item) => item.textContent.trim())).toEqual(['Channel 1', 'Channel 2']);
    calls = [];
    items()[0].click();
    await settle();
    expect(calls).toContain(['ipmi.query', [[['id', '=', 1]]]]);
    expect(component.selectedValue as unknown).toBe(1);
    expect(q('button#ipmi_channel').textContent).toContain('Channel 1');
  });

  it('shows the controller picker on an HA pair, spinner until the controller is known', async () => {
    component.is_ha = true;
    component.currentControllerLabel = undefined;
    await settle();
    expect(q('label[for="ipmi_controller"]').classList).toContain('cdk-visually-hidden');
    expect(q('#ipmi_controller-spinner')).not.toBeNull();
    component.currentControllerLabel = '(A)';
    component.failoverControllerLabel = '(B)';
    await settle();
    expect(q('#ipmi_controller-spinner')).toBeNull();
    q('button#ipmi_controller').click();
    await settle();
    expect(items().map((item) => item.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      `Active: ${component.controllerName} (A)`, `Standby: ${component.controllerName} (B)`,
    ]);
  });
});
