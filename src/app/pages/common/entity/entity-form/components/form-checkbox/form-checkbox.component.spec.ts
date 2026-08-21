import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { FieldConfig } from '../../models/field-config.interface';
import { FormCheckboxComponent } from './form-checkbox.component';

// the internal development record: the real renderer on spartan's checkbox, measured like the #352 spec.
// Fallback ladder (no theme service in karma): fg1 #DCE3E6, bg0 #0B0F13, fg2 #97A6AE.
describe('form-checkbox on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormCheckboxComponent>;
  let component: FormCheckboxComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  // the box is the button brn renders; brn-checkbox itself is display:contents
  const box = (): HTMLElement => q('button[role="checkbox"]');
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl(false)): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'checkbox', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormCheckboxComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmCheckboxImports, HlmLabelImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormCheckboxComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('draws the #352 box in a 32px row: 16px, 4px radius, fg2/70 hairline, the label 13px fg1 with a 6px lead', () => {
    mount({ name: 'enable', placeholder: 'Enable service' });
    const row = q('.checkbox-row').getBoundingClientRect();
    const cell = q('.checkbox-cell').getBoundingClientRect();
    const b = box().getBoundingClientRect();
    expect(row.height).toBe(32);
    expect(cell.width).toBe(32);
    expect(b.width).toBe(16);
    expect(b.height).toBe(16);
    expect(b.left - cell.left).toBe(8);
    const style = getComputedStyle(box());
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopLeftRadius).toBe('4px');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const label = q('label');
    expect(label.getAttribute('for')).toBe('enable-checkbox');
    expect(box().id).toBe('enable-checkbox');
    expect(label.textContent.trim()).toBe('Enable service');
    expect(getComputedStyle(label).fontSize).toBe('13px');
    expect(getComputedStyle(label).fontWeight).toBe('400');
    expect(getComputedStyle(label).color).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(label).paddingLeft).toBe('6px');
    expect(label.getBoundingClientRect().left).toBe(cell.right);
  });

  it('checks in mono -- fg1 fill, bg0 mark -- and writes the control both ways', async () => {
    mount({ name: 'enable', placeholder: 'Enable service' });
    expect(box().getAttribute('data-state')).toBe('unchecked');
    box().click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.enable.value).toBeTrue();
    expect(box().getAttribute('data-state')).toBe('checked');
    expect(getComputedStyle(box()).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(box()).color).toBe('rgb(11, 15, 19)');
    expect(box().querySelector('ng-icon')).toBeTruthy();
    group.controls.enable.setValue(false);
    fixture.detectChanges();
    expect(box().getAttribute('data-state')).toBe('unchecked');
  });

  it('carries the hooks: ix-auto, the updater callback on click, and the config id', () => {
    const updater = jasmine.createSpy('updater');
    mount({ name: 'sync', id: 'sync-box', placeholder: 'Sync', required: true, updater, parent: {} } as Partial<FieldConfig>);
    expect(box().id).toBe('sync-box');
    expect(q('hlm-checkbox').classList).toContain('updater');
    q('hlm-checkbox').click();
    expect(updater).toHaveBeenCalled();
    expect(q('hlm-checkbox').getAttribute('ix-auto-type') ?? q('hlm-checkbox.updater')).toBeTruthy();
  });

  it('lists server-side errors as the shared error line', () => {
    mount({ name: 'enable', placeholder: 'Enable', hasErrors: true, errors: 'Cannot enable.' } as Partial<FieldConfig>);
    expect(q('.form-error-line').textContent).toContain('Cannot enable.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
  });
});
