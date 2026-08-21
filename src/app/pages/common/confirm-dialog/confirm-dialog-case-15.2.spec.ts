import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { ConfirmDialog } from './confirm-dialog.component';
import { GeneralDialogComponent } from '../general-dialog/general-dialog.component';

// the internal development record: dialog buttons say what they were given. The confirm
// dialog behind DialogService.confirm used to pipe both labels through
// `uppercase`, and general-dialog fell back to 'CANCEL' / 'CLOSE' literals;
// with the tiers of #353 rendering sentence case, those were the last
// shouting buttons in the shell. Opened for real into the overlay container,
// which is in scope because the shell marks <body> (#353). Since the internal development record
// the buttons are hlmBtn tiers (Cancel outline, the verb default), so the helm sets
// are imported for real; NO_ERRORS_SCHEMA only covers <tooltip> and the ix-auto attrs.
@Component({ standalone: false, template: '' })
class DialogHostComponent {}

describe('15.2 dialog button case (the internal development record)', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };
  const actions = (): HTMLButtonElement[] => Array.from(document.querySelectorAll('.cdk-overlay-container .mat-mdc-dialog-actions button'));

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue');
    await TestBed.configureTestingModule({
      declarations: [DialogHostComponent, ConfirmDialog, GeneralDialogComponent],
      imports: [MatDialogModule, NoopAnimationsModule, TranslateModule.forRoot(), ...HlmButtonImports, ...HlmCheckboxImports, ...HlmLabelImports],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('renders the confirm dialog buttons as given, in sentence case, on the tiers', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(ConfirmDialog);
    ref.componentInstance.title = 'Delete user';
    ref.componentInstance.message = 'Delete the user <i>preview</i>?';
    ref.componentInstance.buttonMsg = 'Delete';
    ref.componentInstance.hideCheckBox = true;
    fixture.detectChanges();
    await fixture.whenStable();
    try {
      const [cancel, submit] = actions();
      expect(cancel.textContent.trim()).toBe('Cancel');
      expect(submit.textContent.trim()).toBe('Delete');
      expect(getComputedStyle(cancel).textTransform).toBe('none');
      expect(getComputedStyle(submit).textTransform).toBe('none');
      expect(getComputedStyle(submit).backgroundColor).toBe('rgb(220, 227, 230)');
      expect(getComputedStyle(cancel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      // The automation ids keep their uppercase; they are not copy. (An
      // interpolated unknown attribute lands on the element as a property.)
      expect((submit as unknown as Record<string, string>)['ix-auto-identifier']).toBe('DELETE');
    } finally {
      ref.close();
      fixture.detectChanges();
      await fixture.whenStable();
    }
  });

  // the internal development record: the confirm checkbox is the engine's #394 row (32px cell, hlmLabel), left
  // of the buttons behind the spacer, and it still drives isSubmitEnabled / the verb's [disabled].
  it('gates the verb behind the confirm checkbox row', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(ConfirmDialog);
    ref.componentInstance.title = 'Delete user';
    ref.componentInstance.message = 'Delete the user?';
    ref.componentInstance.buttonMsg = 'Delete';
    fixture.detectChanges();
    await fixture.whenStable();
    try {
      const row = document.querySelector('.cdk-overlay-container .mat-mdc-dialog-actions .checkbox-row') as HTMLElement;
      const box = row.querySelector('button[role="checkbox"]') as HTMLButtonElement;
      const label = row.querySelector('label.checkbox-label') as HTMLLabelElement;
      const submit = document.getElementById('confirm-dialog__action-button') as HTMLButtonElement;
      expect(box.id).toBe('confirm-dialog__confirm-checkbox');
      expect(label.htmlFor).toBe('confirm-dialog__confirm-checkbox');
      expect(label.textContent.trim()).toBe('Confirm');
      expect(getComputedStyle(row.querySelector('.checkbox-cell')).width).toBe('32px');
      expect(row.nextElementSibling.classList).toContain('dialog-action-spacer');
      expect(submit.disabled).toBeTrue();
      box.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(ref.componentInstance.isSubmitEnabled).toBeTrue();
      expect(submit.disabled).toBeFalse();
    } finally {
      ref.close();
      fixture.detectChanges();
      await fixture.whenStable();
    }
  });

  it('falls back to Cancel and Close in the general dialog', async () => {
    const dialog = TestBed.inject(MatDialog);
    const ref = dialog.open(GeneralDialogComponent);
    ref.componentInstance.conf = { title: 'Results', message: 'Nothing to report.' };
    fixture.detectChanges();
    await fixture.whenStable();
    try {
      const labels = actions().map((button) => button.textContent.trim());
      expect(labels).toEqual(['Cancel', 'Close']);
    } finally {
      ref.close();
      fixture.detectChanges();
      await fixture.whenStable();
    }
  });
});
