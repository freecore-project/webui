import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { FieldConfig } from '../../models/field-config.interface';
import { FormRadioComponent } from './form-radio.component';

// the internal development record: the real renderer on spartan's radio group, measured like the #352 spec.
describe('form-radio on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormRadioComponent>;
  let component: FormRadioComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('b')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'radio', options: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }], ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormRadioComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmRadioGroupImports, HlmLabelImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormRadioComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('draws one 32px row per option with the #352 ring, ids the app keys on, and the checked ring in fg1', () => {
    mount({ name: 'mode', placeholder: 'Mode' });
    expect(q('.top label').textContent.trim()).toBe('Mode');
    expect(q('hlm-radio-group').id).toBe('mode_radiogroup');
    const rows = qa('.radio-option-row');
    expect(rows.length).toBe(2);
    expect(rows[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(rows[0]).display).toBe('flex');
    const radios = qa('brn-radio');
    const inputs = qa('input[type="radio"]');
    expect(inputs[0].id).toBe('mode_a_radiobutton');
    expect(qa('label.radio-label')[0].getAttribute('for')).toBe('mode_a_radiobutton');
    const ring = qa('hlm-radio-indicator')[1];
    expect(ring.getBoundingClientRect().width).toBe(16);
    expect(parseFloat(getComputedStyle(ring).borderTopLeftRadius)).toBeGreaterThanOrEqual(8);
    expect(getComputedStyle(ring).borderTopWidth).toBe('1px');
    // 'b' is checked: fg1 ring and an 8px fg1 dot
    expect(radios[1].getAttribute('data-checked')).toBe('true');
    expect(getComputedStyle(ring).borderTopColor).toBe('rgb(220, 227, 230)');
    const dot = ring.querySelector('div') as HTMLElement;
    expect(dot.getBoundingClientRect().width).toBe(8);
    expect(getComputedStyle(dot).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(qa('label.radio-label')[0]).paddingLeft).toBe('4px');
    expect(qa('label.radio-label')[0].getBoundingClientRect().left).toBe(qa('.radio-cell')[0].getBoundingClientRect().right);
  });

  it('writes the control when another option is picked', async () => {
    mount({ name: 'mode', placeholder: 'Mode' });
    (qa('input[type="radio"]')[0] as HTMLInputElement).click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.mode.value).toBe('a');
    const ring = qa('hlm-radio-indicator')[0];
    expect(getComputedStyle(ring).borderTopColor).toBe('rgb(220, 227, 230)');
  });
});
