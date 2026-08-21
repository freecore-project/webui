import { Component } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ViewControllerComponent } from './viewcontroller.component';

@Component({
  selector: 'display',
  template: '',
})
class DisplayStubComponent {}

describe('ViewControllerComponent', () => {
  let component: ViewControllerComponent;
  let fixture: ComponentFixture<ViewControllerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DisplayStubComponent, ViewControllerComponent],
      imports: [FlexLayoutModule],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
