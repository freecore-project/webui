import { OverlayContainer } from '@angular/cdk/overlay';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormSelectComponent } from './form-select.component';

// the internal development record: the real renderer on spartan's select -- a FieldConfig, a reactive control,
// the trigger measured like the #351 box, the panel opened in the CDK overlay and measured like
// the #354 panel. Fallback ladder (no theme service in karma): line #2A353D, bg1 #10151A,
// bg2 #171E24, fg1 #DCE3E6, fg2 #97A6AE, red #E3625A.
describe('form-select on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormSelectComponent>;
  let component: FormSelectComponent;
  let group: UntypedFormGroup;
  let overlay: OverlayContainer;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const trigger = (): HTMLButtonElement => q('button[data-slot="select-trigger"]') as HTMLButtonElement;
  const panel = (): HTMLElement => overlay.getContainerElement().querySelector('hlm-select-content') as HTMLElement;
  const items = (): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll('hlm-select-item')) as HTMLElement[];
  const options = [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }, { label: 'Gamma', value: 'g', disable: true }];

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl(null)): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'select', options, ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  const open = async (): Promise<void> => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormSelectComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmFieldImports, HlmLabelImports, HlmSelectImports, HlmSpinnerImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormSelectComponent);
    component = fixture.componentInstance;
    overlay = TestBed.inject(OverlayContainer);
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  afterEach(() => {
    overlay.ngOnDestroy();
  });

  it('draws the trigger as the #351 box, labelled by the field label, and shows the option label, not the value', () => {
    mount({ name: 'choice', placeholder: 'Choice' }, new UntypedFormControl('b'));
    const button = trigger();
    expect(button.id).toBe('choice-select');
    expect(q('label').getAttribute('for')).toBe('choice-select');
    expect(q('label').textContent.trim()).toBe('Choice');
    expect(button.textContent.trim()).toBe('Beta');
    const style = getComputedStyle(button);
    expect(button.getBoundingClientRect().height).toBe(32);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(style.borderTopLeftRadius).toBe('6px');
    expect(style.backgroundColor).toBe('rgb(16, 21, 26)');
    expect(style.fontSize).toBe('13px');
    expect(style.color).toBe('rgb(220, 227, 230)');
    expect(button.getBoundingClientRect().width).toBe(q('#choice').getBoundingClientRect().width);
    // the #387 chevron: a 16px box at the right end, fg2, border-drawn
    const chevron = button.lastElementChild as HTMLElement;
    expect(chevron.getBoundingClientRect().width).toBe(16);
    expect(Math.abs(chevron.getBoundingClientRect().right - (button.getBoundingClientRect().right - 10))).toBeLessThanOrEqual(1);
    // 1.5px snaps to the device pixel grid at 1x, as it did for the Material chevron
    expect(parseFloat(getComputedStyle(chevron, '::after').borderRightWidth)).toBeGreaterThanOrEqual(1);
  });

  it('shows the placeholder in fg2 while empty and keeps the 72px pitch', () => {
    mount({ name: 'choice', placeholder: 'Choice' });
    expect(trigger().textContent.trim()).toBe('');
    expect(trigger().hasAttribute('data-placeholder') || q('[data-slot="select-value"]').hasAttribute('data-placeholder')).toBeTrue();
    expect(q('hlm-field').getBoundingClientRect().height).toBe(72);
  });

  it('opens the #354 panel with 32px rows, a disabled option at .4, and writes the control on pick', async () => {
    const onChangeOption = jasmine.createSpy('onChangeOption');
    mount({ name: 'choice', placeholder: 'Choice', onChangeOption });
    await open();
    const content = panel();
    expect(content).withContext('panel in the overlay').toBeTruthy();
    const style = getComputedStyle(content);
    expect(style.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(style.borderTopLeftRadius).toBe('6px');
    expect(/rgba\(\d+, \d+, \d+, 0\.[1-9]/.test(style.boxShadow)).withContext('no visible shadow').toBeFalse();
    expect(style.paddingTop).toBe('4px');
    const rows = items();
    expect(rows.map((row) => row.textContent.trim())).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(rows[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(rows[0]).paddingLeft).toBe('12px');
    expect(getComputedStyle(rows[0]).fontSize).toBe('13px');
    expect(rows[2].hasAttribute('data-disabled')).toBeTrue();
    expect(getComputedStyle(rows[2]).opacity).toBe('0.4');
    rows[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(group.controls.choice.value).toBe('a');
    expect(trigger().textContent.trim()).toBe('Alpha');
    expect(onChangeOption).toHaveBeenCalledWith({ event: { value: 'a' } });
  });

  it('lists the zero state as a disabled row when there are no options', async () => {
    mount({ name: 'choice', placeholder: 'Choice', options: [], zeroStateMessage: 'Nothing here' } as Partial<FieldConfig>);
    await open();
    const rows = items();
    expect(rows.length).toBe(1);
    expect(rows[0].textContent.trim()).toBe('Nothing here');
    expect(rows[0].hasAttribute('data-disabled')).toBeTrue();
  });

  it('joins the selected labels on a multiple select and keeps the control an array', async () => {
    mount({ name: 'choice', placeholder: 'Choice', multiple: true }, new UntypedFormControl(['a', 'b']));
    expect(q('hlm-select-multiple')).toBeTruthy();
    expect(trigger().textContent.trim()).toBe('Alpha, Beta');
    await open();
    items()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(group.controls.choice.value).toEqual(['b']);
    expect(trigger().textContent.trim()).toBe('Beta');
  });

  // the internal development record: options can arrive after the value -- System -> General pushes the GUI certificate
  // choices into the config when their own middleware call returns, after the form value is written. The
  // closed field must then name the option, not show the raw value ("1" instead of "freenas_default").
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('names the value once options pushed in after it arrive, as System -> General loads the certificate', async () => {
    const late: any[] = [];
    mount({ name: 'cert', placeholder: 'Certificate', options: late }, new UntypedFormControl('1'));
    await settle();
    expect(trigger().textContent.trim()).toBe('1'); // nothing to name it with yet
    late.push({ label: 'freenas_default', value: '1' }); // pushed in place, as general.component does
    await settle();
    expect(trigger().textContent.trim()).toBe('freenas_default');
  });

  it('names the value once the options are replaced after it, and joins late labels on a multiple select', async () => {
    mount({ name: 'cert', placeholder: 'Certificate', options: [] }, new UntypedFormControl('2'));
    await settle();
    component.config.options = [{ label: 'freenas_default', value: '1' }, { label: 'acme', value: '2' }];
    await settle();
    expect(trigger().textContent.trim()).toBe('acme');

    fixture.destroy();
    fixture = TestBed.createComponent(FormSelectComponent);
    component = fixture.componentInstance;
    const late: any[] = [];
    mount({ name: 'certs', placeholder: 'Certificates', multiple: true, options: late }, new UntypedFormControl(['1', '2']));
    await settle();
    late.push({ label: 'freenas_default', value: '1' }, { label: 'acme', value: '2' });
    await settle();
    expect(trigger().textContent.trim()).toBe('freenas_default, acme');
  });

  it('paints an invalid touched control red and lists the shared error line', async () => {
    mount({ name: 'choice', placeholder: 'Choice', required: true }, new UntypedFormControl(null, Validators.required));
    expect(getComputedStyle(trigger()).borderTopColor).toBe('rgb(42, 53, 61)');
    group.controls.choice.markAsTouched();
    fixture.detectChanges();
    expect(trigger().getAttribute('data-matches-spartan-invalid')).toBe('true');
    // the box transitions its border over 120ms; read the settled colour
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(getComputedStyle(trigger()).borderTopColor).toBe('rgb(227, 98, 90)');
    expect(q('.form-error-line').textContent).toContain('is required.');
  });

  it('keeps the inlineLabel row: the name on the left, the field in the slot beside it', () => {
    mount({ name: 'level', placeholder: 'Level', inlineLabel: 'Disk temperature', showLabel: false } as Partial<FieldConfig>);
    const row = q('#level');
    expect(row.classList).toContain('inline-label');
    expect(getComputedStyle(row).display).toBe('flex');
    expect(q('.label.half-width').textContent).toBe('Disk temperature');
    const field = q('hlm-field');
    expect(field.classList).toContain('half-width');
    expect(q('label[data-slot="field-label"]')).toBeNull();
    expect(field.getBoundingClientRect().left).toBeGreaterThanOrEqual(q('.label.half-width').getBoundingClientRect().right);
  });
});
