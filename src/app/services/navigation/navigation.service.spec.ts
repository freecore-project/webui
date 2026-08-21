import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavigationComponent } from '../../components/common/navigation/navigation.component';
import { NavigationService } from './navigation.service';

describe('NavigationService application navigation', () => {
  it('offers Applications without exposing the retired Plugins catalog', () => {
    const menu = new NavigationService().defaultMenu;

    expect(menu.some((item) => item.state === 'applications')).toBeTrue();
    expect(menu.some((item) => item.state === 'plugins')).toBeFalse();
  });
});

describe('NavigationService jail managers', () => {
  // the internal development record: Jails is one sidebar link, as inherited. Bastille keeps its own
  // page (the internal development record) and is reached from the Jails page's settings menu; a
  // "Jails > Jails / Bastille" submenu read the word three times, lost the custom jail
  // icon (the dropdown branch of the sidebar cannot draw it) and highlighted both
  // children on /jails/bastille because the iocage child's empty state is a prefix.
  it('keeps Jails a single link with its own icon', () => {
    const jails = new NavigationService().defaultMenu.find((item) => item.state === 'jails');

    expect(jails.type).toBe('link');
    expect(jails.icon).toBe('jail_icon');
    expect(jails.sub).toBeUndefined();
  });

  it('keeps the Bastille page reachable at its own route', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(router.createUrlTree(['/', 'jails', 'bastille']))).toBe('/jails/bastille');
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
