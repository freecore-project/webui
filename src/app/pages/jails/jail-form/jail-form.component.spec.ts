import { JailFormComponent } from './jail-form.component';

describe('JailFormComponent plugin-store retirement boundary', () => {
  it('keeps ordinary jail creation and exposes no plugin creation mode', () => {
    const component = new JailFormComponent(
      {} as any,
      {} as any,
      { jailNameRegex: /^[a-z0-9_-]+$/ } as any,
      {
        interfaces: {
          vnetEnabled: [],
          vnetDisabled: [],
          vnetDefaultInterface: [],
        },
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        getV4Netmasks: () => [],
        getV6PrefixLength: () => [],
      } as any,
    );
    const fieldNames = component.fieldSets
      .reduce((fields, fieldSet) => fields.concat(fieldSet.config), [])
      .map((field) => field.name);

    expect(fieldNames).not.toContain('plugin_name');
    expect((component as any).addCall).toBe('jail.create');
    expect('pluginAddCall' in component).toBeFalse();
  });
});
