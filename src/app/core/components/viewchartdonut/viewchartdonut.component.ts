import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ViewChartComponent, ViewChartMetadata } from 'app/core/components/viewchart/viewchart.component';
// import * as c3 from 'c3';

@Component({
  standalone: false,
  selector: 'viewchartdonut',
  template: `
      <div class="viewchart-wrapper {{chartClass}}-wrapper viewchart-donut-root-layout">

        @if (chartLoaded && legendPosition == 'top') {
          <div class="legend-wrapper">
            @if (chartConfig.data.x) {
              <div class="legend-x legend-item">Time: @if (showLegendValues) {
                <span class="legend-item-time">{{legend[0].x}}</span>
              }</div>
            }
            <div class="legend-html">
              @for (item of legend; track item; let i = $index) {
                @if (legendPosition == 'top') {
                  <div class="legend-item" (click)="focus(legend[i])" [ngClass]="{'legend-item-disabled':!legend[i].visible}">
                    <span class="legend-swatch" [style.background-color]="legend[i].swatch"></span>
                    <span class="legend-name">{{legend[i].name}}: </span>
                    <div class="legend-value" [style.color]="legend[i].swatch">@if (showLegendValues) {
                      <span>{{legend[i].value | number : '1.2-2'}}{{units}}</span>
                    }</div>
                  </div>
                }
              }
            </div>
          </div>
        }

        <div id="{{chartId}}" [ngClass]="chartClass" class="viewchart-donut-half-layout"></div>

        @if (chartLoaded && legendPosition == 'right') {
          <div class="legend-wrapper viewchart-donut-half-layout">
            @if (chartConfig.data.x) {
              <div class="legend-x legend-item">Time: @if (showLegendValues) {
                <span class="legend-item-time">{{legend[0].x}}</span>
              }</div>
            }
            <div class="legend-html">
              @for (item of legend; track item; let i = $index) {
                <div class="legend-item viewchart-donut-right-item-layout" (click)="focus(legend[i])" [ngClass]="{'legend-item-disabled':!legend[i].visible}">
                  <span class="legend-swatch" [style.background-color]="legend[i].swatch"></span>
                  <span class="legend-name">{{legend[i].name}}: </span>
                  <div class="legend-value" [style.color]="legend[i].swatch">@if (showLegendValues) {
                    <span>{{legend[i].value | number : '1.2-2'}}{{units}}</span>
                  }</div>
                </div>
              }
            </div>
          </div>
        }

      </div>
      `,
  // template:ViewChartDonutMetadata.template
  // templateUrl: './viewchartpie.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../viewchart/viewchart-layout.css', './viewchartdonut-layout.scss'],
})
export class ViewChartDonutComponent extends ViewChartComponent implements OnInit {
  title = '';
  legendPosition = 'right'; // Valid positions are top or right

  constructor() {
    super();
    // ViewChartComponent declares chartType as an accessor, so this cannot be a
    // property initializer under TypeScript 4.0 (TS2610). Assigning here keeps the
    // original ordering: the base constructor sets 'pie', then this overrides it.
    this.chartType = 'donut';
  }

  ngOnInit() {
    this.showLegendValues = true;
  }

  makeConfig() {
    this.chartConfig = {
      bindto: '#' + this._chartId,
      data: {
        columns: this._data,
        type: this.chartType,
      },
      donut: {
        title: this.title,
        width: 15,
        label: {
          show: false,
        },
      },
      size: {
        width: this.width,
        height: this.height,
      },
      tooltip: {
        format: {
          value: (value, ratio, id, index) => {
            if (this.units) {
              console.log('Units = ' + this.units);
              return value + this.units;
            }
            return value;
          },
        },
      },
    };
    this.tooltipOptions = {
      show: false,
    };
    return this.chartConfig;
  }
}
