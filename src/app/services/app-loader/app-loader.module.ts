import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { AppLoaderComponent } from './app-loader.component';
import { AppLoaderService } from './app-loader.service';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    CoreComponents,
    MatDialogModule,
    TranslateModule,
  ],
  providers: [AppLoaderService],
  declarations: [AppLoaderComponent],
})
export class AppLoaderModule { }
