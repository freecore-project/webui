import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../appMaterial.module';
import { TranslateModule } from '@ngx-translate/core';

import { JailService } from '../../services';
import { EntityModule } from '../common/entity/entity.module';

import { routing } from './jails.routing';
import { JailListComponent } from './jail-list';
import { JailFormComponent } from './jail-form/jail-form.component';
import { StorageListComponent } from './storages/storage-list';
import { StorageFormComponent } from './storages/storage-form';
import { JailWizardComponent } from './jail-wizard';
import { JailShellComponent } from './jail-shell';
import { TerminalModule } from '../shell/terminal.module';

@NgModule({
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, routing, EntityModule, MaterialModule, TranslateModule,
    TerminalModule,
    ...HlmButtonImports, ...HlmSpinnerImports, // the internal development record: the jail form's tiers + spinner
  ],
  declarations: [
    JailListComponent,
    JailFormComponent,
    StorageListComponent,
    StorageFormComponent,
    JailWizardComponent,
    JailShellComponent,
  ],
  providers: [
    JailService,
  ],
})
export class JailsModule {
}
