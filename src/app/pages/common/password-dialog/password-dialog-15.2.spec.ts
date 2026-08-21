import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { of } from 'rxjs';
import { SystemGeneralService } from '../../../services/system-general.service';
import { PasswordDialog } from './password-dialog.component';

// the internal development record: the password dialog behind DialogService.passwordConfirm on the dialog law
// and the #392 field -- an h2 title, the message, the root password as a spartan input group with
// the eye as an addon, the failed check as the engine's error line, Cancel outline / Continue
// default. Opened for real into the overlay container at the opener's 420px, which is in scope
// because the shell marks <body> (#353). NO_ERRORS_SCHEMA covers <tooltip> and the ix-auto attrs.
// Fallback ladder (no theme service in karma): line #2A353D, bg1 #10151A, fg1 #DCE3E6,
// fg2 #97A6AE, red #E3625A.
@Component({ standalone: false, template: '' })
class DialogHostComponent {}

describe('15.2 password dialog (the internal development record)', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let checkRootPW: jasmine.Spy;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--red': '#E3625A' };
  const q = (selector: string): HTMLElement => document.querySelector(`.cdk-overlay-container ${selector}`) as HTMLElement;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const settleGroupStyle = async (group: HTMLElement): Promise<CSSStyleDeclaration> => {
    // #443: Angular stability does not await the group's native 120ms CSS transition.
    // Flush the changed style before collecting transitions, then read the final paint.
    getComputedStyle(group).borderTopColor;
    await Promise.all(group.getAnimations().map((animation) => animation.finished));
    return getComputedStyle(group);
  };
  const type = async (value: string): Promise<void> => {
    const input = q('#rootpw') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue');
    checkRootPW = jasmine.createSpy('checkRootPW').and.callFake((password: string) => of(password === 'correct'));
    await TestBed.configureTestingModule({
      declarations: [DialogHostComponent, PasswordDialog],
      imports: [
        MatDialogModule, FormsModule, NoopAnimationsModule, TranslateModule.forRoot(),
        ...HlmButtonImports, ...HlmFieldImports, ...HlmInputImports, ...HlmInputGroupImports, ...HlmLabelImports,
      ],
      providers: [{ provide: SystemGeneralService, useValue: { checkRootPW } }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('renders the title, the message and the password field on the law, Cancel outline / Continue default', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(PasswordDialog, { width: '420px' });
    ref.componentInstance.message = 'Export the pool <b>tank</b>?';
    await settle();
    try {
      const title = q('.mat-mdc-dialog-title');
      expect(title.tagName).toBe('H2');
      expect(title.textContent.trim()).toBe('Action Requires Administrator Confirmation');
      expect(getComputedStyle(title).fontSize).toBe('16px');
      expect(getComputedStyle(title).fontWeight).toBe('500');
      expect(q('#confirm-msg .message-content').innerHTML).toContain('<b>tank</b>');

      // The #392 field: label row for the input, the box with the eye inside its right end.
      const input = q('#rootpw') as HTMLInputElement;
      const label = q('label[for="rootpw"]');
      expect(input.type).toBe('password');
      expect(input.required).toBeTrue();
      expect(input.getAttribute('autocomplete')).toBe('new-password');
      expect(input.getAttribute('ix-auto-type')).toBe('input');
      expect(input.getAttribute('ix-auto-identifier')).toBe('rootpw');
      expect(label.textContent.trim()).toBe('Root Password');
      const group = q('hlm-input-group');
      const groupStyle = await settleGroupStyle(group);
      expect(group.getBoundingClientRect().height).toBe(32);
      expect(groupStyle.borderTopWidth).toBe('1px');
      // The real opener keeps Material's default autofocus on the first tabbable field.
      expect(document.activeElement).toBe(input);
      expect(input.matches(':focus-visible')).toBeTrue();
      expect(groupStyle.borderTopColor).toBe('rgb(143, 180, 199)');
      expect(groupStyle.boxShadow).toContain('3px');
      expect(groupStyle.backgroundColor).toBe('rgb(16, 21, 26)');
      // the field sits on the 24px gutter the title text sits on (the h2 spans the surface)
      expect(Math.abs(group.getBoundingClientRect().left - title.getBoundingClientRect().left - 24)).toBeLessThan(1.5);
      const toggle = q('.toggle_pw') as HTMLButtonElement;
      const box = group.getBoundingClientRect();
      const t = toggle.getBoundingClientRect();
      expect(toggle.type).toBe('button');
      expect(toggle.getAttribute('aria-label')).toBe('Show');
      expect(toggle.getAttribute('ix-auto-identifier')).toBe('rootpw_toggle-pw');
      expect(t.width).toBe(24);
      expect(t.height).toBe(24);
      expect(box.right - t.right).toBeLessThan(8);
      expect(q('.toggle_pw .material-icons').textContent).toBe('visibility_off');
      // no error line until the check fails; the subscript row is still reserved
      expect(q('.form-error-line')).toBeNull();
      expect(getComputedStyle(q('.field-subscript')).minHeight).toBe('20px');

      const cancel = q('#confirm-dialog__cancel-button') as HTMLButtonElement;
      const submit = q('#confirm-dialog__action-button') as HTMLButtonElement;
      expect(cancel.textContent.trim()).toBe('Cancel');
      expect(submit.textContent.trim()).toBe('Continue');
      expect(cancel.type).toBe('button');
      expect(submit.type).toBe('button');
      expect(getComputedStyle(cancel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(submit).backgroundColor).toBe('rgb(220, 227, 230)');
      expect(cancel.getBoundingClientRect().right).toBeLessThan(submit.getBoundingClientRect().left);
      expect((cancel as unknown as Record<string, string>)['ix-auto-identifier']).toBe('CANCEL');
      expect((submit as unknown as Record<string, string>)['ix-auto-identifier']).toBe('CONTINUE');
      // nothing typed: the verb waits (isDisabled)
      expect(submit.disabled).toBeTrue();
    } finally {
      ref.close();
      await settle();
    }
  });

  it('flips the eye between password and text', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(PasswordDialog, { width: '420px' });
    ref.componentInstance.message = 'Confirm.';
    await settle();
    try {
      const input = q('#rootpw') as HTMLInputElement;
      const toggle = q('.toggle_pw') as HTMLButtonElement;
      toggle.click();
      await settle();
      expect(input.type).toBe('text');
      expect(ref.componentInstance.showPassword).toBeTrue();
      expect(q('.toggle_pw .material-icons').textContent).toBe('visibility');
      expect(toggle.getAttribute('aria-label')).toBe('Hide');
      toggle.click();
      await settle();
      expect(input.type).toBe('password');
      expect(q('.toggle_pw .material-icons').textContent).toBe('visibility_off');
    } finally {
      ref.close();
      await settle();
    }
  });

  it('paints a failed check as the error line, then closes true on the right password', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(PasswordDialog, { width: '420px' });
    ref.componentInstance.message = 'Confirm.';
    let result: unknown = 'unset';
    ref.afterClosed().subscribe((value) => { result = value; });
    await settle();
    try {
      const submit = q('#confirm-dialog__action-button') as HTMLButtonElement;
      await type('wrong');
      expect(ref.componentInstance.password).toBe('wrong');
      expect(submit.disabled).toBeFalse();
      submit.click();
      await settle();
      expect(checkRootPW).toHaveBeenCalledWith('wrong');
      const line = q('.form-error-line');
      expect(line.getAttribute('role')).toBe('alert');
      expect(line.textContent.trim()).toBe('The administrator password is incorrect.');
      const style = getComputedStyle(line);
      expect(style.fontSize).toBe('12px');
      expect(style.lineHeight).toBe('16px');
      expect(style.color).toBe('rgb(227, 98, 90)');
      const input = q('#rootpw') as HTMLInputElement;
      expect(document.activeElement).toBe(input);
      expect(input.matches(':focus-visible')).toBeTrue();
      expect(input.getAttribute('data-matches-spartan-invalid')).toBe('true');
      const groupStyle = await settleGroupStyle(q('hlm-input-group'));
      expect(groupStyle.borderTopColor).toBe('rgb(227, 98, 90)');
      expect(groupStyle.boxShadow).toContain('3px');
      expect(groupStyle.getPropertyValue('--tw-ring-color').toLowerCase()).toContain(themeVars['--red'].toLowerCase());
      expect(groupStyle.getPropertyValue('--tw-ring-color')).toContain('25%');
      expect(line.getBoundingClientRect().top - q('hlm-input-group').getBoundingClientRect().bottom).toBe(2);

      // Enter in the field submits too
      await type('correct');
      (q('#rootpw') as HTMLInputElement).dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      await settle();
      expect(checkRootPW).toHaveBeenCalledWith('correct');
      expect(result).toBeTrue();
    } finally {
      if (ref.componentInstance) { ref.close(); }
      await settle();
    }
  });

  it('closes false from Cancel and hides it under hideCancel', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(PasswordDialog, { width: '420px' });
    ref.componentInstance.message = 'Confirm.';
    let result: unknown = 'unset';
    ref.afterClosed().subscribe((value) => { result = value; });
    await settle();
    (q('#confirm-dialog__cancel-button') as HTMLButtonElement).click();
    await settle();
    expect(result).toBeFalse();

    const hidden = dialog.open(PasswordDialog, { width: '420px' });
    hidden.componentInstance.message = 'Confirm.';
    hidden.componentInstance.hideCancel = true;
    await settle();
    try {
      expect(q('#confirm-dialog__cancel-button')).toBeNull();
      expect(q('#confirm-dialog__action-button')).not.toBeNull();
    } finally {
      hidden.close();
      await settle();
    }
  });
});
