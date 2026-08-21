import { fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { PluginsComponent } from './plugins.component';

describe('PluginsComponent outside requests', () => {
  function createComponent(): PluginsComponent {
    return new PluginsComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  // the internal development record: the lookup told icanhazip.com the user's public IP on every visit, only for the
  // Asigra plugin's license registration link; no Asigra plugin can be installed from FreeCORE's collection.
  it('asks no outside address for the public IP', fakeAsync(() => {
    spyOn(window, 'fetch');

    createComponent();
    flushMicrotasks();

    expect(window.fetch).not.toHaveBeenCalled();
  }));

  it('offers no Asigra Register action', () => {
    const component = createComponent();
    const ids = (plugin: string) => component.getActions({ name: 'j', plugin, state: 'up', admin_portals: [] })
      .map((action) => action.id);

    expect(ids('asigra')).not.toContain('register');
    expect(ids('asigra')).toEqual(ids('syncthing'));
  });
});
