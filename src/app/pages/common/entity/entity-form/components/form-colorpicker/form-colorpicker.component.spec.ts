import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { ColorPickerDirective } from 'ngx-color-picker';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormColorpickerComponent } from './form-colorpicker.component';

// the internal development record: the colour field on the #351 box, the swatch as its inline-start addon; the
// ngx-color-picker directive keeps its own hidden input and the control.
describe('form-colorpicker on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormColorpickerComponent>;
  let component: FormColorpickerComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('#123456')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'colorpicker', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormColorpickerComponent, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), ColorPickerDirective, HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmLabelImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormColorpickerComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '180px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('draws the #351 box with the swatch as its addon showing the control colour, Material-free', () => {
    mount({ name: 'bg1', placeholder: 'Background 1' });
    expect(q('label').textContent.trim()).toBe('Background 1');
    expect(q('label').getAttribute('for')).toBe('bg1-input');
    const boxEl = q('hlm-input-group');
    expect(boxEl.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(boxEl).borderTopColor).toBe('rgb(42, 53, 61)');
    const swatch = q('.color-swatch') as HTMLButtonElement;
    expect(swatch.type).toBe('button');
    const g = boxEl.getBoundingClientRect();
    const s = swatch.getBoundingClientRect();
    expect(s.width).toBe(20);
    expect(s.height).toBe(20);
    expect(s.left - g.left).toBe(9); // the hairline + the addon's 8px gutter, as a glyph gets
    expect(Math.abs((s.top + s.height / 2) - (g.top + g.height / 2))).toBeLessThanOrEqual(0.5);
    expect(getComputedStyle(swatch).backgroundColor).toBe('rgb(18, 52, 86)');
    expect(getComputedStyle(swatch).borderTopLeftRadius).toBe('50%');
    expect(q('hlm-input-group-addon').contains(swatch)).toBeTrue();
    const text = q('#bg1-input') as HTMLInputElement;
    expect(text.value).toBe('#123456');
    expect(q('[ix-auto="colorpicker__Background 1"]')).not.toBeNull();
    expect(q('.color-picker-anchor')).not.toBeNull();
    expect(q('mat-form-field')).toBeNull();
    expect(q('mat-error')).toBeNull();
  });

  it('writes a typed hex into the control and repaints the swatch; the swatch opens the picker under the box', async () => {
    mount({ name: 'fg1', placeholder: 'Foreground 1' });
    const text = q('#fg1-input') as HTMLInputElement;
    text.value = '#abcdef';
    text.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(group.controls.fg1.value).toBe('#abcdef');
    expect(getComputedStyle(q('.color-swatch')).backgroundColor).toBe('rgb(171, 205, 239)');
    expect(component.picker).toBeFalse();
    expect(q('.color-picker')).toBeNull();
    (q('.color-swatch') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.picker).toBeTrue();
    await new Promise((resolve) => setTimeout(resolve, 100));
    fixture.detectChanges();
    // the popup is a #354 surface 10px under the box, flush left, no arrow, no shadow
    const popup = q('.color-picker');
    expect(popup).not.toBeNull();
    expect(getComputedStyle(popup).display).toBe('block');
    const g = q('hlm-input-group').getBoundingClientRect();
    const p = popup.getBoundingClientRect();
    expect(Math.round(p.top - g.bottom)).toBe(10);
    expect(Math.round(p.left - g.left)).toBe(0);
    expect(getComputedStyle(popup).backgroundColor).not.toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(popup).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(popup).boxShadow).toBe('none');
    expect(getComputedStyle(popup).borderTopLeftRadius).toBe('6px');
    const arrow = popup.querySelector('.arrow');
    expect(arrow === null || getComputedStyle(arrow).display === 'none').toBeTrue();
    // a pick reaches the control, the text, the directive's own input and the swatch
    const dir = fixture.debugElement.query(By.directive(ColorPickerDirective)).injector.get(ColorPickerDirective);
    dir.colorPickerChange.emit('#ff0000');
    fixture.detectChanges();
    expect(group.controls.fg1.value).toBe('#ff0000');
    expect(text.value).toBe('#ff0000');
    expect((q('.color-picker-anchor') as HTMLInputElement).value).toBe('#ff0000');
    expect(getComputedStyle(q('.color-swatch')).backgroundColor).toBe('rgb(255, 0, 0)');
    // closing from the directive's side keeps `picker` in step, so the next swatch click opens again
    dir.cpToggleChange.emit(false); // an async emitter
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(component.picker).toBeFalse();
    group.controls.fg1.setValue('#000000');
    fixture.detectChanges();
    expect(text.value).toBe('#000000');
  });

  it('lists server-side errors as the shared line', () => {
    mount({ name: 'bg2', placeholder: 'Background 2', hasErrors: true, errors: 'Not a colour.' } as Partial<FieldConfig>);
    expect(q('.field-subscript .form-error-line').textContent).toContain('Not a colour.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
    expect(getComputedStyle(q('hlm-input-group')).borderTopColor).toBe('rgb(227, 98, 90)');
  });
});
