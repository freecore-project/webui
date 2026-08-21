// import { Component } from '@angular/core';
import { CoreEvent } from 'app/core/services/core.service';
import { Subject } from 'rxjs';

export abstract class View {
  superView = false; // if this is the top level view in the ViewController
  subViews?: any[]; // Component reference to child components
  viewController: Subject<CoreEvent>;// (Send actions back to ViewController via this Subject)

  // Declared as an accessor rather than a plain property: subclasses (ViewComponent,
  // LineChartComponent) override `data` with get/set, which TypeScript 4.0 rejects
  // when the base declares it as a property (TS2611).
  protected _data: any = <any>{};

  get data(): any {
    return this._data;
  }

  set data(value: any) {
    this._data = value;
  }

  constructor() {}
}
