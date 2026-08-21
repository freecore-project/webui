// This file initializes the Angular testing environment for Karma.

// zone.js 0.11 on this line: the testing bundle carries long-stack-trace,
// proxy, sync/async/fake-async and the jasmine patch in one file.
import 'zone.js/dist/zone-testing';
import { Injector } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of } from 'rxjs';

import { CoreService } from './app/core/services/core.service';
import { setCoreServiceInjector } from './app/core/services/coreserviceinjector';
import { ThemeService } from './app/services/theme/theme.service';

setCoreServiceInjector(Injector.create({
  providers: [
    {
      provide: CoreService,
      useValue: {
        register: () => of({}),
        unregister: () => undefined,
      },
    },
    {
      provide: ThemeService,
      useValue: {
        currentTheme: () => ({ accentColors: [] }),
      },
    },
  ],
}));

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: false },
  },
);
