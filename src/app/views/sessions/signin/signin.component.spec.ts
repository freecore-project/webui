import { of } from 'rxjs';

import { SigninComponent } from './signin.component';

describe('SigninComponent', () => {
  it('creates after loading the public sign-in state', () => {
    const ws = {
      call: jasmine.createSpy('call').and.callFake((method: string) => {
        if (method === 'system.product_type') {
          return of('CORE');
        }
        if (method === 'system.build_time') {
          return of({ $date: '2026-08-16T00:00:00Z' });
        }
        return of(false);
      }),
      connected: true,
      redirectUrl: undefined,
      token: null,
    };
    const updateService = {
      hardRefreshIfNeeded: jasmine.createSpy('hardRefreshIfNeeded'),
    };
    const component = new SigninComponent(
      ws as any,
      { url: '/sessions/signin' } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { getCopyrightYearFromBuildTime: () => '2026' } as any,
      updateService as any,
      {} as any,
      { currentTheme: () => ({}) } as any,
    );

    expect(component).toBeTruthy();
    expect(component.product_type).toBe('CORE');
    expect(updateService.hardRefreshIfNeeded).toHaveBeenCalled();
  });
});
