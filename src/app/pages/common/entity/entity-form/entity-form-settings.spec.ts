import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ViewEncapsulation } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NEVER, of } from 'rxjs';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { CoreService } from 'app/core/services/core.service';
import { DialogService, RestService, WebSocketService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { EntityModule } from '../entity.module';
import { EntityFormComponent } from './entity-form.component';
import { EntityFormEmbeddedComponent } from './entity-form-embedded.component';

@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../assets/styles/material-reduction.css', '../../../../../assets/styles/freecore-ui.css'],
})
class SettingsProductionStylesComponent {}

describe('Reviewed settings layout with real dynamic fields', () => {
  const ws = { call: jasmine.createSpy('call') };
  beforeEach(async () => {
    ws.call.calls.reset();
    ws.call.and.callFake((method: string) => of(method === 'settings.config' ? { name: 'nas', detail: 'Retained' } : {}));
    await TestBed.configureTestingModule({
      declarations: [SettingsProductionStylesComponent],
      imports: [CommonModule, EntityModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { events: NEVER, navigate: () => {} } },
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: WebSocketService, useValue: ws },
        { provide: RestService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: AdminLayoutComponent, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {}, callStarted: NEVER, callDone: NEVER } },
        { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
      ],
    }).compileComponents();
    TestBed.createComponent(SettingsProductionStylesComponent).detectChanges();
  });

  // the internal development record: the hosted cases put the shell classes on <body>, the ladder on <html> and a
  // real <entity-form> around the fixture; tear all of it down here so a thrown expectation cannot
  // leak it into later specs (random order).
  afterEach(() => {
    document.body.classList.remove('fc-ui', 'ix-blue');
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    document.querySelectorAll('body > entity-form').forEach((host) => host.remove());
  });

  function createSettings() {
    const fixture = TestBed.createComponent(EntityFormComponent);
    fixture.componentInstance.conf = {
      settingsTitle: 'General', queryCall: 'settings.config', editCall: 'settings.update',
      fieldSets: [
        { name: 'Identity', label: true, config: [
          { type: 'input', name: 'name', placeholder: 'Name', required: true, validation: [Validators.required] },
          { type: 'input', name: 'detail', placeholder: 'Detail', isHidden: true },
          { type: 'input', name: 'warning', placeholder: 'Warning', warnings: 'An existing service will restart.' },
        ] },
        { name: 'divider', divider: true },
      ],
    };
    const root = fixture.nativeElement as HTMLElement;
    root.classList.add('ix-blue', 'fc-ui');
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges(); tick(501); fixture.detectChanges();
    return fixture;
  }

  it('keeps validity, backend submission, service gates and warnings on the real form', fakeAsync(() => {
    const fixture = createSettings();
    const form = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const save = root.querySelector<HTMLButtonElement>('#save_button');
    expect(root.querySelector('h1').textContent).toContain('General');
    expect(root.querySelectorAll('.fc-settings-section').length).toBe(1);
    expect(root.textContent).toContain('An existing service will restart.');
    form.formGroup.controls.name.setValue(''); fixture.detectChanges();
    expect(save.disabled).toBeTrue();
    form.formGroup.controls.name.setValue('nas-2'); fixture.detectChanges();
    form.conf.save_button_enabled = false; fixture.detectChanges();
    expect(save.disabled).toBeTrue();
    form.conf.save_button_enabled = true; fixture.detectChanges();
    expect(save.disabled).toBeFalse();
    save.click(); tick();
    expect(ws.call).toHaveBeenCalledWith('settings.update', [jasmine.objectContaining({ name: 'nas-2' })]);
    fixture.destroy();
  }));

  it('preserves conditional field values and keeps wide and narrow layouts inside their container', fakeAsync(() => {
    const fixture = createSettings();
    const form = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const detail = form.fieldConfig.find((field) => field.name === 'detail');
    const wrapper = root.querySelector<HTMLElement>('[id="Identity-1"]');
    expect(getComputedStyle(wrapper).display).toBe('none');
    detail.isHidden = false; fixture.detectChanges(); tick(); fixture.detectChanges();
    expect(getComputedStyle(wrapper).display).not.toBe('none');
    expect(root.querySelector<HTMLInputElement>('#detail-input').value).toBe('Retained');
    [900, 320].forEach((width) => {
      root.style.width = `${width}px`; fixture.detectChanges();
      expect(root.querySelector('.fc-settings-form').getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
      expect(root.scrollWidth).toBeLessThanOrEqual(width + 1);
    });
    fixture.destroy();
  }));

  // the internal development record: the legacy (no settingsTitle) branch of the real component -- where the
  // fieldset divider, the fallback 'divider' fieldset and the action row live. Hosted the #389
  // way (fc-ui on body, a real <entity-form> around the fixture) so the `.fc-ui entity-form`
  // shell rules -- the 8px gap, the fieldset gutter -- are in the cascade being measured.
  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg2) etc.
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--primary': '#4E93C4', '--red': '#E3625A' };

  function createLegacy(conf: Record<string, unknown>) {
    // ix-blue too: the theme's `entity-form .form-card` rules compile under `.ix-blue`, which the
    // app carries on <body>, above the <entity-form> element (the internal development record)
    document.body.classList.add('fc-ui', 'ix-blue');
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    const fixture = TestBed.createComponent(EntityFormComponent);
    // the internal development record: the flex fieldsets are the `legacyLayout` opt-out now (the ACL / unlock forms); the container is the settings one either way
    fixture.componentInstance.conf = { queryCall: 'settings.config', editCall: 'settings.update', route_success: ['x'], route_delete: ['y'], custActions: [{ id: 'adv', name: 'Advanced Options', function: () => {} }], legacyLayout: true, ...conf };
    const root = fixture.nativeElement as HTMLElement;
    const host = document.createElement('entity-form');
    root.parentNode.insertBefore(host, root);
    host.appendChild(root);
    root.classList.add('ix-blue');
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges(); tick(501); fixture.detectChanges();
    return { fixture, done: () => { fixture.destroy(); host.remove(); } };
  }

  function createEmbedded(conf: Record<string, unknown>) {
    const fixture = TestBed.createComponent(EntityFormEmbeddedComponent);
    fixture.componentInstance.conf = { queryCall: 'settings.config', editCall: 'settings.update', ...conf } as never;
    const root = fixture.nativeElement as HTMLElement;
    root.classList.add('ix-blue', 'fc-ui');
    root.style.cssText = 'display:block;width:900px';
    fixture.detectChanges(); tick(501); fixture.detectChanges();
    return fixture;
  }

  it('renders the legacy action row as div.buttons on hlmBtn, the fieldset rule as hlm-separator, the overlay as hlm-spinner (the internal development record)', fakeAsync(() => {
    const { fixture, done } = createLegacy({
      fieldSets: [
        { name: 'Identity', label: true, config: [{ type: 'input', name: 'name', placeholder: 'Name', required: true, validation: [Validators.required] }] },
        { name: 'More', label: true, divider: true, config: [{ type: 'input', name: 'detail', placeholder: 'Detail' }] },
      ],
    });
    const form = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('mat-card-actions')).toBeNull();
    expect(root.querySelector('mat-divider')).toBeNull();
    // the internal development record: the wrapper is a div carrying the box the card gave it
    expect(root.querySelector('mat-card')).toBeNull();
    const wrapper = root.querySelector<HTMLElement>('.form-card');
    expect(wrapper.tagName).toBe('DIV');
    expect(getComputedStyle(wrapper).position).toBe('relative');
    expect(getComputedStyle(wrapper).display).toBe('flex');
    expect(getComputedStyle(wrapper).fontSize).toBe('12px');
    expect(getComputedStyle(wrapper).color).toBe('rgb(151, 166, 174)');
    // the internal development record/#413: anchored at the content edge, no inset, the 1120 cap -- the settings container for every form
    expect(wrapper.classList).toContain('fc-settings-form');
    expect(getComputedStyle(root.querySelector('.mat-content')).paddingLeft).toBe('0px');
    expect(getComputedStyle(root.querySelector('.mat-content')).paddingTop).toBe('0px');
    root.style.width = '1200px'; fixture.detectChanges();
    expect(wrapper.getBoundingClientRect().width).toBe(1120);
    expect(Math.round(wrapper.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0);
    expect(root.querySelector('.fc-settings-section')).toBeNull(); // legacyLayout: the flex fieldsets
    root.style.width = '900px'; fixture.detectChanges();
    const row = root.querySelector<HTMLElement>('.buttons');
    expect(row.tagName).toBe('DIV');
    expect(getComputedStyle(row).borderTopWidth).toBe('0px'); // the internal development record: under legacyLayout the trailing divider fieldset is the rule; the section forms draw the row hairline
    expect(Math.round(row.getBoundingClientRect().width)).toBe(Math.round(row.parentElement.getBoundingClientRect().width));
    ['#save_button', '#goback_button', '[id="cust_button_Advanced Options"]', '#delete_button'].forEach((selector) => {
      const button = row.querySelector<HTMLButtonElement>(selector);
      expect(button).withContext(selector).not.toBeNull();
      expect(button.getAttribute('data-slot')).withContext(selector).toBe('button');
      expect(button.getAttribute('ix-auto')).withContext(selector).toContain('button__');
      expect(button.getBoundingClientRect().height).withContext(selector).toBe(32);
    });
    const save = row.querySelector<HTMLButtonElement>('#save_button');
    expect(save.type).toBe('submit');
    expect(getComputedStyle(save).backgroundColor).toBe('rgb(220, 227, 230)');
    // the #353 row: 8px apart, the primary flush with the row's edge (the internal development record: no row inset, no Material 1px lead)
    expect(row.querySelector('#goback_button').getBoundingClientRect().left - save.getBoundingClientRect().right).toBe(8);
    expect(save.getBoundingClientRect().left - row.getBoundingClientRect().left).toBe(0);
    form.formGroup.controls.name.setValue(''); fixture.detectChanges();
    expect(save.disabled).toBeTrue();
    expect(save.getAttribute('data-disabled')).toBe('true');
    expect(getComputedStyle(save).opacity).toBe('0.4');
    form.formGroup.controls.name.setValue('nas-2'); fixture.detectChanges();
    expect(save.disabled).toBeFalse();
    const separators = root.querySelectorAll<HTMLElement>('hlm-separator');
    expect(separators.length).toBe(1);
    expect(separators[0].getAttribute('data-slot')).toBe('separator');
    expect(separators[0].getAttribute('data-orientation')).toBe('horizontal');
    expect(separators[0].getBoundingClientRect().height).toBe(1);
    // the fieldset borrows a 16px gutter (margin-right) that its fields give back as padding;
    // the rule must end where the field boxes end, inside the row's right edge
    const fieldBox = root.querySelector<HTMLElement>('#More-0 hlm-field, #More-0 .dynamic-field');
    expect(separators[0].getBoundingClientRect().right).toBeLessThanOrEqual(row.getBoundingClientRect().right + 1);
    expect(Math.round(separators[0].getBoundingClientRect().right)).toBe(Math.round(fieldBox.getBoundingClientRect().right));
    expect(separators[0].getBoundingClientRect().left).toBe(row.getBoundingClientRect().left);
    expect(getComputedStyle(separators[0]).backgroundColor).toBe('rgb(42, 53, 61)');
    form.showSpinner = true; fixture.detectChanges();
    const spinner = root.querySelector<HTMLElement>('hlm-spinner#entity-table-spinner');
    const card = root.querySelector<HTMLElement>('.form-card').getBoundingClientRect();
    expect(spinner.getAttribute('data-slot')).toBe('spinner');
    expect(getComputedStyle(spinner).position).toBe('absolute');
    expect(getComputedStyle(spinner).fontSize).toBe('40px');
    expect(spinner.getBoundingClientRect().width).toBe(40);
    expect(Math.abs((spinner.getBoundingClientRect().left + 20) - (card.left + card.width / 2))).toBeLessThanOrEqual(1);
    // the helm spins the host on `transform`; the centring must not ride on it (no translation)
    const [, , , , tx, ty] = (getComputedStyle(spinner).transform.match(/[-\d.]+/g) || ['1', '0', '0', '1', '0', '0']).map(Number);
    expect(Math.abs(tx)).toBeLessThan(0.5);
    expect(Math.abs(ty)).toBeLessThan(0.5);
    expect(getComputedStyle(spinner).color).toBe('rgb(151, 166, 174)');
    form.showSpinner = false;
    form.error = 'Rejected. <a href="#">Docs</a>'; fixture.detectChanges();
    const error = root.querySelector<HTMLElement>('#error_message');
    expect(error.tagName).toBe('DIV');
    expect(error.classList).toContain('form-error-line');
    expect(getComputedStyle(error).color).toBe('rgb(227, 98, 90)');
    expect(getComputedStyle(error).fontSize).toBe('12px');
    expect(getComputedStyle(error.querySelector('a')).textDecorationLine).toBe('underline');
    done();
  }));

  // the internal development record: the legacyLayout opt-out (the ACL editor) keeps the flex fieldset geometry --
  // side-by-side sets on one row -- inside the settings container, and draws no second rule over
  // its trailing divider fieldset.
  it('keeps side-by-side fieldsets on one row under legacyLayout inside the settings container (the internal development record)', fakeAsync(() => {
    const { fixture, done } = createLegacy({
      fieldSets: [
        { name: 'Left', label: true, width: '50%', config: [{ type: 'input', name: 'a', placeholder: 'A' }] },
        { name: 'Right', label: true, width: '50%', config: [{ type: 'input', name: 'b', placeholder: 'B' }] },
        { name: 'divider', divider: true },
      ],
    });
    const root = fixture.nativeElement as HTMLElement;
    root.style.width = '1200px'; fixture.detectChanges();
    const card = root.querySelector<HTMLElement>('.form-card');
    expect(card.classList).toContain('fc-settings-form');
    expect(card.classList).toContain('fc-legacy-layout');
    expect(card.getBoundingClientRect().width).toBe(1120);
    expect(getComputedStyle(root.querySelector('.fieldset-container')).display).toBe('flex');
    const sets = root.querySelectorAll<HTMLElement>('.entity-form-fieldset-layout-sized');
    expect(sets.length).toBe(2);
    const left = sets[0].getBoundingClientRect();
    const right = sets[1].getBoundingClientRect();
    expect(Math.round(left.top)).toBe(Math.round(right.top)); // one row
    expect(right.left).toBeGreaterThanOrEqual(left.right - 1);
    expect(Math.round(left.width)).toBeGreaterThan(500);
    expect(root.querySelector('.fc-settings-section')).toBeNull();
    expect(root.querySelectorAll('hlm-separator').length).toBe(1); // the trailing divider set
    expect(getComputedStyle(root.querySelector('.buttons')).borderTopWidth).toBe('0px'); // no second rule under it
    done();
  }));

  it('draws the fallback divider fieldset every fieldConfig-only conf gets as one separator above the row (the internal development record)', fakeAsync(() => {
    const { fixture, done } = createLegacy({ fieldConfig: [{ type: 'input', name: 'name', placeholder: 'Name' }] });
    const root = fixture.nativeElement as HTMLElement;
    const separators = root.querySelectorAll<HTMLElement>('hlm-separator');
    const row = root.querySelector('.buttons').getBoundingClientRect();
    expect(separators.length).toBe(1);
    expect(separators[0].getBoundingClientRect().bottom).toBeLessThanOrEqual(row.top);
    expect(separators[0].getBoundingClientRect().right).toBeLessThanOrEqual(row.right + 1);
    done();
  }));

  it('renders the embedded action row on the same tiers with its status mark and leaf messages (the internal development record)', fakeAsync(() => {
    // the embedded form takes its controls from a flat fieldConfig and its layout from fieldSets
    const config = [{ type: 'input', name: 'name', placeholder: 'Name' }];
    const fixture = createEmbedded({
      goBack: true, multiStateSubmit: true, custActions: [{ id: 'new', name: 'Create New Theme', eventName: 'CreateTheme' }],
      fieldConfig: config, fieldSets: [{ name: 'Theme', label: true, config }],
    });
    const form = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('mat-card-actions')).toBeNull();
    const row = root.querySelector<HTMLElement>('.buttons');
    expect(row.tagName).toBe('DIV');
    expect(getComputedStyle(row).display).toBe('flex');
    expect(Math.round(row.getBoundingClientRect().width)).toBe(Math.round(root.querySelector('form').getBoundingClientRect().width));
    // no id on the submit: Preferences hosts two embedded forms on one page
    const submit = row.querySelector<HTMLButtonElement>('button.submit_button');
    expect(submit.id).toBe('');
    expect(submit.type).toBe('submit');
    expect(submit.disabled).toBeTrue(); // pristine form
    ['button.submit_button', '#goback_button', '[id="cust_button_Create New Theme"]'].forEach((selector) => {
      const button = row.querySelector<HTMLButtonElement>(selector);
      expect(button.getAttribute('data-slot')).withContext(selector).toBe('button');
      expect(button.getBoundingClientRect().height).withContext(selector).toBe(32);
    });
    expect(getComputedStyle(submit).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(row.querySelector('#goback_button')).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(row.querySelector('[id="cust_button_Create New Theme"]')).color).toBe('rgb(151, 166, 174)');
    expect(row.querySelector('form-status .status')).not.toBeNull();
    form.success = true; form.error = 'Nope'; fixture.detectChanges();
    expect(getComputedStyle(root.querySelector('#successfully_updated')).fontSize).toBe('12px');
    expect(getComputedStyle(root.querySelector('#successfully_updated')).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(root.querySelector('#error_message')).color).toBe('rgb(227, 98, 90)');
    fixture.destroy();
  }));

  it('anchors the settings title and form at the content edge instead of centring them (the internal development record)', fakeAsync(() => {
    // The shell rules are `.fc-ui entity-form ...`: the scope is <body> in the app and the form
    // sits in an <entity-form> element; TestBed hosts this component in a div, so mirror both.
    document.body.classList.add('fc-ui', 'ix-blue');
    const fixture = createSettings();
    const root = fixture.nativeElement as HTMLElement;
    const host = document.createElement('entity-form');
    root.parentNode.insertBefore(host, root);
    host.appendChild(root);
    root.style.width = '1600px'; fixture.detectChanges();
    const card = root.querySelector<HTMLElement>('.fc-settings-form');
    const title = root.querySelector<HTMLElement>('.fc-settings-title');
    expect(getComputedStyle(card).marginLeft).toBe('0px');
    expect(Math.round(card.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0);
    expect(card.getBoundingClientRect().width).toBe(1120); // the cap binds at a 1600 root
    // the internal development record: the div wrapper keeps the settings inset at zero and the 12px/fg2 base
    expect(card.tagName).toBe('DIV');
    expect(getComputedStyle(card.querySelector('.mat-content')).paddingLeft).toBe('0px');
    expect(getComputedStyle(card).fontSize).toBe('12px');
    if (title) { expect(getComputedStyle(title).marginLeft).toBe('0px'); }
    fixture.destroy();
    host.remove();
  }));
});
