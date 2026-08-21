import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartComponent } from './viewchart.component';

describe('ViewChartComponent', () => {
  let component: ViewChartComponent;
  let fixture: ComponentFixture<ViewChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
