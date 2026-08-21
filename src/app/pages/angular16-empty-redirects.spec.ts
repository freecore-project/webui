import { Route, Routes } from '@angular/router';

import { routes as accountRoutes } from './account/account.routing';
import { routes as jailRoutes } from './jails/jails.routing';
import { routes as serviceRoutes } from './services/services.routing';
import { routes as sharingRoutes } from './sharing/sharing.routing';

interface RedirectRoute {
  path: string;
  redirectTo: string;
  pathMatch: Route['pathMatch'];
}

function collectRedirects(routes: Routes, parentPath = ''): RedirectRoute[] {
  return routes.flatMap((route: Route) => {
    const path = [parentPath, route.path].filter(Boolean).join('/');
    const redirect: RedirectRoute[] = typeof route.redirectTo !== 'string' ? [] : [{
      path,
      redirectTo: route.redirectTo,
      pathMatch: route.pathMatch,
    }];

    return redirect.concat(collectRedirects(route.children || [], path));
  });
}

describe('Angular 16 empty-path redirects', () => {
  const redirects = [
    ...collectRedirects(serviceRoutes, 'services'),
    ...collectRedirects(sharingRoutes, 'sharing'),
    ...collectRedirects(jailRoutes, 'jails'),
    ...collectRedirects(accountRoutes, 'account'),
  ];

  it('keeps the existing nested redirect targets', () => {
    expect(redirects).toEqual([
      { path: 'services/rsync', redirectTo: 'configure', pathMatch: 'full' },
      { path: 'sharing/iscsi', redirectTo: 'configuration', pathMatch: 'full' },
      { path: 'jails/add', redirectTo: 'wizard', pathMatch: 'full' },
      { path: 'account', redirectTo: 'users', pathMatch: 'full' },
    ]);
  });

  it('declares full matching semantics for every active redirect', () => {
    expect(redirects.length).toBeGreaterThan(0);
    redirects.forEach((route) => expect(route.pathMatch).toBe('full'));
  });
});
