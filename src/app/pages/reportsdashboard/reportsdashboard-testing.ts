import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NEVER, of, Subject } from 'rxjs';
import moment from 'moment-timezone';
import { CoreService } from '../../core/services/core.service';
import { CoreServiceInjector } from '../../core/services/coreserviceinjector';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';
import { DialogService, RestService, WebSocketService } from '../../services';
import { LocaleService } from '../../services/locale.service';
import { ThemeService } from '../../services/theme/theme.service';
import { ReportsDashboardComponent } from './reportsdashboard.component';
import { ReportComponent, ReportData } from './components/report/report.component';
import { LineChartComponent } from './components/lineChart/lineChart.component';
import { ReportsService } from './reports.service';
import { ReportsPageScrollDirective } from './reports-page-scroll.directive';

// Only the unrelated entity-toolbar engine is stubbed. Page, report, CDK and Dygraph are real.
@Component({ standalone: false, selector: 'entity-toolbar', template: '<span>Devices</span> <span>Metrics</span>' })
class ReportToolbarFixtureComponent {
  @Input() target: any;
  @Input() conf: any;
}

export const settleReports = (ms = 70): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function reportData(series = 5): ReportData {
  return {
    name: 'cpu', start: 1790000000, end: 1790000600, step: 60,
    legend: Array.from({ length: series }, (_, i) => i === 0 ? 'System' : `Series ${i}`),
    aggregations: {
      min: Array.from({ length: series }, () => 0),
      mean: Array.from({ length: series }, () => 0.25),
      max: Array.from({ length: series }, (_, i) => i === 0 ? null : 1),
    },
    data: Array.from({ length: 10 }, () => Array.from({ length: series }, (_, i) => i)) as any,
  };
}

export async function configureReportingFixtures() {
  const streams = new Map<string, Subject<any>>();
  const events = (name: string): Subject<any> => {
    if (!streams.has(name)) { streams.set(name, new Subject()); }
    return streams.get(name);
  };
  const theme = { fg2: '#97a6ae', accentColors: ['blue', 'green', 'red'], blue: '#408aca', green: '#70a970', red: '#cc6666' };
  const themeService = { currentTheme: () => theme };
  const core = {
    register: ({ eventName }) => events(eventName),
    unregister: jasmine.createSpy('unregister'),
    emit: jasmine.createSpy('emit').and.callFake((evt) => {
      if (evt.name === 'ThemeDataRequest') { events('ThemeData').next({ data: theme }); }
      if (evt.name === 'ReportDataRequest') {
        events('ReportData-' + evt.sender.chartId).next({ data: { requestId: evt.data.requestId, result: reportData() } });
      }
      if (evt.name.startsWith('LegendEvent-')) { events(evt.name).next(evt); }
    }),
  };
  const getService = CoreServiceInjector.get.bind(CoreServiceInjector);
  spyOn(CoreServiceInjector, 'get').and.callFake((token: any) => {
    if (token === CoreService) { return core; }
    if (token === ThemeService) { return themeService; }
    return getService(token);
  });
  const router = { navigate: jasmine.createSpy('navigate'), events: NEVER, url: '/reportsdashboard/cpu' };
  const ws = { call: jasmine.createSpy('call').and.callFake((method: string) => {
    if (method === 'system.general.config') { return of({ timezone: 'America/Los_Angeles' }); }
    if (method === 'system.advanced.config') { return of({ consolemsg: false }); }
    return of([]);
  }) };
  const serverTime = new Date();
  const dialog = { confirm: jasmine.createSpy('confirm').and.returnValue(of(false)) };
  await TestBed.configureTestingModule({
    declarations: [ReportsDashboardComponent, ReportComponent, LineChartComponent, ReportToolbarFixtureComponent],
    imports: [CommonModule, ScrollingModule, ReportsPageScrollDirective, MatIconModule, TranslateModule.forRoot(), CommonDirectivesModule,
      ...HlmButtonImports, ...HlmDropdownMenuImports, ...HlmSpinnerImports, ...HlmTooltipImports],
    providers: [
      { provide: CoreService, useValue: core }, { provide: ThemeService, useValue: themeService },
      { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: {} },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'cpu' }], queryParams: {} } } },
      { provide: ReportsService, useValue: { getServerTime: () => of(serverTime) } },
      { provide: LocaleService, useValue: {
        formatDateTime: (date: Date, timezone: string) => moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss'),
        formatDateTimeWithNoTz: (date: Date) => moment(date).format('YYYY-MM-DD HH:mm:ss'),
      } },
      { provide: DialogService, useValue: dialog },
    ],
  }).compileComponents();
  const reply = (report: ReportComponent, result: any): void => {
    const request = core.emit.calls.allArgs().map(([event]) => event)
      .filter((event) => event.name === 'ReportDataRequest' && event.sender === report).pop();
    events('ReportData-' + report.chartId).next({ data: { requestId: request?.data.requestId, result } });
  };
  return { core, events, ws, router, dialog, reply };
}
