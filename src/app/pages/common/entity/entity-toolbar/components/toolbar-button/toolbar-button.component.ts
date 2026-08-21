import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

// import {FieldConfig} from '../../models/field-config.interface';
// import {Field} from '../../models/field.interface';
import { Control } from '../../models/control.interface';
import { ControlConfig } from '../../models/control-config.interface';
import { Subject } from 'rxjs';

@Component({
  standalone: false,
  selector: 'toolbar-button',
  styleUrls: ['toolbar-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      class="toolbar-button">
      <!-- the internal development record: the ghost tier (the Reporting bar is the text tier) -->
      <button
        hlmBtn variant="ghost" type="button"
        (click)="onClick(true)"
        id="toolbar-button__{{config.name}}"
        [disabled]="config.disabled">
        {{ config.label | translate }}
      </button>
    </div>
  `,
})
export class ToolbarButtonComponent {
  @Input() config?: any;
  @Input() controller: Subject<any>;
  constructor(public translate: TranslateService) {}

  onClick(value) {
    this.config.value = value;
    this.controller.next({ name: this.config.name, value: this.config.value });
  }
}
