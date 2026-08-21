import { FieldConfig } from './field-config.interface';

export interface FieldSet {
  name: string;
  label?: boolean;
  /** Heading for the reviewed settings layout; keeps controller fieldset names intact. */
  settingsLabel?: string;
  class?: string;
  width?: string;
  divider?: boolean;
  config?: FieldConfig[];
}
