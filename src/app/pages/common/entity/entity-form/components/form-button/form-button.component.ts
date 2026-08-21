import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

// the internal development record: the field button on spartan -- hlmBtn in the outline tier (it was
// `color="accent"`, which #353 made the hairline secondary). The purple component sheet is gone:
// the tier rules masked it, the helm utilities would not have.
@Component({
  standalone: false,
  selector: 'form-button',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (!config.isHidden) {
      <div
        class="dynamic-field form-button"
        [formGroup]="group">
        <button
          hlmBtn
          variant="outline"
          [disabled]="config.disabled"
          [type]="config.inputType ? config.inputType : 'submit'"
          (click)="customEventMethod($event)"
          ix-auto
          ix-auto-type="button"
          ix-auto-identifier="{{config.customEventActionLabel | uppercase}}">
          {{ config.label | translate }}
        </button>
      </div>
    }
    `,
})
export class FormButtonComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  constructor(public translate: TranslateService) {}

  customEventMethod($event) {
    if (this.config.customEventMethod !== undefined && this.config.customEventMethod != null) {
      this.config.customEventMethod({ event: $event });
    }
    $event.preventDefault();
  }
}
