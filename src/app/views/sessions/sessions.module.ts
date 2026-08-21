import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { TranslateModule } from '@ngx-translate/core';

import { SigninComponent } from './signin/signin.component';
import { SessionsRoutes } from './sessions.routing';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...HlmProgressImports, // the internal development record
    TranslateModule,
    RouterModule.forChild(SessionsRoutes),
  ],
  declarations: [SigninComponent],
})
export class SessionsModule { }
