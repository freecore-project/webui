import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatGridListModule } from '@angular/material/grid-list';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AppBlankComponent } from './app-blank/app-blank.component';
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
  MatListModule,
  MatIconModule,
  MatButtonModule,
  MatCardModule,
  MatMenuModule,
  MatSlideToggleModule,
  MatGridListModule,
  FlexLayoutModule,
  TranslateModule,
  RouterModule.forChild(OthersRoutes),
  ],
  declarations: [AppBlankComponent, RebootComponent, FailoverComponent, ShutdownComponent, ConfigResetComponent],
  })
export class OthersModule { }
