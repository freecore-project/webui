import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { FieldConfig } from '../../models/field-config.interface';
import { EntityFormService } from '../../services/entity-form.service';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormInputComponent } from './form-input.component';

// the internal development record: the real renderer, with a FieldConfig and a reactive control, measured the
// way the #351 / #373 host specs measured the Material DOM it replaces. The ladder is the
// fallback palette (no theme service in karma): line #2A353D, bg1 #10151A, fg1 #DCE3E6,
// fg2 #97A6AE, accent #8FB4C7, red #E3625A.
describe('form-input on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormInputComponent>;
  let component: FormInputComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const css = (selector: string): CSSStyleDeclaration => getComputedStyle(q(selector));

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'input', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormInputComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe],
      imports: [
        ReactiveFormsModule, TranslateModule.forRoot(),
        HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmLabelImports, HlmSpinnerImports,
      ],
      providers: [{ provide: EntityFormService, useValue: { phraseInputData: (value: unknown) => value } }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormInputComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('keeps the hooks the app keys on: wrapper id, derived input id, label for, ix-auto, attrs', () => {
    mount({ name: 'user', placeholder: 'Username', required: true, readonly: true });
    const input = q('#user-input') as HTMLInputElement;
    expect(q('#user').classList).toContain('form-input');
    expect(input.id).toBe('user-input');
    expect(q('label').getAttribute('for')).toBe('user-input');
    expect(q('label').textContent.trim()).toBe('Username');
    expect(input.getAttribute('ix-auto-type')).toBe('input');
    expect(input.required).toBeTrue();
    expect(input.readOnly).toBeTrue();
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('uses the config id when one is set (the theme and e2e key on #password)', () => {
    mount({ name: 'pw', id: 'password', placeholder: 'Password', inputType: 'password' });
    expect((q('#password') as HTMLInputElement).type).toBe('text');
    expect(q('label').getAttribute('for')).toBe('password');
  });

  it('draws the #351 box: 32px, --line hairline, 6px radius, bg1 fill, 13px text, full width', () => {
    mount({ name: 'name', placeholder: 'Name' });
    const box = css('hlm-input-group');
    expect(q('hlm-input-group').getBoundingClientRect().height).toBe(32);
    expect(box.borderTopWidth).toBe('1px');
    expect(box.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(box.borderTopLeftRadius).toBe('6px');
    expect(box.backgroundColor).toBe('rgb(16, 21, 26)');
    expect(q('hlm-input-group').getBoundingClientRect().width).toBe(q('#name').getBoundingClientRect().width);
    const input = css('#name-input');
    expect(input.fontSize).toBe('13px');
    expect(input.color).toBe('rgb(220, 227, 230)');
    expect(input.fontFamily).toContain('IBM Plex Sans');
  });

  it('keeps the label static on its own 20px row above the box: 12/16 fg2 plus a 4px lead', () => {
    mount({ name: 'name', placeholder: 'Name' });
    const label = css('label');
    expect(label.fontSize).toBe('12px');
    expect(label.lineHeight).toBe('16px');
    expect(label.color).toBe('rgb(151, 166, 174)');
    expect(label.marginBottom).toBe('4px');
    const row = q('label').getBoundingClientRect();
    const box = q('hlm-input-group').getBoundingClientRect();
    expect(box.top - row.top).toBe(20);
    expect(Math.abs(row.left - box.left)).toBeLessThan(1.5);
    // 20 label row + 32 box + 20 reserved subscript = Material's 72px field pitch.
    expect(q('hlm-field').getBoundingClientRect().height).toBe(72);
  });

  it('paints an invalid touched control red and lists the shared error line under the box', () => {
    mount({ name: 'name', placeholder: 'Name', required: true }, new UntypedFormControl('', Validators.required));
    expect(css('hlm-input-group').borderTopColor).toBe('rgb(42, 53, 61)');
    group.controls.name.markAsTouched();
    fixture.detectChanges();
    expect(q('#name-input').getAttribute('data-matches-spartan-invalid')).toBe('true');
    expect(css('hlm-input-group').borderTopColor).toBe('rgb(227, 98, 90)');
    const line = q('.form-error-line');
    expect(line.textContent).toContain('is required.');
    const style = getComputedStyle(line);
    expect(style.fontSize).toBe('12px');
    expect(style.lineHeight).toBe('16px');
    expect(style.color).toBe('rgb(227, 98, 90)');
    expect(line.getBoundingClientRect().top - q('hlm-input-group').getBoundingClientRect().bottom).toBe(2);
  });

  it('paints server-side errors red too, through forceInvalid', () => {
    mount({ name: 'name', placeholder: 'Name', hasErrors: true, errors: 'Taken.' } as Partial<FieldConfig>);
    expect(css('hlm-input-group').borderTopColor).toBe('rgb(227, 98, 90)');
    expect(q('.form-error-line').textContent).toContain('Taken.');
  });

  it('renders the hint as the field description: 12/16 fg2, 2px under the box', () => {
    mount({ name: 'name', placeholder: 'Name', hint: 'Letters and digits.' });
    const hint = q('[data-slot="field-description"]');
    expect(hint.textContent).toBe('Letters and digits.');
    expect(getComputedStyle(hint).fontSize).toBe('12px');
    expect(getComputedStyle(hint).color).toBe('rgb(151, 166, 174)');
    expect(hint.getBoundingClientRect().top - q('hlm-input-group').getBoundingClientRect().bottom).toBe(2);
  });

  it('puts the password toggle inside the box at its right end as a 16px fg2 glyph, and flips the type', () => {
    mount({ name: 'secret', placeholder: 'Password', inputType: 'password', togglePw: true });
    const input = q('#secret-input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.classList).toContain('password-field');
    const box = q('hlm-input-group').getBoundingClientRect();
    const toggle = q('.toggle_pw');
    const t = toggle.getBoundingClientRect();
    expect(toggle.getAttribute('ix-auto-type')).toBe('button');
    expect(t.width).toBe(24);
    expect(t.height).toBe(24);
    expect(box.right - t.right).toBeLessThan(8);
    expect(Math.abs((t.top + t.bottom) / 2 - (box.top + box.bottom) / 2)).toBeLessThan(2);
    expect(q('.toggle_pw .material-icons').textContent).toBe('visibility_off');
    expect(getComputedStyle(q('.toggle_pw .material-icons')).fontSize).toBe('16px');
    expect(getComputedStyle(toggle).color).toBe('rgb(151, 166, 174)');
    toggle.click();
    fixture.detectChanges();
    expect(input.classList).not.toContain('password-field');
    expect(q('.toggle_pw .material-icons').textContent).toBe('visibility');
  });

  it('is empty for a hidden config and native for the file variant', () => {
    mount({ name: 'hidden', placeholder: 'Hidden', isHidden: true } as Partial<FieldConfig>);
    expect(q('#hidden')).toBeNull();
    mount({ name: 'upload', placeholder: 'Upload', inputType: 'file' });
    expect(q('hlm-field')).toBeNull();
    expect((q('#fileInput') as HTMLInputElement).type).toBe('file');
  });
});
