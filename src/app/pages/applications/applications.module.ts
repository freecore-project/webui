import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialModule } from '../../appMaterial.module';
import { BrnTabsImports } from '@spartan-ng/brain/tabs';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { TerminalModule } from '../shell/terminal.module';
import { ApplicationShellComponent } from './application-shell';
import { ApplicationsComponent } from './applications.component';
import { routing } from './applications.routing';
import { ApplicationsStore } from './applications.store';
import { CatalogListComponent } from './catalog-list/catalog-list.component';
import { EntityModule } from '../common/entity/entity.module';
import { InstalledApplicationsComponent } from './installed-applications/installed-applications.component';

@NgModule({
  imports: [
    ...HlmButtonImports, ...HlmDropdownMenuImports, // the internal development record: the helm menus
    ...HlmTooltipImports, // the internal development record: the helm tooltip
    // the internal development record/#534: the catalog list + the FORM-law panels on the helm kit
    ...HlmFieldImports, ...HlmInputImports, ...HlmInputGroupImports, ...HlmSelectImports, ...HlmCheckboxImports,
    ...HlmLabelImports, ...HlmSpinnerImports, ...HlmTextareaImports, ...HlmRadioGroupImports,
    ...BrnTabsImports, // the internal development record: Catalog / Installed
    CommonModule,
    FormsModule,
    MaterialModule,
    EntityModule,
    TerminalModule,
    TranslateModule,
    routing,
  ],
  declarations: [ApplicationsComponent, ApplicationShellComponent, CatalogListComponent, InstalledApplicationsComponent],
  providers: [ApplicationsStore],
})
export class ApplicationsModule {}
