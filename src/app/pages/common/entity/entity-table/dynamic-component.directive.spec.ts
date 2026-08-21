import { Component, ComponentRef, Type, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DynamicComponentDirective } from './dynamic-component.directive';

@Component({
  standalone: false,
  selector: 'dynamic-component-test-child',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '{{ config.label }}',
})
class DynamicComponentTestChildComponent {
  config: { label: string };
  parent: unknown;
}

@Component({
  standalone: false,
  selector: 'dynamic-component-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ng-template
      dynamicComponent
      [component]="componentType"
      [config]="config"
      [parent]="parent"
    ></ng-template>
  `,
})
class DynamicComponentTestHostComponent {
  @ViewChild(DynamicComponentDirective, { static: true }) directive: DynamicComponentDirective;

  componentType: Type<DynamicComponentTestChildComponent> = DynamicComponentTestChildComponent;
  config = { label: 'Dynamic table child' };
  parent = { name: 'entity-table' };
}

describe('DynamicComponentDirective', () => {
  let fixture: ComponentFixture<DynamicComponentTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        DynamicComponentDirective,
        DynamicComponentTestChildComponent,
        DynamicComponentTestHostComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DynamicComponentTestHostComponent);
    fixture.detectChanges();
  });

  it('creates the supplied type and assigns its legacy inputs', () => {
    const host = fixture.componentInstance;
    const componentRef = host.directive.component as ComponentRef<DynamicComponentTestChildComponent>;

    expect(componentRef.instance).toEqual(jasmine.any(DynamicComponentTestChildComponent));
    expect(componentRef.instance.config).toBe(host.config);
    expect(componentRef.instance.parent).toBe(host.parent);
    expect(fixture.nativeElement.querySelector('dynamic-component-test-child').textContent.trim())
      .toBe('Dynamic table child');
  });
});
