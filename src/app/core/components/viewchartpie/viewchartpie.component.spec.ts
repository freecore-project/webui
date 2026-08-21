import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartPieComponent } from './viewchartpie.component';

describe('ViewChartPieComponent', () => {
  let component: ViewChartPieComponent;
  let fixture: ComponentFixture<ViewChartPieComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartPieComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartPieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
