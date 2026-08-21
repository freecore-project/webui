import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartLineComponent } from './viewchartline.component';

describe('ViewChartLineComponent', () => {
  let component: ViewChartLineComponent;
  let fixture: ComponentFixture<ViewChartLineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartLineComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
