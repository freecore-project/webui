import { NavigationComponent } from '../../components/common/navigation/navigation.component';
import { NavigationService } from './navigation.service';

describe('NavigationService plugin store', () => {
  // the internal development record: 15.0 keeps the iocage plugin store that 15.1 retired (the internal development record),
  // one Plugins link right above Jails, as 15.0 and 13.3 drew it.
  it('offers the Plugins catalog right above Jails', () => {
    const menu = new NavigationService().defaultMenu;
    const plugins = menu.findIndex((item) => item.state === 'plugins');

    expect(plugins).toBeGreaterThan(-1);
    expect(menu[plugins].type).toBe('link');
    expect(menu[plugins + 1].state).toBe('jails');
  });

  it('offers no Applications entry: 15.0 ships jails and the plugin store only', () => {
    expect(new NavigationService().defaultMenu.some((item) => item.state === 'applications')).toBeFalse();
  });
});

describe('NavigationService jail managers', () => {
  // the internal development record: Jails is one sidebar link with the custom jail icon, as inherited.
  it('keeps Jails a single link with its own icon', () => {
    const jails = new NavigationService().defaultMenu.find((item) => item.state === 'jails');

    expect(jails.type).toBe('link');
    expect(jails.icon).toBe('jail_icon');
    expect(jails.sub).toBeUndefined();
  });
});

// the internal development record: a fresh array per change-detection pass changes RouterLink's input
// on every pass and, once that link is active, change detection never settles.
describe('NavigationComponent subItemLink identity', () => {
  it('returns the same array for the same sub-item on every call', () => {
    const component = new NavigationComponent({} as any, {} as any, {} as any, {} as any);
    const jails = { name: 'Jails', state: 'jails' };
    const iocage = { name: 'Jails', state: '' };
    const bastille = { name: 'Bastille', state: 'bastille' };

    const iocageLink = component.subItemLink(jails, iocage);
    expect(component.subItemLink(jails, iocage)).toBe(iocageLink);
    expect(iocageLink).toEqual(['/', 'jails']);

    const bastilleLink = component.subItemLink(jails, bastille);
    expect(component.subItemLink(jails, bastille)).toBe(bastilleLink);
    expect(bastilleLink).toEqual(['/', 'jails', 'bastille']);
    expect(bastilleLink).not.toBe(iocageLink);
  });
});
