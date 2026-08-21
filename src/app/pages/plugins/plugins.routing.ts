import { ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PluginsRetiredComponent } from './plugins-retired.component';

export const routes: Routes = [
  {
    path: '',
    component: PluginsRetiredComponent,
    data: { title: 'Plugins Retired', breadcrumb: 'Applications' },
  },
  {
    path: '**',
    component: PluginsRetiredComponent,
    data: { title: 'Plugins Retired', breadcrumb: 'Applications' },
  },
];
export const routing: ModuleWithProviders<RouterModule> = RouterModule.forChild(routes);
