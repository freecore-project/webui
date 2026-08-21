import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FieldConfig } from '../../models/field-config.interface';
import { FormParagraphComponent } from './form-paragraph.component';

@Pipe({ standalone: false, name: 'docreplace' })
class DocReplaceStubPipe implements PipeTransform {
  transform(message: string): string { return message; }
}

// the internal development record: the paragraph field is Material-free -- the text through innerHTML, the
// control registered on a hidden native input, errors on the #392 line.
describe('form-paragraph on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormParagraphComponent>;
  let component: FormParagraphComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'paragraph', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormParagraphComponent, DocReplaceStubPipe],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), MatIconModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormParagraphComponent);
    component = fixture.componentInstance;
  });

  it('renders the text as HTML on a Material-free host and keeps the control registered', () => {
    mount({ name: 'note', paraText: 'Enter the <b>ACME</b> account.' });
    expect(q('.dynamic-field').id).toBe('note');
    expect(q('.dynamic-field').classList).toContain('form-paragraph');
    expect(q('p').innerHTML).toContain('<b>ACME</b>');
    expect(q('mat-form-field')).toBeNull();
    expect(q('mat-error')).toBeNull();
    const hidden = q('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.id).toBe('note-input');
    group.controls.note.setValue('written');
    expect(hidden.value).toBe('written');
  });

  it('sizes the optional icon and the large text, and hides on fieldShow', () => {
    mount({ name: 'info', paraText: 'Gmail is not available.', paragraphIcon: 'info', paragraphIconSize: '24px', isLargeText: true } as Partial<FieldConfig>);
    const icon = q('mat-icon.paragraph-icon');
    expect(icon.textContent.trim()).toBe('info');
    expect(icon.style.fontSize).toBe('24px');
    expect(q('p').classList).toContain('large');
    expect(getComputedStyle(q('p')).fontSize).toBe('16px');
    component.fieldShow = 'hide';
    fixture.detectChanges();
    expect(getComputedStyle(q('.dynamic-field')).display).toBe('none');
  });

  it('lists server-side errors as the shared error line', () => {
    mount({ name: 'note', paraText: 'Note', hasErrors: true, errors: 'Rejected.' } as Partial<FieldConfig>);
    expect(q('.form-error-line').textContent).toContain('Rejected.');
    expect(q('.form-error-line').getAttribute('role')).toBe('alert');
    expect(getComputedStyle(q('.form-error-line')).fontSize).toBe('12px');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
  });

  it('renders nothing when hidden', () => {
    mount({ name: 'note', paraText: 'Note', isHidden: true });
    expect(q('.dynamic-field')).toBeNull();
  });
});
