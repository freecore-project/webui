import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { RestService } from '../../../../services/rest.service';
import { WebSocketService } from '../../../../services/ws.service';
import { DialogFormConfiguration } from './dialog-form-configuration.interface';
import { EntityDialogComponent } from './entity-dialog.component';

// the internal development record: the dialogForm engine on the dialog law. Opened for real through MatDialog
// into the overlay container (in scope because the shell marks <body> fc-ui), with the helm sets
// the entity module carries: the h2 title in the :1053 voice, Cancel on the outline tier, the
// custom actions on ghost, the one save verb on the default tier rightmost and disabled until the
// confirm checkbox (the #394 row from dynamic-field.css, through styleUrls) is ticked; the error
// line is the engine's 12/16 form-error-line with role=alert inside the body; no Material button
// survives in the action row. freecore-ui.css is a Karma global.
@Component({ standalone: false, template: '' })
class DialogHostComponent {}

describe('entity-dialog on the dialog law (the internal development record)', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let ref: MatDialogRef<EntityDialogComponent> | null;
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--red': '#E06C75', '--yellow': '#E5C07B' };
  const overlay = (): HTMLElement => document.querySelector('.cdk-overlay-container');
  const actions = (): HTMLButtonElement[] => Array.from(overlay().querySelectorAll('.mat-mdc-dialog-actions button:not([role="checkbox"])'));
  const classes = (el: Element): string[] => Array.from(el.classList);

  const open = async (conf: DialogFormConfiguration): Promise<EntityDialogComponent> => {
    ref = TestBed.inject(MatDialog).open(EntityDialogComponent);
    ref.componentInstance.conf = conf;
    fixture.detectChanges();
    await fixture.whenStable();
    return ref.componentInstance;
  };

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue');
    await TestBed.configureTestingModule({
      declarations: [DialogHostComponent, EntityDialogComponent],
      imports: [MatDialogModule, NoopAnimationsModule, ReactiveFormsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmLabelImports],
      providers: [
        { provide: RestService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    ref = null;
  });

  afterEach(async () => {
    if (ref) {
      ref.close();
      await settle();
    }
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('renders the h2 title, Cancel on outline, the custom action on ghost and the save verb on default, rightmost', async () => {
    await open({
      title: 'Disconnect pool',
      message: 'Disconnect <b>tank</b>?',
      fieldConfig: [],
      saveButtonText: 'Delete',
      custActions: [{ id: 'download_key', name: 'Download Key', function: () => {} }],
    });
    const title = overlay().querySelector('[mat-dialog-title]');
    expect(title.tagName).toBe('H2');
    expect(classes(title)).toContain('mat-mdc-dialog-title');
    expect(title.textContent.trim()).toBe('Disconnect pool');
    expect(getComputedStyle(title).fontSize).toBe('16px');
    expect(getComputedStyle(title).fontWeight).toBe('500');
    expect(overlay().querySelector('h1')).toBeNull();

    const body = overlay().querySelector('.mat-mdc-dialog-content');
    expect(body.querySelector('.entity-dialog-form-message b').textContent).toBe('tank');
    expect(getComputedStyle(body).fontSize).toBe('13px');

    const [cancel, cust, submit] = actions();
    expect(actions().length).toBe(3);
    expect(cancel.textContent.trim()).toBe('Cancel');
    expect(cust.textContent.trim()).toBe('Download Key');
    expect(submit.textContent.trim()).toBe('Delete');
    expect(cust.id).toBe('cust_button_download_key');
    actions().forEach((button) => {
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('data-slot')).toBe('button');
      expect(classes(button)).not.toContain('mat-mdc-button');
      expect(getComputedStyle(button).textTransform).toBe('none');
    });
    expect(overlay().querySelectorAll('.mat-mdc-dialog-actions .mat-mdc-button').length).toBe(0);
    // tiers: default = fg1 ground; outline = transparent on the line hairline; ghost = fg2 text.
    // Material autofocuses the first tabbable button and the tier transitions border-color over
    // 120ms: blur it and stop the transition so the RESTING border is what gets read.
    actions().forEach((button) => { button.style.transition = 'none'; });
    (document.activeElement as HTMLElement | null)?.blur();
    expect(classes(submit)).toContain('bg-primary');
    expect(getComputedStyle(submit).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(classes(cancel)).toContain('border-border');
    expect(classes(cancel)).toContain('bg-transparent');
    expect(getComputedStyle(cancel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cancel).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(classes(cust)).toContain('text-muted-foreground');
    expect(classes(cust)).not.toContain('bg-primary');
    expect(getComputedStyle(cust).color).toBe('rgb(151, 166, 174)');
    // the automation ids keep their uppercase; they are not copy.
    expect((submit as unknown as Record<string, string>)['ix-auto-identifier']).toBe('DELETE');
    expect((cust as unknown as Record<string, string>)['ix-auto-identifier']).toBe('DOWNLOAD KEY');
    expect(submit.getAttribute('name')).toBe('Delete_button');
    expect(cancel.getAttribute('name')).toBe('Cancel_button');
    // the save verb is rightmost on the #354 row.
    const row = overlay().querySelector('.mat-mdc-dialog-actions');
    expect(getComputedStyle(row).justifyContent).toBe('flex-end');
    expect(getComputedStyle(row).columnGap).toBe('8px');
    expect(submit.getBoundingClientRect().right).toBeGreaterThan(cancel.getBoundingClientRect().right);
    expect(submit.getBoundingClientRect().right).toBeGreaterThan(cust.getBoundingClientRect().right);
  });

  it('keeps the save verb disabled until the #394 confirm checkbox is ticked, and respects hideCancel', async () => {
    const instance = await open({
      title: 'Export pool',
      fieldConfig: [],
      saveButtonText: 'Export',
      confirmCheckbox: true,
      hideCancel: true,
    });
    expect(instance.submitEnabled).toBeFalse();
    const [submit] = actions();
    expect(actions().length).toBe(1);
    expect(submit.textContent.trim()).toBe('Export');
    expect(submit.disabled).toBeTrue();

    const row = overlay().querySelector('.mat-mdc-dialog-actions .checkbox-row');
    expect(row).not.toBeNull();
    const cell = row.querySelector('.checkbox-cell');
    expect(cell.getBoundingClientRect().width).toBe(32);
    expect(cell.getBoundingClientRect().height).toBe(32);
    const box = row.querySelector<HTMLButtonElement>('button[role="checkbox"]');
    expect(box.id).toBe('confirm-dialog__confirm-checkbox');
    expect(box.getAttribute('aria-checked')).toBe('false');
    const label = row.querySelector<HTMLLabelElement>('label.checkbox-label');
    expect(label.getAttribute('for')).toBe('confirm-dialog__confirm-checkbox');
    expect(label.textContent.trim()).toBe('Confirm');
    expect(getComputedStyle(label).fontSize).toBe('13px');
    expect(getComputedStyle(label).paddingLeft).toBe('6px');
    expect(row.nextElementSibling.classList).toContain('dialog-action-spacer');
    expect(overlay().querySelector('mat-checkbox')).toBeNull();

    box.click();
    await settle();
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(instance.submitEnabled).toBeTrue();
    expect(submit.disabled).toBeFalse();
  });

  it('shows the error as the engine 12/16 form-error-line with role=alert inside the body, and the warning as the global box', async () => {
    const instance = await open({
      title: 'Roll back',
      fieldConfig: [],
      saveButtonText: 'Rollback',
      warning: '<b>WARNING:</b> this destroys data.',
    });
    expect(overlay().querySelector('#error_message')).toBeNull();
    const warning = overlay().querySelector('.mat-mdc-dialog-content .warning-box');
    expect(warning).not.toBeNull();
    expect(getComputedStyle(warning).backgroundColor).toBe('rgb(16, 21, 26)');
    expect(getComputedStyle(warning).borderTopWidth).toBe('1px');
    expect(getComputedStyle(warning).maxHeight).toBe('170px');

    instance.error = 'Pool is busy';
    await settle();
    const error = overlay().querySelector('.mat-mdc-dialog-content #error_message');
    expect(error).not.toBeNull();
    expect(error.tagName).toBe('P');
    expect(error.getAttribute('role')).toBe('alert');
    expect(classes(error)).toContain('form-error-line');
    expect(error.textContent.trim()).toBe('Pool is busy');
    expect(getComputedStyle(error).fontSize).toBe('12px');
    expect(getComputedStyle(error).lineHeight).toBe('16px');
    expect(getComputedStyle(error).color).toBe('rgb(224, 108, 117)');
    expect(overlay().querySelector('mat-error')).toBeNull();

    instance.clearErrors();
    await settle();
    expect(overlay().querySelector('#error_message')).toBeNull();
  });
});
