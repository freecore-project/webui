import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { SelectDialogComponent } from './select-dialog.component';

// the internal development record: the one-control dialog behind DialogService.select on the dialog law and the
// #393 field -- an h2 title, a labelled spartan select whose panel opens in the overlay's top
// layer above the dialog, Close outline / OK default, OK gated on a pick. Opened for real into the
// overlay container at the opener's 300px, in scope because the shell marks <body> (#353).
// Fallback ladder (no theme service in karma): line #2A353D, bg1 #10151A, fg1 #DCE3E6.
@Component({ standalone: false, template: '' })
class DialogHostComponent {}

describe('15.2 select dialog (the internal development record)', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let overlay: OverlayContainer;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };
  const options = [{ label: '1 minute', value: '60' }, { label: '2 minute', value: '120' }, { label: 'Turn OFF', value: '0' }];
  const q = (selector: string): HTMLElement => overlay.getContainerElement().querySelector(selector) as HTMLElement;
  const trigger = (): HTMLButtonElement => q('button[data-slot="select-trigger"]') as HTMLButtonElement;
  const items = (): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll('hlm-select-item')) as HTMLElement[];
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue');
    await TestBed.configureTestingModule({
      declarations: [DialogHostComponent, SelectDialogComponent],
      imports: [
        MatDialogModule, FormsModule, NoopAnimationsModule, TranslateModule.forRoot(),
        ...HlmButtonImports, ...HlmFieldImports, ...HlmLabelImports, ...HlmSelectImports,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    overlay = TestBed.inject(OverlayContainer);
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  const open = (): MatDialogRef<SelectDialogComponent> => {
    const ref = TestBed.inject(MatDialog).open(SelectDialogComponent, { width: '300px' });
    ref.componentInstance.title = 'IPMI Identify';
    ref.componentInstance.options = options;
    ref.componentInstance.optionPlaceHolder = 'IPMI flash duration';
    return ref;
  };

  it('renders the title and the labelled select as the #351 box, Close outline / OK default and waiting', async () => {
    const ref = open();
    await settle();
    try {
      const title = q('.mat-mdc-dialog-title');
      expect(title.tagName).toBe('H2');
      expect(title.textContent.trim()).toBe('IPMI Identify');
      expect(getComputedStyle(title).fontSize).toBe('16px');

      const button = trigger();
      const label = q('label[for="select-dialog__value"]');
      expect(button.id).toBe('select-dialog__value');
      expect(label.textContent.trim()).toBe('IPMI flash duration');
      expect(button.textContent.trim()).toBe('IPMI flash duration');
      expect(button.hasAttribute('data-placeholder')).toBeTrue();
      const style = getComputedStyle(button);
      expect(button.getBoundingClientRect().height).toBe(32);
      expect(style.borderTopWidth).toBe('1px');
      expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
      expect(style.backgroundColor).toBe('rgb(16, 21, 26)');
      expect(Math.abs(button.getBoundingClientRect().left - title.getBoundingClientRect().left - 24)).toBeLessThan(1.5);
      expect(q('hlm-select').hasAttribute('name')).toBeFalse();

      const [close, ok] = Array.from(q('.mat-mdc-dialog-actions').querySelectorAll('button')) as HTMLButtonElement[];
      expect(close.textContent.trim()).toBe('Close');
      expect(ok.textContent.trim()).toBe('OK');
      expect(close.type).toBe('button');
      expect(ok.type).toBe('button');
      expect(getComputedStyle(close).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(ok).backgroundColor).toBe('rgb(220, 227, 230)');
      expect(close.getBoundingClientRect().right).toBeLessThan(ok.getBoundingClientRect().left);
      expect(close.getAttribute('ix-auto-identifier')).toBe('CLOSE');
      expect(ok.getAttribute('ix-auto-identifier')).toBe('OK');
      expect(ok.disabled).toBeTrue();
    } finally {
      ref.close();
      await settle();
    }
  });

  it('opens the panel above the dialog, keys each item by its label, and a pick drives the emitter and OK', async () => {
    const ref = open();
    const picks: unknown[] = [];
    ref.componentInstance.switchSelectionEmitter.subscribe((value) => picks.push(value));
    await settle();
    try {
      trigger().click();
      await settle();
      const rows = items();
      expect(rows.map((row) => row.textContent.trim())).toEqual(['1 minute', '2 minute', 'Turn OFF']);
      // the interpolated automation id is the label (the literal 'option.label' is gone); an
      // interpolated unknown attribute lands on the element as a property
      expect(rows.map((row) => (row as unknown as Record<string, string>)['ix-auto-identifier'])).toEqual(['1 minute', '2 minute', 'Turn OFF']);
      // the panel is a later overlay than the dialog (a later top-layer popover), so it paints above it
      const panel = q('hlm-select-content');
      expect(panel).not.toBeNull();
      expect(q('.mat-mdc-dialog-container').contains(panel)).toBeFalse();
      expect(q('.mat-mdc-dialog-container').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      rows[1].click();
      await settle();
      expect(ref.componentInstance.DisplaySelection).toBe('120');
      expect(picks).toEqual(['120']);
      expect(trigger().textContent.trim()).toBe('2 minute');
      expect(trigger().hasAttribute('data-placeholder')).toBeFalse();
      const ok = q('.mat-mdc-dialog-actions button[ix-auto-identifier="OK"]') as HTMLButtonElement;
      expect(ok.disabled).toBeFalse();
    } finally {
      ref.close();
      await settle();
    }
  });

  it('closes false from Close and true from OK', async () => {
    let result: unknown = 'unset';
    const ref = open();
    ref.afterClosed().subscribe((value) => { result = value; });
    await settle();
    (q('.mat-mdc-dialog-actions button[ix-auto-identifier="CLOSE"]') as HTMLButtonElement).click();
    await settle();
    expect(result).toBeFalse();

    const second = open();
    second.afterClosed().subscribe((value) => { result = value; });
    second.componentInstance.DisplaySelection = '60';
    await settle();
    expect(trigger().textContent.trim()).toBe('1 minute');
    (q('.mat-mdc-dialog-actions button[ix-auto-identifier="OK"]') as HTMLButtonElement).click();
    await settle();
    expect(result).toBeTrue();
  });
});
