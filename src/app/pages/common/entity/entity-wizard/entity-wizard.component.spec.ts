import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, WebSocketService } from 'app/services';
import { DocsService } from 'app/services/docs.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityModule } from '../entity.module';
import { EntityUtils } from '../utils';
import { EntityWizardComponent } from './entity-wizard.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../assets/styles/material-reduction.css', '../../../../../assets/styles/freecore-ui.css'],
})
class WizardProductionStylesComponent {}

// a real <entity-wizard> host element: the help popover keys on `.form-card` being its direct child
@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-wizard [conf]="conf"></entity-wizard>',
})
class WizardHostComponent {
  conf: any;
}

// the internal development record: the REAL wizard engine on a two-step + summary conf, hosted the #397 way
// (fc-ui + ix-blue on <body>, the ladder on <html>) so the shell rules -- the 960 cap, the 16px
// inset, the 12px base, the action row -- are in the cascade being measured.
describe('EntityWizard shell (the internal development record)', () => {
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--primary': '#4E93C4', '--red': '#E3625A' };
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const line = 'rgb(42, 53, 61)';
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    navigate = jasmine.createSpy('navigate');
    await TestBed.configureTestingModule({
      declarations: [WizardProductionStylesComponent, WizardHostComponent],
      imports: [CommonModule, EntityModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate } },
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: WebSocketService, useValue: { call: () => of({}), job: () => of({}) } },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: DocsService, useValue: { docReplace: (message: string) => message, getDocs: () => of('') } }, // the field help pipe (no running_version in karma)
        { provide: AdminLayoutComponent, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(WizardProductionStylesComponent).detectChanges();
    document.body.classList.add('fc-ui', 'ix-blue');
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  });

  afterEach(() => {
    document.body.classList.remove('fc-ui', 'ix-blue');
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
  });

  function render(extra: Record<string, unknown> = {}): { fixture: ComponentFixture<WizardHostComponent>; root: HTMLElement; wizard: EntityWizardComponent; submit: jasmine.Spy; advanced: jasmine.Spy } {
    const submit = jasmine.createSpy('customSubmit');
    const advanced = jasmine.createSpy('advanced');
    const fixture = TestBed.createComponent(WizardHostComponent);
    fixture.componentInstance.conf = {
      isLinear: true,
      route_success: ['jails'],
      summary: {},
      summary_title: 'Jail Summary',
      wizardConfig: [
        { label: 'Name Jail', fieldConfig: [
          { type: 'input', name: 'uuid', placeholder: 'Name', tooltip: 'The jail name.', required: true, validation: [Validators.required] },
        ] },
        { label: 'Networking', fieldConfig: [
          { type: 'input', name: 'ip4_addr', placeholder: 'IPv4 Address' },
        ] },
      ],
      custActions: [{ id: 'advanced_add', name: 'Advanced Jail Creation', function: advanced }],
      isCustActionVisible: (id: string, stepIndex: number) => stepIndex === 0,
      customSubmit: submit,
      afterInit(wizard: EntityWizardComponent) {
        wizard.formArray.get([0]).get('uuid').valueChanges.subscribe((value: string) => { this.summary['Jail Name'] = value; });
      },
      ...extra,
    };
    const root = fixture.nativeElement as HTMLElement;
    root.style.cssText = 'display:block;width:1200px';
    fixture.detectChanges();
    tick(501);
    fixture.detectChanges();
    const wizard = fixture.debugElement.query((el) => el.componentInstance instanceof EntityWizardComponent).componentInstance as EntityWizardComponent;
    return { fixture, root, wizard, submit, advanced };
  }

  function finish(fixture: ComponentFixture<unknown>): void {
    fixture.destroy();
    tick(500);
  }

  it('sits like a form: div.form-card as the direct child of <entity-wizard> under the page h1, 1120 anchored at the content edge, no inset, no Material', fakeAsync(() => {
    const { fixture, root } = render({ settingsTitle: 'Jail' });
    // the internal development record: the engine renders the page's h1 from the conf, in the settings voice
    const title = root.querySelector<HTMLElement>('entity-wizard > h1.fc-settings-title');
    expect(title.textContent.trim()).toBe('Jail');
    expect(getComputedStyle(title).fontSize).toBe('27px');
    expect(Math.round(title.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0);
    const host = root.querySelector<HTMLElement>('entity-wizard');
    const card = root.querySelector<HTMLElement>('.form-card');
    expect(card.tagName).toBe('DIV');
    expect(card.parentElement).toBe(host); // the help popover keys on this
    expect(getComputedStyle(card).position).toBe('relative');
    expect(getComputedStyle(card).display).toBe('flex');
    expect(getComputedStyle(card).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(card).borderTopWidth).toBe('0px');
    expect(getComputedStyle(card).fontSize).toBe('12px');
    expect(getComputedStyle(card).color).toBe(fg2);
    expect(card.getBoundingClientRect().width).toBe(1120); // the internal development record: the form's cap
    expect(Math.round(card.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0); // the internal development record
    expect(getComputedStyle(card.querySelector('.mat-content')).paddingLeft).toBe('0px');
    expect(getComputedStyle(card.querySelector('.mat-content')).paddingTop).toBe('0px');
    expect(Math.round(card.getBoundingClientRect().top - title.getBoundingClientRect().bottom)).toBe(30); // the h1's 30px lead
    expect(root.querySelector('mat-card, mat-horizontal-stepper, mat-step, mat-card-actions, mat-divider, mat-spinner, .mat-mdc-button')).toBeNull();
    expect(root.querySelector('fc-stepper')).not.toBeNull();
    finish(fixture);
  }));

  it('draws the three steps (the two configured + Confirm Options) on the stepper header and renders every panel', fakeAsync(() => {
    const { fixture, root } = render();
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.fc-step-header'));
    expect(tabs.map((t) => t.querySelector('.fc-step-label').textContent.trim())).toEqual(['Name Jail', 'Networking', 'Confirm Options']);
    expect(tabs.map((t) => t.getAttribute('data-state'))).toEqual(['selected', 'upcoming', 'upcoming']);
    expect(root.querySelector<HTMLElement>('.fc-stepper-header').getBoundingClientRect().height).toBe(56);
    const panels = Array.from(root.querySelectorAll<HTMLElement>('.fc-step-panel'));
    expect(panels.map((p) => p.hasAttribute('inert'))).toEqual([false, true, true]);
    expect(panels.map((p) => getComputedStyle(p).visibility)).toEqual(['visible', 'hidden', 'hidden']);
    expect(root.querySelector('#dynamicField_ip4_addr')).not.toBeNull(); // the other step's field is in the DOM (Material parity)
    expect(root.querySelector('#uuid-input')).not.toBeNull(); // (dynamicField inserts the field AFTER its anchor div)
    finish(fixture);
  }));

  it('renders the action rows on the #353 tiers with the ids and ix-auto hooks, the custom action on step 0 only', fakeAsync(() => {
    const { fixture, root, advanced } = render();
    const row0 = root.querySelectorAll<HTMLElement>('.wizard-action')[0];
    expect(row0.tagName).toBe('DIV');
    expect(getComputedStyle(row0).display).toBe('flex');
    expect(getComputedStyle(row0).borderTopWidth).toBe('1px');
    expect(getComputedStyle(row0).borderTopColor).toBe(line);
    expect(getComputedStyle(row0).paddingTop).toBe('20px');
    expect(getComputedStyle(row0).columnGap).toBe('8px');
    const cancel = root.querySelector<HTMLButtonElement>('#cancel_button_0');
    const next = root.querySelector<HTMLButtonElement>('#goforward_button_0');
    const advancedButton = root.querySelector<HTMLButtonElement>('[id="cust_button_Advanced Jail Creation"]');
    expect(root.querySelector('#goback_button_0')).toBeNull();
    expect(Array.from(row0.querySelectorAll('button')).map((b) => b.id)).toEqual(['cancel_button_0', 'goforward_button_0', 'cust_button_Advanced Jail Creation']); // order as before
    [cancel, next, advancedButton].forEach((b) => {
      expect(b.type).toBe('button');
      expect(b.getBoundingClientRect().height).toBe(32);
      expect(getComputedStyle(b).fontSize).toBe('13px');
    });
    // Next = the one primary (fg1 slab), Cancel = outline, the custom action = ghost
    expect(getComputedStyle(next).backgroundColor).toBe(fg1);
    expect(getComputedStyle(next).color).toBe('rgb(11, 15, 19)');
    expect(getComputedStyle(cancel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cancel).borderTopColor).toBe(line);
    expect(getComputedStyle(advancedButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(advancedButton).borderTopColor).toBe('rgba(0, 0, 0, 0)'); // ghost: no hairline
    expect(getComputedStyle(advancedButton).color).toBe(fg2);
    expect(Math.round(cancel.getBoundingClientRect().left - root.querySelector('.form-card').getBoundingClientRect().left)).toBe(0); // the internal development record: no inset, no row inset, as the form's
    expect(cancel.getAttribute('ix-auto')).toBe('button__CANCEL_Name Jail');
    expect(next.getAttribute('ix-auto')).toBe('button__NEXT_Name Jail');
    expect(advancedButton.getAttribute('ix-auto')).toBe('button__ADVANCED JAIL CREATION');
    advancedButton.click();
    expect(advanced).toHaveBeenCalled();
    cancel.click();
    expect(navigate).toHaveBeenCalledWith(['/', 'jails']);
    // step 1: Back appears, the custom action does not; the summary step carries the confirm trio
    const row1 = root.querySelectorAll<HTMLElement>('.wizard-action')[1];
    expect(Array.from(row1.querySelectorAll('button')).map((b) => b.id)).toEqual(['cancel_button_1', 'goback_button_1', 'goforward_button_1']);
    expect(root.querySelector('#goback_button_1').getAttribute('ix-auto')).toBe('button__BACK_Networking');
    const row2 = root.querySelectorAll<HTMLElement>('.wizard-action')[2];
    expect(Array.from(row2.querySelectorAll('button')).map((b) => b.id)).toEqual(['secondary_cancel_button', 'noconfirm_button', 'confirm_button']);
    expect(root.querySelector('#confirm_button').getAttribute('ix-auto')).toBe('button__SUBMIT');
    finish(fixture);
  }));

  it('gates Next on the step form under linear, walks forward and back, and submits from the summary', fakeAsync(() => {
    const { fixture, root, wizard, submit } = render();
    const panels = (): boolean[] => Array.from(root.querySelectorAll<HTMLElement>('.fc-step-panel')).map((p) => p.hasAttribute('inert'));
    const next0 = root.querySelector<HTMLButtonElement>('#goforward_button_0');
    next0.focus();
    next0.click();
    fixture.detectChanges();
    tick();
    expect(panels()).toEqual([false, true, true]); // refused: Name is required
    expect(root.querySelector<HTMLButtonElement>('#confirm_button').disabled).toBeTrue();
    wizard.formArray.get([0]).get('uuid').setValue('web');
    fixture.detectChanges();
    next0.click();
    fixture.detectChanges();
    tick();
    expect(panels()).toEqual([true, false, true]);
    expect(wizard.stepper.selectedIndex).toBe(1);
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.fc-step-header'));
    expect(tabs.map((t) => t.getAttribute('data-state'))).toEqual(['completed', 'selected', 'upcoming']);
    expect(tabs[0].querySelector('svg.fc-step-check')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('#goback_button_1').click();
    fixture.detectChanges();
    tick();
    expect(panels()).toEqual([false, true, true]);
    // the consumers' handle: the setter jumps (the error-step flow) and the getter is a number
    wizard.stepper.selectedIndex = 2;
    fixture.detectChanges();
    tick();
    expect(panels()).toEqual([true, true, false]);
    const summary = root.querySelector<HTMLElement>('.wizard-summary');
    expect(getComputedStyle(summary).fontSize).toBe('13px'); // not the 12px form base
    expect(summary.textContent).toContain('Jail Summary');
    expect(summary.textContent).toContain('Jail Name: web');
    expect(summary.textContent).toContain('Confirm these settings.');
    const confirm = root.querySelector<HTMLButtonElement>('#confirm_button');
    expect(confirm.disabled).toBeFalse();
    expect(getComputedStyle(confirm).backgroundColor).toBe(fg1);
    confirm.click();
    tick();
    expect(submit).toHaveBeenCalledWith(jasmine.objectContaining({ uuid: 'web' }));
    finish(fixture);
  }));

  it('opens a field help popover inside its container and flags it as a wizard popover', fakeAsync(() => {
    const { fixture, root } = render();
    const glyph = root.querySelector<HTMLElement>('.fc-step-panel .tooltip-icon'); // the first step's Name field (dynamicField inserts the field after its anchor)
    expect(glyph).not.toBeNull();
    glyph.click();
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    expect(glyph.closest('tooltip').querySelector('.tooltip-container.wizard')).not.toBeNull();
    expect(glyph.closest('.form-card').parentElement.tagName).toBe('ENTITY-WIZARD');
    finish(fixture);
  }));

  it('shows the loading overlay as hlm-spinner over the container and keeps Next disabled meanwhile', fakeAsync(() => {
    const { fixture, root, wizard } = render({ showSpinner: true });
    const spinner = root.querySelector<HTMLElement>('hlm-spinner#entity-spinner');
    expect(spinner).not.toBeNull();
    expect(getComputedStyle(spinner).position).toBe('absolute');
    expect(getComputedStyle(spinner).fontSize).toBe('40px');
    expect(getComputedStyle(spinner).color).toBe(fg2);
    expect(root.querySelector<HTMLButtonElement>('#goforward_button_0').disabled).toBeTrue();
    wizard.showSpinner = false;
    fixture.detectChanges();
    expect(root.querySelector('hlm-spinner')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('#goforward_button_0').disabled).toBeFalse();
    finish(fixture);
  }));

  it('renders the replication shape: fieldSets with widths, no summary, the confirm trio on the last step only', fakeAsync(() => {
    const { fixture, root } = render({
      summary: undefined,
      saveSubmitText: 'START REPLICATION',
      afterInit: () => {},
      wizardConfig: [
        { label: 'What and Where', fieldSets: [
          { name: 'source', label: false, width: '49%', config: [{ type: 'input', name: 'a', placeholder: 'A' }] },
          { name: 'target', label: false, width: '49%', config: [{ type: 'input', name: 'b', placeholder: 'B' }] },
        ] },
        { label: 'When', fieldSets: [{ name: 'general', label: false, width: '100%', config: [{ type: 'input', name: 'c', placeholder: 'C' }] }] },
      ],
    });
    const panels = Array.from(root.querySelectorAll<HTMLElement>('.fc-step-panel'));
    expect(panels.length).toBe(2);
    expect(panels[0].querySelector('#confirm_button')).toBeNull();
    expect(panels[0].querySelector('#goforward_button_0')).not.toBeNull();
    expect(panels[1].querySelector('#goforward_button_1')).toBeNull();
    expect(panels[1].querySelector('#confirm_button').getAttribute('ix-auto')).toBe('button__START REPLICATION');
    expect(panels[1].querySelector('#confirm_button').textContent.trim()).toBe('START REPLICATION');
    expect(getComputedStyle(root.querySelector('.entity-wizard-fieldset-layout-sized')).flex).toBe('1 1 calc(49% - 16px)');
    finish(fixture);
  }));

  it('renders a nested summary (the iSCSI shape) with the labelled sub-lists indented, at the control size', fakeAsync(() => {
    const { fixture, root, wizard } = render({ isLinear: false, summary: { Extent: { Name: 'e1', Type: 'Device' }, Listen: ['0.0.0.0:3260'] } });
    wizard.stepper.selectedIndex = 2;
    fixture.detectChanges();
    tick();
    const summary = root.querySelector<HTMLElement>('.wizard-summary');
    expect(summary.querySelector('label').textContent.trim()).toBe('Extent:');
    const sub = Array.from(summary.querySelectorAll<HTMLElement>('ul.wizard-ul li div')).map((d) => d.textContent.trim());
    expect(sub).toEqual(['Name: e1', 'Type: Device', '0: 0.0.0.0:3260']); // an array value nests by index (the keyvalue pipe, as before)
    expect(Array.from(summary.querySelectorAll('label')).map((l) => l.textContent.trim())).toEqual(['Extent:', 'Listen:']);
    expect(getComputedStyle(summary.querySelector('ul.wizard-ul li')).paddingInlineStart).toBe('20px');
    expect(getComputedStyle(summary).lineHeight).toBe('18px');
    finish(fixture);
  }));

  it('jumps to the step of a backend field error, the field keeping a position for the scroll (all panels are rendered)', fakeAsync(() => {
    const { fixture, root, wizard } = render();
    const conf = fixture.componentInstance.conf;
    wizard.formArray.get([0]).get('uuid').setValue('web');
    fixture.detectChanges();
    const target = document.getElementById('ip4_addr');
    expect(target).not.toBeNull(); // the other step's field host, in its hidden zero-height box
    const scroll = spyOn(target, 'scrollIntoView');
    new EntityUtils().handleWSError({ wizardConfig: conf.wizardConfig, entityWizard: wizard, dialog: { errorReport: () => {} } }, { extra: [['jail.ip4_addr', 'bad address']] });
    fixture.detectChanges();
    tick();
    expect(scroll).toHaveBeenCalled();
    expect(wizard.stepper.selectedIndex).toBe(1);
    expect(conf.wizardConfig[1].fieldConfig[0].hasErrors).toBeTrue();
    expect(Array.from(root.querySelectorAll<HTMLElement>('.fc-step-panel')).map((p) => p.hasAttribute('inert'))).toEqual([true, false, true]);
    finish(fixture);
  }));

  it('renders a custom-next wizard with the custom button on the default tier and passes the stepper to it', fakeAsync(() => {
    const customNext = jasmine.createSpy('customNext');
    const { fixture, root, wizard } = render({ customNext, summary: undefined });
    const custom = root.querySelector<HTMLButtonElement>('#custom_button_0');
    expect(custom).not.toBeNull();
    expect(root.querySelector('#goforward_button_0')).toBeNull();
    expect(custom.type).toBe('button');
    expect(getComputedStyle(custom).backgroundColor).toBe(fg1);
    expect(custom.getAttribute('ix-auto')).toBe('button__NEXT');
    custom.click();
    expect(customNext).toHaveBeenCalledWith(wizard.stepper);
    expect(typeof customNext.calls.mostRecent().args[0].selectedIndex).toBe('number');
    // without a summary the last configured step carries the confirm trio
    expect(root.querySelectorAll('.fc-step-header').length).toBe(2);
    expect(root.querySelector('#confirm_button')).not.toBeNull();
    finish(fixture);
  }));
});
