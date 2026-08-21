import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { AppLoaderComponent } from './app-loader.component';
import { AppLoaderService } from './app-loader.service';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
  CommonModule,
  CoreComponents,
  MatDialogModule,
  MatIconModule,
  MatProgressSpinnerModule,
  TranslateModule,
  ],
  providers: [AppLoaderService],
  declarations: [AppLoaderComponent],
  })
export class AppLoaderModule { }
