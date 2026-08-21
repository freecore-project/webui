import { UntypedFormGroup } from '@angular/forms';
import { FieldConfig } from './field-config.interface';

export interface Field {
  config: FieldConfig; group: UntypedFormGroup; fieldShow: string;
}
