import { FieldConfig } from '../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from './field-label.pipe';

/**
 * the internal development record. On 13.3 a field's placeholder doubled as its floating
 * label, so a populated field still showed its name. Under MDC the templates
 * only emitted a <mat-label> when a config set `showLabel` *and* `label`, which
 * 24 of ~1400 field configs do -- so System -> Advanced rendered a bare "2 GiB",
 * "user", "Info" and "UDP" with nothing saying what they were.
 */
describe('entity-form field naming', () => {
  const label = new FieldLabelPipe();
  const placeholder = new FieldPlaceholderPipe();
  const field = (over: Partial<FieldConfig>): FieldConfig =>
    ({ type: 'input', name: 'swapondrive', ...over } as FieldConfig);

  it('names a field by its placeholder when the config sets no label', () => {
    const config = field({ placeholder: 'Swap Size in GiB' });

    expect(label.transform(config)).toBe('Swap Size in GiB');
    // Promoted to the label, so repeating it inside the field would show the
    // same words twice as soon as the label floats.
    expect(placeholder.transform(config)).toBe('');
  });

  it('uses a config own label only where showLabel opts in, and keeps a placeholder that still adds something', () => {
    const optedIn = field({ showLabel: true, label: 'Release', placeholder: 'for example 15.1-RELEASE' });

    expect(label.transform(optedIn)).toBe('Release');
    expect(placeholder.transform(optedIn)).toBe('for example 15.1-RELEASE');
  });

  it('leaves a stale label dormant and promotes the placeholder instead', () => {
    // Some inherited configs carry a `label` that was never meant to be shown.
    // showLabel is the opt-in that activates it; without it the placeholder --
    // the string 13.3 actually displayed -- is what names the field.
    const config = field({ label: 'Existing unused label', placeholder: 'Legacy placeholder' });

    expect(label.transform(config)).toBe('Legacy placeholder');
    expect(placeholder.transform(config)).toBe('');
  });

  it('does not repeat a label that a config also set as the placeholder', () => {
    // The Bastille dialogs pass the same string as both, which rendered the
    // label above the field and the identical placeholder inside it.
    const config = field({ showLabel: true, label: 'Name', placeholder: 'Name' });

    expect(label.transform(config)).toBe('Name');
    expect(placeholder.transform(config)).toBe('');
  });

  it('honours an explicit opt out, leaving the placeholder to do the work', () => {
    const config = field({ showLabel: false, label: 'Hidden', placeholder: 'Type a value' });

    expect(label.transform(config)).toBe('');
    expect(placeholder.transform(config)).toBe('Type a value');
  });

  it('stays quiet for a field that names itself some other way', () => {
    // Spacers and group-labelled controls (radio, permissions) carry neither.
    expect(label.transform(field({}))).toBe('');
    expect(placeholder.transform(field({}))).toBe('');
    expect(label.transform(undefined)).toBe('');
    expect(placeholder.transform(undefined)).toBe('');
  });
});
