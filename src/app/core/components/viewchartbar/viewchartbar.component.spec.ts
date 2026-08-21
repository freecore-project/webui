import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartBarComponent } from './viewchartbar.component';

describe('ViewChartBarComponent', () => {
  let component: ViewChartBarComponent;
  let fixture: ComponentFixture<ViewChartBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartBarComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartBarComponent);
    component = fixture.componentInstance;
    component.config = {
      label: false,
      units: '%',
      data: [{ coreNumber: 0, usage: 0 }],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
