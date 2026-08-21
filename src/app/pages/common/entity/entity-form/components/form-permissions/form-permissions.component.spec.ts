import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { FormPermissionsComponent } from './form-permissions.component';

// the internal development record: the mode matrix on spartan -- nine #394 checkboxes writing the octal the
// consumers read. Fallback ladder: fg1 #DCE3E6, bg0 #0B0F13, fg2 #97A6AE, red #E3625A.
describe('form-permissions on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormPermissionsComponent>;
  let component: FormPermissionsComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const box = (id: string): HTMLElement => q(`[ix-auto="checkbox__${id}"] button[role="checkbox"]`);
  const state = (): string => ['ownerRead', 'ownerWrite', 'ownerExec', 'groupRead', 'groupWrite', 'groupExec', 'otherRead', 'otherWrite', 'otherExec']
    .map((k) => (box(`mode_${k}`)?.getAttribute('data-state') === 'checked' ? '1' : '0')).join('');
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'permissions', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormPermissionsComponent, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmCheckboxImports, HlmFieldImports, HlmLabelImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormPermissionsComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('renders the matrix in the #394 cells from an octal value, labelled, Material-free', () => {
    mount({ name: 'mode', placeholder: 'Mode' }, new UntypedFormControl('755'));
    expect(q('label').textContent.trim()).toBe('Mode');
    expect(getComputedStyle(q('label')).fontSize).toBe('12px');
    expect(q('[ix-auto="permissions__Mode"]')).not.toBeNull();
    expect(q('input[type="hidden"][ix-auto="input__Mode"]')).not.toBeNull();
    expect(qa('hlm-checkbox').length).toBe(9);
    expect(state()).toBe('111101101'); // 7 5 5
    const cell = q('.checkbox-cell');
    expect(cell.getBoundingClientRect().height).toBe(32);
    expect(cell.getBoundingClientRect().width).toBe(32);
    const b = box('mode_ownerRead');
    expect(b.getBoundingClientRect().width).toBe(16);
    expect(getComputedStyle(b).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(b).color).toBe('rgb(11, 15, 19)');
    expect(getComputedStyle(q('label')).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(q('.form-permissions-what td:nth-child(2)')).color).toBe('rgb(151, 166, 174)');
    expect(q('.form-permissions-what td:nth-child(2)').textContent.trim()).toBe('Read');
    expect(q('.form-permissions-what').getBoundingClientRect().height).toBe(20);
    expect(qa('.form-permissions-matrix tr').slice(1).map((tr) => tr.getBoundingClientRect().height)).toEqual([32, 32, 32]);
    // each header word centred over its column's boxes, whatever the word's width (Execute > 32px)
    ['Read', 'Write', 'Exec'].forEach((what, i) => {
      const h = q(`.form-permissions-what td:nth-child(${i + 2})`).getBoundingClientRect();
      const bx = box(`mode_owner${what}`).getBoundingClientRect();
      expect(Math.abs((h.left + (h.width - 12) / 2) - (bx.left + bx.width / 2))).toBeLessThanOrEqual(1);
    });
    const who = q('.form-permissions-who');
    expect(getComputedStyle(who).fontSize).toBe('13px');
    expect(getComputedStyle(who).paddingRight).toBe('16px');
    expect(box('mode_ownerRead').getBoundingClientRect().left - who.getBoundingClientRect().right).toBe(8);
    expect(b.tabIndex).toBe(0);
    expect(b.getAttribute('aria-checked')).toBe('true');
    expect(q('mat-checkbox')).toBeNull();
    expect(q('mat-form-field')).toBeNull();
    expect(q('mat-error')).toBeNull();
  });

  it('writes the octal back on a toggle and follows an external value', async () => {
    mount({ name: 'mode', placeholder: 'Mode' }, new UntypedFormControl('755'));
    box('mode_otherWrite').click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.mode.value).toBe('757');
    expect((q('input[type="hidden"]') as HTMLInputElement).value).toBe('757');
    expect(state()).toBe('111101111');
    expect(box('mode_otherWrite').getAttribute('aria-checked')).toBe('true');
    box('mode_ownerExec').click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.mode.value).toBe('657');
    expect(box('mode_ownerExec').getAttribute('aria-checked')).toBe('false');
    // the 32px cell is the hit area, as Material's state layer was
    qa('.checkbox-cell')[0].click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.mode.value).toBe('257');
    expect(state()).toBe('010101111');
    group.controls.mode.setValue('640');
    fixture.detectChanges();
    await settle();
    expect(state()).toBe('110100000');
  });

  it('keeps the hidden digit under noexec: the octal stays three wide and Other round-trips', async () => {
    mount({ name: 'umask', placeholder: 'umask', noexec: true } as Partial<FieldConfig>, new UntypedFormControl('755'));
    expect(qa('hlm-checkbox').length).toBe(6);
    box('umask_ownerExec').click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.umask.value).toBe('655');
  });

  it('drops the Other row under noexec and lists errors as the shared line', async () => {
    mount({ name: 'mode', placeholder: 'Mode', noexec: true, hasErrors: true, errors: 'Bad mode.' } as Partial<FieldConfig>, new UntypedFormControl('750'));
    expect(qa('hlm-checkbox').length).toBe(6);
    expect(q('[ix-auto="checkbox__mode_otherRead"]')).toBeNull();
    expect(q('.form-error-line').textContent).toContain('Bad mode.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
    box('mode_groupWrite').click();
    fixture.detectChanges();
    await settle();
    expect(group.controls.mode.value).toBe('770');
  });
});
