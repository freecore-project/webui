import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ChartData, ViewChartComponent, ViewChartMetadata } from 'app/core/components/viewchart/viewchart.component';
import { ViewChartDonutComponent } from 'app/core/components/viewchartdonut/viewchartdonut.component';

@Component({
  standalone: false,
  selector: 'viewchartpie',
  template: ViewChartMetadata.template,
  // templateUrl: './viewchartpie.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./viewchartpie.component.css', '../viewchart/viewchart-layout.css'],
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
