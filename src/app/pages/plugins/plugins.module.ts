import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { MaterialModule } from '../../appMaterial.module';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';
import { EntityModule } from '../common/entity/entity.module';

import { routing } from './plugins.routing';
import { PluginAddComponent } from './plugin-add/plugin-add.component';
import { PluginsComponent } from './plugins.component';
import { AvailablePluginsComponent } from './available-plugins/available-plugins.component';
import { CatalogStripComponent } from './catalog-strip/catalog-strip.component';

/** the internal development record: the 15.0 plugin store (retired on 15.1 by the internal development record) on the 15.1 kit. */
@NgModule({
  imports: [
    ...HlmButtonImports, ...HlmFieldImports, ...HlmSelectImports, ...HlmSpinnerImports, ...HlmTooltipImports,
    EntityModule, CommonModule, FormsModule, ReactiveFormsModule, routing, MaterialModule, TranslateModule,
    CommonDirectivesModule,
  ],
  declarations: [
    PluginAddComponent,
    PluginsComponent,
    AvailablePluginsComponent,
    CatalogStripComponent,
  ],
})
export class PluginsModule {
}
