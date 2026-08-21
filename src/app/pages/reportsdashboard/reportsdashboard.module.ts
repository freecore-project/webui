import { AppCommonModule } from '../../components/common/app-common.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialModule } from '../../appMaterial.module';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { EntityModule } from 'app/pages/common/entity/entity.module';
import { EntityFormService } from 'app/pages/common/entity/entity-form/services/entity-form.service';
import { CommonDirectivesModule } from 'app/directives/common/common-directives.module';

import { ScrollingModule } from '@angular/cdk/scrolling';
import { ReportComponent } from './components/report/report.component';

import { ReportsDashboardComponent } from './reportsdashboard.component';
import { ReportsPageScrollDirective } from './reports-page-scroll.directive';
import { routing } from './reportsdashboard.routing';
import { LineChartComponent } from './components/lineChart/lineChart.component';

@NgModule({
  imports: [
    ...HlmButtonImports, ...HlmDropdownMenuImports, ...HlmTooltipImports, ...HlmSpinnerImports,
    CommonModule,
    FormsModule,
    routing,
    MaterialModule,
    ScrollingModule,
    ReportsPageScrollDirective,
    AppCommonModule,
    TranslateModule,
    EntityModule,
    CommonDirectivesModule,
  ],
  declarations: [
    ReportsDashboardComponent,
    ReportComponent,
    LineChartComponent,
  ],
  providers: [

  ],
})
export class ReportsDashboardModule {
}
