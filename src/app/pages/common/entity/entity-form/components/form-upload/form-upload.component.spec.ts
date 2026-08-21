import { HttpClient } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { DialogService, WebSocketService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormUploadComponent } from './form-upload.component';

// the internal development record: the upload field on the #351 stack -- a native file input (spartan has no
// file input), the optional Upload action in the outline tier, errors in the reserved subscript.
describe('form-upload on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormUploadComponent>;
  let component: FormUploadComponent;
  let group: UntypedFormGroup;
  const dialog = { report: jasmine.createSpy('report'), errorReport: jasmine.createSpy('errorReport') };
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'upload', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    dialog.report.calls.reset();
    await TestBed.configureTestingModule({
      declarations: [FormUploadComponent, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmButtonImports, HlmFieldImports, HlmLabelImports],
      providers: [
        { provide: WebSocketService, useValue: { token: 'tok-1' } },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
        { provide: DialogService, useValue: dialog },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormUploadComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
    fixture.nativeElement.classList.add('fc-ui'); // the shell scope of the file-input look and the glyph anchor
    fixture.nativeElement.style.setProperty('--line', '#2A353D'); // the ladder value --fc-line reads
  });

  it('renders the label, the file input bound to the control, and the Upload action in the outline tier', () => {
    mount({ name: 'file', placeholder: 'Config File', acceptedFiles: '.tar', fileLocation: '/var/tmp/firmware' } as Partial<FieldConfig>);
    const label = q('label');
    const input = q('input[type="file"]') as HTMLInputElement;
    expect(label.textContent.trim()).toBe('Config File');
    expect(label.getAttribute('for')).toBe('file-input');
    expect(input.id).toBe('file-input');
    expect(input.getAttribute('accept')).toBe('.tar');
    expect(input.hasAttribute('multiple')).toBeFalse();
    expect(component.fileInput.nativeElement).toBe(input);
    expect(component.apiEndPoint).toBe('/_upload?auth_token=tok-1');
    expect(q('[ix-auto="file-uploader__Config File"]')).not.toBeNull();
    const button = q('[ix-auto="button__UPLOAD"]') as HTMLButtonElement;
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.type).toBe('button');
    expect(button.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(button).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(q('mat-card-content')).toBeNull();
    expect(q('mat-card-actions')).toBeNull();
    expect(q('.buttons')).toBeNull();
    expect(q('.field-subscript').getBoundingClientRect().height).toBe(20);
    // the 15.2 file-input look reaches the field (it was scoped to settings forms)
    expect(getComputedStyle(input, '::file-selector-button').borderTopLeftRadius).toBe('6px');
    expect(getComputedStyle(input, '::file-selector-button').borderTopStyle).toBe('solid');
    // picking a file does NOT upload when the action is visible; the button does
    input.dispatchEvent(new Event('change'));
    expect(dialog.report).not.toHaveBeenCalled();
    button.click();
    expect(dialog.report).toHaveBeenCalledWith('Please make sure to select a file', '', '300px', 'info', true);
  });

  it('keeps a required file control gating the form until a file is picked', () => {
    mount({ name: 'file', placeholder: 'Config File', required: true } as Partial<FieldConfig>, new UntypedFormControl('', Validators.required));
    expect(group.valid).toBeFalse();
    const input = q('input[type="file"]') as HTMLInputElement;
    // formControlName registers the DefaultValueAccessor: an input event reaches the control
    expect(group.controls.file.dirty).toBeFalse();
    input.dispatchEvent(new Event('input'));
    expect(group.controls.file.dirty).toBeTrue();
    expect(group.valid).toBeFalse(); // still no file
    const picked = new DataTransfer();
    picked.items.add(new File(['x'], 'cfg.tar'));
    input.files = picked.files;
    input.dispatchEvent(new Event('input'));
    expect(group.controls.file.value).toContain('cfg.tar');
    expect(group.valid).toBeTrue();
  });

  it('with hideButton hands the change to the updater and renders no action; multiple is honoured', () => {
    const updater = jasmine.createSpy('updater');
    const parent = {};
    mount({ name: 'keytab', placeholder: 'Keytab', hideButton: true, multiple: true, updater, parent } as Partial<FieldConfig>);
    expect(q('[ix-auto="button__UPLOAD"]')).toBeNull();
    const input = q('input[type="file"]') as HTMLInputElement;
    expect(input.hasAttribute('multiple')).toBeTrue();
    input.dispatchEvent(new Event('change'));
    expect(updater).toHaveBeenCalledWith(component, parent);
    expect(dialog.report).not.toHaveBeenCalled();
  });

  it('lists errors and warnings as the shared error line and anchors the help glyph as the field\'s sibling', () => {
    mount({ name: 'file', placeholder: 'File', hasErrors: true, errors: 'Too big.', warnings: 'Slow link.', tooltip: 'Pick a file.' } as Partial<FieldConfig>);
    const lines = Array.from(fixture.nativeElement.querySelectorAll('.form-error-line')) as HTMLElement[];
    expect(lines.map((line) => line.textContent.trim())).toEqual(['Too big.', 'Slow link.']);
    expect(getComputedStyle(lines[0]).color).toBe('rgb(227, 98, 90)');
    expect(q('.dynamic-field.has-tooltip > tooltip')).not.toBeNull();
    expect(q('.dynamic-field.has-tooltip > hlm-field')).not.toBeNull();
    expect(getComputedStyle(q('.dynamic-field.has-tooltip > tooltip')).position).toBe('absolute');
    expect(getComputedStyle(q('.dynamic-field.has-tooltip > tooltip')).right).toBe('0px');
  });
});
