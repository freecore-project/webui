import { ComponentRef, ViewContainerRef } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { FormInputComponent } from '../form-input/form-input.component';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { DynamicFieldDirective } from './dynamic-field.directive';

describe('DynamicFieldDirective', () => {
  let componentRef: ComponentRef<Field>;
  let container: ViewContainerRef;
  let createComponent: jasmine.Spy;
  let directive: DynamicFieldDirective;

  beforeEach(() => {
    componentRef = {
      instance: {} as Field,
    } as ComponentRef<Field>;
    createComponent = jasmine.createSpy('createComponent').and.returnValue(componentRef);
    container = { createComponent } as unknown as ViewContainerRef;
    directive = new DynamicFieldDirective(container);
  });

  it('creates the mapped field type and propagates initial and changed inputs', () => {
    const initialConfig = { name: 'username', type: 'input' } as FieldConfig;
    const initialGroup = new UntypedFormGroup({});

    directive.config = initialConfig;
    directive.group = initialGroup;
    directive.fieldShow = 'show';
    directive.ngOnInit();

    expect(createComponent).toHaveBeenCalledOnceWith(FormInputComponent);
    expect(componentRef.instance.config).toBe(initialConfig);
    expect(componentRef.instance.group).toBe(initialGroup);
    expect(componentRef.instance.fieldShow).toBe('show');

    const changedConfig = { name: 'account', type: 'input' } as FieldConfig;
    const changedGroup = new UntypedFormGroup({});
    directive.config = changedConfig;
    directive.group = changedGroup;
    directive.fieldShow = 'hide';
    directive.ngOnChanges();

    expect(componentRef.instance.config).toBe(changedConfig);
    expect(componentRef.instance.group).toBe(changedGroup);
    expect(componentRef.instance.fieldShow).toBe('hide');
  });

  it('rejects unsupported field types before creating a component', () => {
    directive.config = { name: 'unknown', type: 'unsupported' } as FieldConfig;

    expect(() => directive.ngOnInit()).toThrowError(/Trying to use an unsupported type/);
    expect(createComponent).not.toHaveBeenCalled();
  });
});
