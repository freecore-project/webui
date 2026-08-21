import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { EntityFormService } from '../../services/entity-form.service';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormReadFileComponent } from './form-readfile.component';

// the internal development record: the read-file field on the #351 stack -- a label, a native file input with a
// per-field id, and the file's text landing in the control through FileReader.
describe('form-readfile on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormReadFileComponent>;
  let component: FormReadFileComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;

  const mount = (config: Partial<FieldConfig>): void => {
    group = new UntypedFormGroup({ [config.name]: new UntypedFormControl('') });
    component.config = { type: 'readfile', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormReadFileComponent, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmFieldImports, HlmLabelImports],
      providers: [{ provide: EntityFormService, useValue: {} }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormReadFileComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('renders the label and a per-field file input, Material-free', () => {
    mount({ name: 'preview', placeholder: 'Preview JSON Service Account Key' } as Partial<FieldConfig>);
    expect(q('label').textContent.trim()).toBe('Preview JSON Service Account Key');
    expect(q('label').getAttribute('for')).toBe('preview-input');
    expect((q('input[type="file"]') as HTMLInputElement).id).toBe('preview-input');
    expect(q('[ix-auto="readfile__Preview JSON Service Account Key"]')).not.toBeNull();
    expect(q('mat-error')).toBeNull();
    expect(q('.field-subscript').getBoundingClientRect().height).toBe(20);
  });

  it('reads the picked file into the control through the input\'s change event', async () => {
    mount({ name: 'preview', placeholder: 'Preview' });
    const input = q('input[type="file"]') as HTMLInputElement;
    const picked = new DataTransfer();
    picked.items.add(new File(['{"type":"service_account"}'], 'key.json', { type: 'application/json' }));
    input.files = picked.files;
    input.dispatchEvent(new Event('change'));
    for (let i = 0; i < 50 && group.controls.preview.value === ''; i++) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(group.controls.preview.value).toBe('{"type":"service_account"}');
    expect(component.fileString).toBe('{"type":"service_account"}');
  });

  it('lists server-side errors as the shared error line', () => {
    mount({ name: 'preview', placeholder: 'Preview', hasErrors: true, errors: 'Not JSON.' } as Partial<FieldConfig>);
    expect(q('.form-error-line').textContent).toContain('Not JSON.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
  });
});
