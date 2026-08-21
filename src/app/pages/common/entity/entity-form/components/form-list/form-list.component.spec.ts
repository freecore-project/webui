import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { RestService, WebSocketService } from 'app/services';
import { FieldConfig } from '../../models/field-config.interface';
import { EntityFormService } from '../../services/entity-form.service';
import { DynamicFieldDirective } from '../dynamic-field/dynamic-field.directive';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormInputComponent } from '../form-input/form-input.component';
import { FormListComponent } from './form-list.component';

// the internal development record: the list field's row actions on spartan -- ghost tier, compact -- with the
// FormArray / listFields contract the eleven consumer pages rely on. Fallback ladder: fg2 #97A6AE.
describe('form-list on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormListComponent>;
  let component: FormListComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const template = () => [
    { type: 'input', name: 'address', placeholder: 'Address', width: '50%' },
    { type: 'input', name: 'netmask', placeholder: 'Netmask', width: '50%' },
  ];

  const mount = (config: Partial<FieldConfig>): void => {
    const listFields = [];
    group = new UntypedFormGroup({ [config.name]: new UntypedFormArray([]) });
    component.config = { type: 'list', templateListField: template(), listFields, ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
    tick(); // ngOnInit adds the first row on a setTimeout
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormListComponent, FormInputComponent, FormErrorsComponent, DynamicFieldDirective, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmButtonImports, HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmLabelImports],
      providers: [EntityFormService, { provide: WebSocketService, useValue: {} }, { provide: RestService, useValue: {} }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormListComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  it('adds the first row itself and keeps the FormArray and listFields in step through add and delete', fakeAsync(() => {
    mount({ name: 'aliases', placeholder: 'Aliases' });
    const array = group.controls.aliases as UntypedFormArray;
    expect(array.length).toBe(1);
    expect(component.config.listFields.length).toBe(1);
    expect(qa('.form-list-item-layout').length).toBe(1);
    expect(qa('.form-list-item-layout hlm-input-group').length).toBe(2); // the two template fields rendered
    (q('[ix-auto="button__ADD"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(array.length).toBe(2);
    expect(component.config.listFields.length).toBe(2);
    expect(qa('.form-list-item-layout').length).toBe(2);
    // the second row carries Delete, the first Add
    expect(qa('.form-list-item-layout')[1].querySelector('[ix-auto="button__DELETE"]')).not.toBeNull();
    (qa('.form-list-item-layout')[1].querySelector('[ix-auto="button__DELETE"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(array.length).toBe(1);
    expect(component.config.listFields.length).toBe(1);
    expect(q('mat-error')).toBeNull();
    expect(q('.mat-mdc-button')).toBeNull();
  }));

  const ghost = (button: HTMLElement, label: string): void => {
    const style = getComputedStyle(button);
    expect(button.getAttribute('data-slot')).withContext(label).toBe('button');
    expect(button.classList).withContext(label).toContain('listBtn');
    expect(button.getBoundingClientRect().height).withContext(label).toBe(32);
    expect(style.borderTopLeftRadius).withContext(label).toBe('6px');
    expect(style.borderTopColor).withContext(label).toBe('rgba(0, 0, 0, 0)');
    expect(style.backgroundColor).withContext(label).toBe('rgba(0, 0, 0, 0)');
    expect(style.color).withContext(label).toBe('rgb(151, 166, 174)');
    expect(style.paddingLeft).withContext(label).toBe('3px');
    expect(style.position).withContext(label).toBe('relative');
  };

  it('draws Add and Delete in the compact ghost tier: 32px, 3px inset, fg2 text, no border, no Material', fakeAsync(() => {
    mount({ name: 'aliases', placeholder: 'Aliases' });
    const add = q('[ix-auto="button__ADD"]') as HTMLButtonElement;
    expect(add.type).toBe('button');
    ghost(add, 'Add');
    add.click();
    fixture.detectChanges();
    ghost(qa('[ix-auto="button__DELETE"]')[0], 'Delete');
  }));

  it('keeps the jail-form row budget: 30/50/20 sized fields leave 48px and the action cell stays inside the row', fakeAsync(() => {
    const jailTemplate = [
      { type: 'select', name: 'iface', placeholder: 'Interface', width: '30%' },
      { type: 'input', name: 'address', placeholder: 'Address', width: '50%' },
      { type: 'input', name: 'netmask', placeholder: 'Netmask', width: '20%' },
    ].map((field) => ({ ...field, type: 'input' }));
    mount({ name: 'ip4_addr', placeholder: 'IPv4', templateListField: jailTemplate } as Partial<FieldConfig>);
    (q('[ix-auto="button__ADD"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    qa('.form-list-item-layout').forEach((row, i) => {
      const action = row.querySelector('.list-action').getBoundingClientRect();
      expect(action.right).withContext(`row ${i}`).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5);
      const fields = Array.from(row.querySelectorAll('.form-list-field-layout'));
      expect(action.left).withContext(`row ${i}`).toBeGreaterThanOrEqual(fields[fields.length - 1].getBoundingClientRect().right);
    });
  }));

  it('renders the deleteButtonOnFirst branch: Add only on the last row with its id, Delete disabled at one row', fakeAsync(() => {
    mount({ name: 'acl', placeholder: 'ACL', deleteButtonOnFirst: true, addBtnMessage: 'Add ACL Item' } as Partial<FieldConfig>);
    const add = q('[ix-auto="button__ADD ACL ITEM"]') as HTMLButtonElement;
    expect(add).not.toBeNull();
    expect(add.id).toBe('acl0');
    expect(add.textContent.trim()).toBe('Add ACL Item');
    const del = q('[ix-auto="button__DELETE"]') as HTMLButtonElement;
    expect(del.disabled).toBeTrue();
    expect(getComputedStyle(del).opacity).toBe('0.4');
    // the named Add carries no .listBtn (it never did): the ghost tier at its own 14px
    expect(getComputedStyle(add).paddingLeft).toBe('14px');
    expect(getComputedStyle(add).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(add).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    add.click();
    fixture.detectChanges();
    expect(qa('[ix-auto^="button__ADD"]').length).toBe(1);
    expect(qa('[ix-auto^="button__ADD"]')[0].id).toBe('acl1');
    expect((qa('[ix-auto="button__DELETE"]')[0] as HTMLButtonElement).disabled).toBeFalse();
    ghost(qa('[ix-auto="button__DELETE"]')[0], 'Delete');
  }));

  it('follows a disabled row, hides the actions on hideButton, and lists server-side errors as the shared line', fakeAsync(() => {
    mount({ name: 'aliases', placeholder: 'Aliases', hasErrors: true, errors: 'Overlapping subnet.' } as Partial<FieldConfig>);
    expect(q('.form-error-line').textContent).toContain('Overlapping subnet.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
    (group.controls.aliases as UntypedFormArray).at(0).disable();
    fixture.detectChanges();
    expect((q('[ix-auto="button__ADD"]') as HTMLButtonElement).disabled).toBeTrue();
  }));

  it('renders no actions on hideButton (the consumer adds rows itself)', fakeAsync(() => {
    mount({ name: 'hosts', placeholder: 'Hosts', hideButton: true } as Partial<FieldConfig>);
    expect(q('.list-action')).toBeNull();
    expect(qa('.form-list-item-layout').length).toBe(1);
    expect(q('[ix-auto="list__Hosts"]')).not.toBeNull();
  }));
});
