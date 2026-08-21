import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../appMaterial.module';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';

import { ViewComponent } from 'app/core/components/view/view.component';
import { ViewControlComponent } from 'app/core/components/viewcontrol/viewcontrol.component';
import { ViewControllerComponent } from 'app/core/components/viewcontroller/viewcontroller.component';
import { Display, DisplayContainer } from 'app/core/components/display/display.component';
import { FormsModule } from '@angular/forms';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';

import { ViewChartComponent } from 'app/core/components/viewchart/viewchart.component';
import { ViewChartPieComponent } from 'app/core/components/viewchartpie/viewchartpie.component';
import { ViewChartDonutComponent } from 'app/core/components/viewchartdonut/viewchartdonut.component';
import { ViewChartGaugeComponent } from './viewchartgauge/viewchartgauge.component';
import { ViewChartBarComponent } from './viewchartbar/viewchartbar.component';
import { ViewChartLineComponent } from './viewchartline/viewchartline.component';
import { StorageService } from '../../services/storage.service';

import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { WidgetSysInfoComponent } from 'app/core/components/widgets/widgetsysinfo/widgetsysinfo.component';
import { WidgetNetworkComponent } from 'app/core/components/widgets/widgetnetwork/widgetnetwork.component';
import { WidgetCpuComponent } from 'app/core/components/widgets/widgetcpu/widgetcpu.component';

import { WidgetMemoryComponent } from 'app/core/components/widgets/widgetmemory/widgetmemory.component';
import { WidgetPoolComponent } from 'app/core/components/widgets/widgetpool/widgetpool.component';
import { SimpleFailoverBtnComponent } from 'app/core/components/widgets/widgetsysinfo/simple-failover-btn.component';

import { TranslateModule } from '@ngx-translate/core';
import { CopyPasteMessageComponent } from 'app/pages/shell/copy-paste-message.component';
import { TextLimiterDirective } from './directives/text-limiter/text-limiter.directive';
import { TextLimiterTooltipComponent } from './directives/text-limiter/text-limiter-tooltip/text-limiter-tooltip.component';
import { WidgetControllerComponent } from './widgets/widgetcontroller/widgetcontroller.component';
import { ConvertPipe } from './pipes/convert.pipe';

/*
 *
 * This is the Core Module. By importing this module you'll
 * ensure your page will have the right dependencies in place
 * to make use of Core Components
 *
 * */

@NgModule({
  imports: [
    ...HlmButtonImports, ...HlmDropdownMenuImports, // the internal development record: the helm menus
    ...HlmSpinnerImports,
    ...HlmTooltipImports, // the internal development record: the helm tooltip on the widget controls
    CommonModule,
    MaterialModule,
    OverlayModule,
    PortalModule,
    FormsModule,
    TranslateModule,
    CommonDirectivesModule,
    RouterModule,
  ],
  declarations: [
    CopyPasteMessageComponent,
    ViewComponent,
    ViewControlComponent,
    ViewControllerComponent,
    Display,
    DisplayContainer,
    ViewChartComponent,
    ViewChartDonutComponent,
    ViewChartPieComponent,
    ViewChartGaugeComponent,
    ViewChartBarComponent,
    ViewChartLineComponent,
    WidgetComponent,
    WidgetSysInfoComponent,
    WidgetCpuComponent,
    WidgetMemoryComponent,
    WidgetPoolComponent,
    WidgetNetworkComponent,
    TextLimiterDirective,
    TextLimiterTooltipComponent,
    WidgetControllerComponent,
    SimpleFailoverBtnComponent,
    ConvertPipe,
  ],
  exports: [
    CommonModule,
    MaterialModule,
    OverlayModule,
    PortalModule,
    Display,
    DisplayContainer,
    CopyPasteMessageComponent,
    ViewComponent,
    ViewChartComponent,
    ViewChartDonutComponent,
    ViewChartGaugeComponent,
    ViewChartBarComponent,
    ViewChartPieComponent,
    ViewChartLineComponent,
    ViewControlComponent,
    ViewControllerComponent,
    WidgetComponent,
    WidgetSysInfoComponent,
    WidgetCpuComponent,
    WidgetMemoryComponent,
    TextLimiterTooltipComponent,
    WidgetPoolComponent,
    WidgetNetworkComponent,
    WidgetControllerComponent,
    SimpleFailoverBtnComponent,
  ],
  providers: [
    StorageService,
  ],
})
export class CoreComponents {}
