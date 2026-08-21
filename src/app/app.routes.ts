import { Routes } from '@angular/router';
import { TranslationsLoadedGuard } from 'app/core/guards/translations-loaded.guard';

import { AdminLayoutComponent } from './components/common/layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './components/common/layouts/auth-layout/auth-layout.component';

import { AuthService } from './services/auth/auth.service';

export const rootRouterConfig: Routes = [{
  path: '',
  redirectTo: 'dashboard',
  pathMatch: 'full',
},
{
  path: '',
  component: AuthLayoutComponent,
  canActivate: [TranslationsLoadedGuard],
  children: [{
    path: 'sessions',
    loadChildren: () => import('./views/sessions/sessions.module').then((m) => m.SessionsModule),
    data: { title: 'Session' },
  },
  {
    path: 'others',
    loadChildren: () => import('./views/others/others.module').then((m) => m.OthersModule),
    data: { title: 'Others', breadcrumb: 'Others' },
  }],
},
{
  path: '',
  component: AdminLayoutComponent,
  canActivate: [AuthService, TranslationsLoadedGuard],
  children: [{
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then((m) => m.DashboardModule),
    data: { title: 'Dashboard', breadcrumb: 'Dashboard' },
  },
  {
    path: 'account',
    loadChildren: () => import('./pages/account/account.module').then((m) => m.AccountModule),
    data: { title: 'Accounts', breadcrumb: 'Accounts' },
  },
  {
    path: 'system',
    loadChildren: () => import('./pages/system/system.module').then((m) => m.SystemModule),
    data: { title: 'System', breadcrumb: 'System' },
  },
  {
    path: 'tasks',
    loadChildren: () => import('./pages/task-calendar/task-calendar.module').then((m) => m.TaskCalendarModule),
    data: { title: 'Tasks', breadcrumb: 'Tasks' },
  },
  {
    path: 'network',
    loadChildren: () => import('app/pages/network/network.module').then((m) => m.NetworkModule),
    data: { title: 'Network', breadcrumb: 'Network' },
  },
  {
    path: 'services',
    loadChildren: () => import('app/pages/services/services.module').then((m) => m.ServicesModule),
    data: { title: 'Services', breadcrumb: 'Services', toplevel: true },
  },
  {
    path: 'directoryservice',
    loadChildren: () => import('app/pages/directoryservice/directoryservice.module').then((m) => m.DirectoryServiceModule),
    data: { title: 'Directory Services', breadcrumb: 'Directory Services' },
  },
  {
    path: 'vm',
    loadChildren: () => import('app/pages/vm/vm.module').then((m) => m.VmModule),
    data: { title: 'Virtual Machines', breadcrumb: 'Virtual Machines', toplevel: true },
  },
  {
    path: 'sharing',
    loadChildren: () => import('app/pages/sharing/sharing.module').then((m) => m.SharingModule),
    data: { title: 'Sharing', breadcrumb: 'Sharing' },
  },
  {
    path: 'storage',
    loadChildren: () => import('./pages/storage/storage.module').then((m) => m.StorageModule),
    data: { title: 'Storage', breadcrumb: 'Storage' },
  },
  {
    path: 'plugins',
    loadChildren: () => import('./pages/plugins/plugins.module').then((m) => m.PluginsModule),
    data: { title: 'Plugins', breadcrumb: 'Plugins', toplevel: true },
  },
  {
    path: 'jails',
    loadChildren: () => import('./pages/jails/jails.module').then((m) => m.JailsModule),
    data: { title: 'Jails', breadcrumb: 'Jails', toplevel: true },
  },
  {
    path: 'reportsdashboard',
    loadChildren: () => import('./pages/reportsdashboard/reportsdashboard.module').then((m) => m.ReportsDashboardModule),
    data: { title: 'Reporting', breadcrumb: 'Reporting' },
  },
  {
    path: 'systemprocesses',
    loadChildren: () => import('app/pages/systemprocesses/system-processes.module').then((m) => m.SystemProcessesModule),
    data: { title: 'System Processes', breadcrumb: 'System Processes' },
  },
  {
    path: 'shell',
    loadChildren: () => import('app/pages/shell/shell.module').then((m) => m.ShellModule),
    data: { title: 'Shell', breadcrumb: 'Shell' },
  },
  {
    path: 'ui-preferences',
    loadChildren: () => import('./pages/preferences/preferences.module').then((m) => m.PreferencesModule),
    data: { title: 'Web Interface Preferences', breadcrumb: 'Preferences' },
  },
  {
    path: 'apikeys',
    loadChildren: () => import('./pages/api-keys/api-keys.module').then((m) => m.ApiKeysModule),
    data: { title: 'API Keys', breadcrumb: 'API Keys' },
  },
  ],
},
{
  path: '**',
  redirectTo: 'dashboard',
  pathMatch: 'full',
},
];
