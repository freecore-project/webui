import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormTextareaComponent } from './form-textarea.component';

// the internal development record: the textarea renderer on spartan -- the #351 box that grows, three 18px
// rows minimum, same label row and subscript as form-input.
describe('form-textarea on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormTextareaComponent>;
  let component: FormTextareaComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'textarea', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormTextareaComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmFieldImports, HlmLabelImports, HlmTextareaImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormTextareaComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('draws the growing #351 box: hairline, 6px radius, bg1, 6/10 padding, 18px lines, 3 rows minimum', () => {
    mount({ name: 'notes', placeholder: 'Notes' });
    const area = q('#notes-input') as HTMLTextAreaElement;
    const style = getComputedStyle(area);
    expect(area.rows).toBe(4);
    expect(area.id).toBe('notes-input');
    expect(q('label').getAttribute('for')).toBe('notes-input');
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(style.borderTopLeftRadius).toBe('6px');
    expect(style.backgroundColor).toBe('rgb(16, 21, 26)');
    expect(style.paddingTop).toBe('6px');
    expect(style.paddingLeft).toBe('10px');
    expect(style.lineHeight).toBe('18px');
    expect(style.fontSize).toBe('13px');
    expect(area.getBoundingClientRect().height).toBeGreaterThanOrEqual(68);
    expect(area.getBoundingClientRect().width).toBe(q('#notes').getBoundingClientRect().width);
  });

  it('honours rows and the config class, and paints an invalid touched control red', () => {
    mount({ name: 'notes', placeholder: 'Notes', textAreaRows: 8, class: 'wide', required: true }, new UntypedFormControl('', Validators.required));
    const area = q('#notes-input') as HTMLTextAreaElement;
    expect(area.rows).toBe(8);
    expect(area.classList).toContain('wide');
    expect(area.classList).toContain('rounded-lg');
    group.controls.notes.markAsTouched();
    fixture.detectChanges();
    expect(getComputedStyle(area).borderTopColor).toBe('rgb(227, 98, 90)');
    expect(q('.form-error-line').textContent).toContain('is required.');
  });
});
