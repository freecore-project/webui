import { Component, OnInit } from '@angular/core';
import { ViewChartComponent, ViewChartMetadata, ChartData } from 'app/core/components/viewchart/viewchart.component';
import { ViewChartDonutComponent } from 'app/core/components/viewchartdonut/viewchartdonut.component';

@Component({
  selector: 'viewchartpie',
  template: ViewChartMetadata.template,
  // templateUrl: './viewchartpie.component.html',
  styleUrls: ['./viewchartpie.component.css'],
})
export class ViewChartPieComponent extends ViewChartDonutComponent implements OnInit {
  constructor() {
    super();
    // See ViewChartDonutComponent: chartType is an accessor on ViewChartComponent,
    // so it is assigned here rather than as a property initializer (TS2610).
    this.chartType = 'pie';
  }

  ngOnInit() {
  }
}
