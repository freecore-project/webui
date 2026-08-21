import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { Subject } from 'rxjs';
import { ControlConfig } from '../../models/control-config.interface';
import { Control } from '../../models/control.interface';

@Component({
  standalone: false,
  selector: 'toolbar-menu',
  styleUrls: ['toolbar-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'toolbar-menu.component.html',
})
export class ToolbarMenuComponent {
  @Input() config?: ControlConfig;
  @Input() controller: Subject<any>;
  constructor(public translate: TranslateService) {}

  onClick(value) {
    this.config.value = value;
    const message: Control = { name: this.config.name, value: this.config.value };
    this.controller.next(message);
  }
}
