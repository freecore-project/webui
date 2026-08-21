import { ZvolFormComponent } from './zvol-form.component';

describe('Add Zvol inherit choices', () => {
  it('puts the Inherit choice first once, however many times it is added', () => {
    const sync = { name: 'sync', options: [{ label: 'Standard', value: 'STANDARD' }, { label: 'Always', value: 'ALWAYS' }] };
    const fake: any = { fieldConfig: [sync] };
    const inherit = [{ label: 'Inherit (standard)', value: 'INHERIT' }];

    // the dataset query and afterInit() can each add it, in either order
    (ZvolFormComponent.prototype as any).prependOptions.call(fake, 'sync', inherit);
    (ZvolFormComponent.prototype as any).prependOptions.call(fake, 'sync', inherit);
    (ZvolFormComponent.prototype as any).prependOptions.call(fake, 'sync', undefined);

    expect(sync.options.map((option) => option.label)).toEqual(['Inherit (standard)', 'Standard', 'Always']);
  });
});
