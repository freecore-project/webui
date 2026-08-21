import { of, Subject } from 'rxjs';

import { AvailablePluginsComponent } from './available-plugins.component';

/** the internal development record: the 15.0 Plugins header logic, unchanged from 15.0, on the 15.1 catalog strip. */
describe('AvailablePluginsComponent (the internal development record)', () => {
  const index = {
    'git://freecore': [
      { plugin: 'plex', name: 'Plex', description: 'Media', icon: 'https://x/plex.png', version: '1.2', revision: '3', official: true },
      { plugin: 'tt', name: 'Transmission', description: 'Torrents', icon: '', version: '4.0', revision: '0', official: false },
    ],
    'git://ix': [
      { plugin: 'nc', name: 'Nextcloud', description: 'Cloud', icon: '', version: '28', revision: 'N/A', official: true },
    ],
  };

  function setup(repos: any[]) {
    const repositories = new Subject<any>();
    const jobs: any[] = [];
    const ws = {
      call: (method: string) => (method === 'plugin.official_repositories' ? repositories : of([{ plugin: 'plex' }, { plugin: 'plex' }])),
      job: (method: string, args: any[]) => {
        jobs.push([method, { ...args[0] }]);
        return of({ result: (index[args[0].plugin_repository] || []).map((p) => ({ ...p })) });
      },
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    const prefs = { preferences: { expandAvailablePlugins: true }, savePreferences: jasmine.createSpy('save') };
    const component = new AvailablePluginsComponent(ws as any, {} as any, router as any, {} as any, prefs as any);
    component.parent = {
      conf: { activatedPool: 'tank' },
      cardHeaderReady: false,
      loader: { open: jasmine.createSpy('open'), close: jasmine.createSpy('close') },
      dialogService: { confirm: jasmine.createSpy('confirm').and.returnValue(of(true)), errorReport: jasmine.createSpy('errorReport') },
    };
    component.ngOnInit();
    repositories.next(repos);
    return {
      component, jobs, router, prefs,
    };
  }

  it('opens the FreeCORE collection first and maps its index onto the strip', () => {
    const { component, jobs } = setup([
      { name: 'iXsystems', git_repository: 'git://ix' }, { name: 'FreeCORE', git_repository: 'git://freecore' },
    ]);

    expect(component.selectedRepo).toBe('git://freecore');
    expect(jobs[0]).toEqual(['plugin.available', { plugin_repository: 'git://freecore', cache: true }]);
    expect(component.entries).toEqual([
      { id: 'plex', title: 'Plex', description: 'Media', icon: 'https://x/plex.png' },
      { id: 'tt', title: 'Transmission', description: 'Torrents', icon: '' },
    ]);
    expect(component.plugins[0].version).toBe('1.2_3');
    expect(component.plugins[1].version).toBe('4.0');
    expect(component.selectedPlugin.plugin).toBe('plex');
    expect(component.loading).toBeFalse();
    expect(component.parent.cardHeaderReady).toBeTrue();
    expect(component.installedPlugins).toEqual({ plex: 2 });
  });

  it('falls back to the iXsystems collection, then to the first one', () => {
    expect(setup([{ name: 'Other', git_repository: 'git://o' }, { name: 'iXsystems', git_repository: 'git://ix' }]).component.selectedRepo)
      .toBe('git://ix');
    expect(setup([{ name: 'Other', git_repository: 'git://o' }]).component.selectedRepo).toBe('git://o');
  });

  it('selects the tile the strip emits and switches collection only on a change', () => {
    const { component, jobs } = setup([{ name: 'FreeCORE', git_repository: 'git://freecore' }, { name: 'iXsystems', git_repository: 'git://ix' }]);
    component.select({ id: 'tt', title: 'Transmission' });
    expect(component.selectedPlugin.plugin).toBe('tt');

    const before = jobs.length;
    component.switchRepo('git://freecore');
    expect(jobs.length).toBe(before);

    component.switchRepo('git://ix');
    expect(component.parent.loader.open).toHaveBeenCalled();
    expect(jobs[jobs.length - 1]).toEqual(['plugin.available', { plugin_repository: 'git://ix', cache: true }]);
    expect(component.entries.map((e) => e.id)).toEqual(['nc']);
    expect(component.repoLabel('git://ix')).toBe('iXsystems');
  });

  it('installs an official plugin directly and warns before an unofficial one', () => {
    const { component, router } = setup([{ name: 'FreeCORE', git_repository: 'git://freecore' }]);
    component.install(component.plugins[0]);
    expect(component.parent.dialogService.confirm).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['', 'plugins', 'add', 'plex', { plugin_repository: 'git://freecore' }]);

    component.install(component.plugins[1]);
    expect(component.parent.dialogService.confirm).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['', 'plugins', 'add', 'tt', { plugin_repository: 'git://freecore' }]);
  });

  it('remembers the collapsed header', () => {
    const { component, prefs } = setup([{ name: 'FreeCORE', git_repository: 'git://freecore' }]);
    component.updatePreference();
    expect(component.expand).toBeFalse();
    expect(prefs.preferences.expandAvailablePlugins).toBeFalse();
    expect(prefs.savePreferences).toHaveBeenCalled();
  });
});
