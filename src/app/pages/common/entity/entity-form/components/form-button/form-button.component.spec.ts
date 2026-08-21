import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { FormButtonComponent } from './form-button.component';

// the internal development record: the field button on spartan -- the outline tier of #353, measured like the
// other renderer specs. Fallback ladder (no theme service in karma): fg1 #DCE3E6, line #2A353D.
describe('form-button on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormButtonComponent>;
  let component: FormButtonComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const button = (): HTMLButtonElement => q('button') as HTMLButtonElement;

  const mount = (config: Partial<FieldConfig>): void => {
    group = new UntypedFormGroup({ [config.name]: new UntypedFormControl('') });
    component.config = { type: 'button', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormButtonComponent, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmButtonImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormButtonComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('draws the outline tier: 32px, 6px radius, --line hairline, transparent, fg1 13px/500, sentence case', () => {
    mount({ name: 'login', label: 'Log In To Provider' });
    const style = getComputedStyle(button());
    expect(button().getAttribute('data-slot')).toBe('button');
    expect(button().getBoundingClientRect().height).toBe(32);
    expect(style.borderTopLeftRadius).toBe('6px');
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.color).toBe('rgb(220, 227, 230)');
    expect(style.fontSize).toBe('13px');
    expect(style.fontWeight).toBe('500');
    expect(style.textTransform).toBe('none');
    expect(style.paddingLeft).toBe('14px');
    expect(style.boxShadow).toBe('none');
    expect(button().textContent.trim()).toBe('Log In To Provider');
    expect(q('.mat-mdc-button')).toBeNull();
  });

  it('fires customEventMethod with the event and swallows the default, submit by default, inputType honoured', () => {
    const customEventMethod = jasmine.createSpy('customEventMethod');
    mount({ name: 'login', label: 'Log In', customEventMethod, customEventActionLabel: 'Log In' } as Partial<FieldConfig>);
    expect(button().type).toBe('submit');
    const event = new MouseEvent('click', { cancelable: true });
    button().dispatchEvent(event);
    expect(customEventMethod).toHaveBeenCalledWith({ event });
    expect(event.defaultPrevented).toBeTrue();
    expect(button().getAttribute('ix-auto')).toBe('button__LOG IN');
    mount({ name: 'reset', label: 'Reset', inputType: 'button' } as Partial<FieldConfig>);
    expect(button().type).toBe('button');
  });

  it('dims to .4 whether disabled through the config or written straight to the element', () => {
    mount({ name: 'login', label: 'Log In', disabled: true });
    expect(button().disabled).toBeTrue();
    expect(button().getAttribute('data-disabled')).toBe('true');
    expect(getComputedStyle(button()).opacity).toBe('0.4');
    mount({ name: 'login', label: 'Log In', disabled: false });
    expect(getComputedStyle(button()).opacity).toBe('1');
    // the ipmi and volume-key pages set `.disabled` on the element themselves
    button().disabled = true;
    expect(getComputedStyle(button()).opacity).toBe('0.4');
  });

  it('renders nothing when hidden', () => {
    mount({ name: 'login', label: 'Log In', isHidden: true });
    expect(q('button')).toBeNull();
  });
});
