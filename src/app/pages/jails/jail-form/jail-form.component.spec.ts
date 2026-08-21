import { JailFormComponent } from './jail-form.component';

describe('JailFormComponent advanced plugin install', () => {
  // the internal development record: on 15.0 the jail editor is also the advanced plugin install
  // (plugins/advanced/:plugin), as before the internal development record retired it on 15.1.
  it('keeps ordinary jail creation beside the plugin creation mode', () => {
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

    expect(fieldNames).toContain('plugin_name');
    expect((component as any).addCall).toBe('jail.create');
    expect((component as any).pluginAddCall).toBe('plugin.create');
    expect(component.plugin_route_success).toEqual(['plugins']);
  });
});
