import { PluginsRetiredComponent } from './plugins-retired.component';

describe('PluginsRetiredComponent', () => {
  it('redirects every stale Plugins route to Applications with an explanation marker', () => {
    const router = { navigate: jasmine.createSpy('navigate') };

    new PluginsRetiredComponent(router as any).ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/applications'], {
      replaceUrl: true,
      queryParams: { legacy: 'iocage-plugin-store' },
    });
  });
});
