import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartGaugeComponent } from './viewchartgauge.component';

describe('ViewChartGaugeComponent', () => {
  let component: ViewChartGaugeComponent;
  let fixture: ComponentFixture<ViewChartGaugeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartGaugeComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartGaugeComponent);
    component = fixture.componentInstance;
    component.config = {
      label: false,
      units: '%',
      diameter: 120,
      fontSize: 16,
      data: ['usage', 0],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
