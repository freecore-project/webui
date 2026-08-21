import { Pipe, PipeTransform } from '@angular/core';
import { FieldConfig } from '../models/field-config.interface';

/**
 * the internal development record. On 13.3 a field's `placeholder` *was* its floating label:
 * legacy Material rendered it inside the empty field and floated it above once
 * the field held a value. MDC separates the two, and the entity-form templates
 * only emitted a <mat-label> when a config set both `showLabel` and `label` --
 * which 24 of ~1400 inherited configs do. The result is that a field shows its
 * name only while it is empty and goes anonymous the moment it has a value:
 * System -> Advanced rendered a bare "2 GiB", "user", "Info" and "UDP".
 *
 * `showLabel` stays what it always was: the explicit opt-in that activates a
 * config's *own* `label`. Some inherited configs carry a stale `label` that was
 * never meant to be displayed, which is the guard bastille-form-labels.spec
 * pins, so promoting those would surface the wrong text. The placeholder is
 * promoted instead -- it is the string 13.3 actually showed.
 */
function labelFor(config: FieldConfig): string {
  if (!config || config.showLabel === false) { return ''; }
  if (config.showLabel && config.label) { return config.label; }
  return config.placeholder || '';
}

@Pipe({ standalone: false, name: 'fieldLabel' })
export class FieldLabelPipe implements PipeTransform {
  /** The text a field is named by. */
  transform(config: FieldConfig): string {
    return labelFor(config);
  }
}

@Pipe({ standalone: false, name: 'fieldPlaceholder' })
export class FieldPlaceholderPipe implements PipeTransform {
  /**
   * The placeholder, but only where it still says something the label does not.
   * Once a placeholder is promoted to the label -- or a config sets both to the
   * same string, as the Bastille dialogs do -- repeating it inside the field
   * would show the same words twice as soon as the label floats.
   */
  transform(config: FieldConfig): string {
    if (!config || !config.placeholder) { return ''; }
    return config.placeholder === labelFor(config) ? '' : config.placeholder;
  }
}
