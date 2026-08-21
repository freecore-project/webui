import { CommonModule } from '@angular/common';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../appMaterial.module';
import { TranslateModule } from '@ngx-translate/core';

import { EntityModule } from '../common/entity/entity.module';
import { NetworkService } from '../../services';
import { EntityFormService } from '../common/entity/entity-form/services/entity-form.service';
import { CoreService } from 'app/core/services/core.service';

import { StaticRouteFormComponent } from './staticroutes/staticroute-form';
import { StaticRouteListComponent } from './staticroutes/staticroute-list';
import { InterfacesFormComponent } from './interfaces/interfaces-form';
import { InterfacesListComponent } from './interfaces/interfaces-list';
import { ConfigurationComponent } from './configuration';
import { IPMIComponent } from './ipmi';
import { NetworkSummaryComponent } from './networksummary/networksummary.component';
import { routing } from './network.routing';

@NgModule({
  imports: [
    EntityModule, CommonModule, FormsModule,
    ReactiveFormsModule, routing, MaterialModule, TranslateModule,
    ...HlmButtonImports,
    ...HlmFieldImports, ...HlmSelectImports, ...HlmSpinnerImports, // the internal development record: the IPMI scope pickers
    ...HlmInputImports, // the internal development record: the interfaces check-in timeout
  ],
  declarations: [
    StaticRouteFormComponent,
    StaticRouteListComponent,
    InterfacesListComponent,
    InterfacesFormComponent,
    ConfigurationComponent,
    IPMIComponent,
    NetworkSummaryComponent,
  ],
  providers: [NetworkService, EntityFormService, CoreService],
})
export class NetworkModule {
}
