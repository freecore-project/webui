import { ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ApplicationShellComponent } from './application-shell';
import { ApplicationsComponent } from './applications.component';

export const routes: Routes = [{
  path: '',
  data: { title: 'Applications', breadcrumb: 'Applications', icon: 'widgets' },
  children: [
    {
      path: '',
      component: ApplicationsComponent,
    },
    {
      // the internal development record: a shell inside a running application's container.
      path: 'shell/:name',
      component: ApplicationShellComponent,
      data: { title: 'Shell', breadcrumb: 'Shell' },
    },
  ],
}];

export const routing: ModuleWithProviders<RouterModule> = RouterModule.forChild(routes);
