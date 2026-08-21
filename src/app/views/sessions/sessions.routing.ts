import { Routes } from '@angular/router';

import { SigninComponent } from './signin/signin.component';

export const SessionsRoutes: Routes = [
  {
    path: '',
    children: [{
      path: 'signin',
      component: SigninComponent,
      data: { title: 'Signin' },
    }],
  },
];
