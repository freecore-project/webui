import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let setTitle: jasmine.Spy;

  beforeEach(() => {
    setTitle = jasmine.createSpy('setTitle');
    const router = {
      events: of(),
      errorHandler: undefined,
      getCurrentNavigation: () => null,
      navigate: jasmine.createSpy('navigate'),
      url: '/',
    };
    const snackBar = {
      open: () => ({
        dismiss: () => undefined,
        onAction: () => of(),
      }),
    };
    const sanitizer = {
      bypassSecurityTrustResourceUrl: (url: string) => url,
    };
    const iconRegistry = {
      addSvgIcon: jasmine.createSpy('addSvgIcon'),
      addSvgIconSetInNamespace: jasmine.createSpy('addSvgIconSetInNamespace'),
    };

    component = new AppComponent(
      { setTitle } as any,
      router as any,
      {} as any,
      {} as any,
      snackBar as any,
      { loggedIn: false } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { globalPreview: false } as any,
      {} as any,
      sanitizer as any,
      iconRegistry as any,
      {} as any,
    );
  });

  it('creates the application shell', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the FreeCORE application title', () => {
    expect(component.appTitle).toBe('FreeCORE');
  });

  it('sets the browser title for the current host', () => {
    expect(setTitle).toHaveBeenCalledWith(jasmine.stringMatching(/^FreeCORE - /));
  });
});
