import { OverlayContainer } from '@angular/cdk/overlay';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormComboboxComponent } from './form-combobox.component';

// the internal development record: the combobox renderer on spartan's autocomplete. The control is the typed
// text; a picked suggestion writes its value into it; the trigger lists every option.
describe('form-combobox on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormComboboxComponent>;
  let component: FormComboboxComponent;
  let group: UntypedFormGroup;
  let overlay: OverlayContainer;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const input = (): HTMLInputElement => q('#user-input') as HTMLInputElement;
  const items = (): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll('hlm-autocomplete-item')) as HTMLElement[];
  const options = [{ label: 'root', value: 'root' }, { label: 'admin', value: 'admin' }, { label: 'operator', value: 'operator' }];
  const flush = async (): Promise<void> => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'combobox', options, searchOptions: [], ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormComboboxComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmAutocompleteImports, HlmFieldImports, HlmInputGroupImports, HlmLabelImports, HlmSelectImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormComboboxComponent);
    component = fixture.componentInstance;
    overlay = TestBed.inject(OverlayContainer);
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  afterEach(() => overlay.ngOnDestroy());

  it('draws the #351 box with the chevron trigger inside its right end, labelled by the field label', () => {
    mount({ name: 'user', placeholder: 'User' }, new UntypedFormControl('root'));
    expect(q('label').getAttribute('for')).toBe('user-input');
    expect(input().value).toBe('root');
    const box = q('hlm-autocomplete-input');
    expect(box.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(16, 21, 26)');
    const trigger = q('.combobox-trigger');
    expect(trigger.id).toBe('user-select');
    expect(q('.combobox-trigger [data-slot="select-chevron"]').getBoundingClientRect().width).toBe(16);
    expect(box.getBoundingClientRect().right - trigger.getBoundingClientRect().right).toBeLessThan(8);
    expect(q('hlm-field').getBoundingClientRect().height).toBe(72);
  });

  it('keeps the control as the typed text and lists the search results while typing', async () => {
    mount({ name: 'user', placeholder: 'User' });
    input().value = 'ad';
    input().dispatchEvent(new Event('input'));
    await flush();
    expect(group.controls.user.value).toBe('ad');
    component.updateSearchOptions('ad');
    await flush();
    expect(items().map((item) => item.textContent.trim())).toEqual(['admin']);
  });

  it('writes a picked suggestion into the text and the control', async () => {
    mount({ name: 'user', placeholder: 'User' });
    input().value = 'op';
    input().dispatchEvent(new Event('input'));
    component.updateSearchOptions('op');
    await flush();
    items()[0].click();
    await flush();
    expect(group.controls.user.value).toBe('operator');
    expect(input().value).toBe('operator');
  });

  it('lists every option from the trigger, whatever is typed', async () => {
    mount({ name: 'user', placeholder: 'User' }, new UntypedFormControl('zzz'));
    q('.combobox-trigger').click();
    await flush();
    expect(items().map((item) => item.textContent.trim())).toEqual(['root', 'admin', 'operator']);
  });
});
