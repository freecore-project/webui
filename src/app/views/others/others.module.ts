import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { OthersRoutes } from './others.routing';
import { FailoverComponent } from './failover/failover.component';
import { RebootComponent } from './reboot/reboot.component';
import { ShutdownComponent } from './shutdown/shutdown.component';
import { TranslateModule } from '@ngx-translate/core';
import { ConfigResetComponent } from './config-reset/config-reset.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TranslateModule,
    RouterModule.forChild(OthersRoutes),
  ],
  declarations: [RebootComponent, FailoverComponent, ShutdownComponent, ConfigResetComponent],
})
export class OthersModule { }
