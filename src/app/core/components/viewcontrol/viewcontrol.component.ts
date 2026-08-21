import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { CoreEvent } from 'app/core/services/core.service';
import { ViewControl } from 'app/core/classes/viewcontrol';

@Component({
  standalone: false,
  selector: 'viewcontrol',
  templateUrl: './viewcontrol.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./viewcontrol.component.css'],
})
export class ViewControlComponent extends ViewControl {
  readonly componentName = ViewControlComponent;

  constructor() {
    super();
  }

  ngOnInit() {
  }
}
