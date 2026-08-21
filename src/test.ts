// This file initializes the Angular testing environment for Karma.

import 'zone.js/plugins/long-stack-trace-zone';
import 'zone.js/testing';
import { Injector, NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of } from 'rxjs';

import { CoreService } from './app/core/services/core.service';
import { setCoreServiceInjector } from './app/core/services/coreserviceinjector';
import { ThemeService } from './app/services/theme/theme.service';

// Angular's built-in Karma bootstrap supplies this for zone-based projects, but
// this repository uses a custom test main and must preserve it explicitly.
@NgModule({
  providers: [provideZoneChangeDetection()],
})
class ZoneTestModule {}

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
  [BrowserDynamicTestingModule, ZoneTestModule],
  platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: false },
  },
);
