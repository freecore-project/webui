import {
  Component, ElementRef, OnInit, OnDestroy, AfterViewInit, EventEmitter, Output, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone,
} from '@angular/core';
import {
  Router, NavigationEnd, NavigationCancel, ActivatedRoute, ActivatedRouteSnapshot,
} from '@angular/router';
import * as _ from 'lodash';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { FormConfig } from 'app/pages/common/entity/entity-form/entity-form-embedded.component';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { CommonDirectivesModule } from 'app/directives/common/common-directives.module';
import { Report, ReportLayout, REPORT_SLOT_HEIGHTS } from './components/report/report.component';
import { ReportsService } from './reports.service';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import { TranslateService } from '@ngx-translate/core';
import { T } from '../../translate-marker';
import {
  RestService,
  SystemGeneralService,
  WebSocketService,
} from '../../services';

interface PageScrollSnapshot {
  width: number;
  height: number;
  extent: number;
  origin: number;
  offset: number;
  itemSize: number;
  reports: Report[];
  visible: number[];
  identities: string;
}

interface Tab {
  label: string;
  value: string;
}

@Component({
  standalone: false,
  selector: 'reportsdashboard',
  styleUrls: ['./reportsdashboard.scss'],
  templateUrl: './reportsdashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [SystemGeneralService],
})
export class ReportsDashboardComponent implements OnInit, OnDestroy, /* HandleChartConfigDataFunc, */ AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport, { static: false }) viewport: CdkVirtualScrollViewport;
  @ViewChild('page', { static: true }) page: ElementRef<HTMLElement>;
  @ViewChild('toolbar', { static: true }) toolbar: ElementRef<HTMLElement>;
  @ViewChild('master', { static: true }) master: ElementRef<HTMLElement>;
  reportLayout: ReportLayout = 'wide';
  get reportItemSize(): number { return REPORT_SLOT_HEIGHTS[this.reportLayout]; }
  private resizeObserver: ResizeObserver;
  private shellObserver: MutationObserver;
  private resizeFrame: number;
  private scrollSnapshot: PageScrollSnapshot;
  private scrollSubscription: Subscription;
  private destroyed = false;
  private scheduleLayout = () => {
    if (this.destroyed || this.resizeFrame !== undefined) { return; }
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      this.updateViewportLayout();
    });
  };
  scrollContainer: HTMLElement;
  scrolledIndex = 0;
  isFooterConsoleOpen;

  product_type: string = window.localStorage['product_type'];
  retroLogo: string;

  multipathTitles: any = {};
  diskReports: Report[];
  otherReports: Report[];
  activeReports: Report[] = [];

  activeTab = 'CPU'; // Tabs (lower case only): CPU, Disk, Memory, Network, NFS, Partition?, System, Target, UPS, ZFS
  activeTabVerified = false;
  allTabs: Tab[] = [];
  loadingReports = false;

  displayList: number[] = [];
  visibleReports: number[] = [];

  totalVisibleReports = 4;
  viewportEnd = false;
  viewportOffset = new BehaviorSubject(null);

  // Report Builder Options (entity-form-embedded)
  target: Subject<CoreEvent> = new Subject();
  values = [];
  toolbarConfig: any[] = [];
  protected isEntity = true;
  diskDevices = [];
  diskMetrics = [];
  categoryDevices = [];
  categoryMetrics = [];
  saveSubmitText = T('Generate Reports');
  actionButtonsAlign = 'left';
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[];
  disksWithNoTempGraphs: { [disk: string]: Report };
  diskReportConfigReady = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
    public translate: TranslateService,
    private router: Router,
    private core: CoreService,
    protected ws: WebSocketService,
    private route: ActivatedRoute,
  ) {

    // EXAMPLE METHOD
    // this.viewport.scrollToIndex(5);
  }

  ngOnInit() {
    this.scrollContainer = this.page.nativeElement.closest('.rightside-content-hold');

    this.ws.call('system.advanced.config').subscribe((res) => {
      if (res) {
        this.isFooterConsoleOpen = res.consolemsg;
      }
    });

    this.core.register({ observerClass: this, eventName: 'UserPreferencesReady' }).subscribe((evt: CoreEvent) => {
      this.retroLogo = evt.data.retroLogo ? '1' : '0';
    });

    this.core.register({ observerClass: this, eventName: 'UserPreferencesChanged' }).subscribe((evt: CoreEvent) => {
      this.retroLogo = evt.data.retroLogo ? '1' : '0';
    });

    this.core.register({ observerClass: this, eventName: 'UserPreferences' }).subscribe((evt: CoreEvent) => {
      this.retroLogo = evt.data.retroLogo ? '1' : '0';
    });

    this.core.emit({ name: 'UserPreferencesRequest' });

    this.core.register({ observerClass: this, eventName: 'ReportingGraphs' }).subscribe((evt: CoreEvent) => {
      if (evt.data) {
        const allReports = evt.data.map((report) => {
          const list = [];
          if (report.identifiers) {
            for (let i = 0; i < report.identifiers.length; i++) {
              list.push(true);
            }
          } else {
            list.push(true);
          }
          report.isRendered = list;
          return report;
        });

        this.diskReports = allReports.filter((report) => report.name.startsWith('disk'));

        this.otherReports = allReports.filter((report) => !report.name.startsWith('disk'));

        this.generateTabs();

        this.activateTabFromUrl();
      }
    });

    this.diskQueries();
  }

  diskQueries() {
    this.ws.call('multipath.query').subscribe((multipath_res) => {
      let multipathDisks = [];
      multipath_res.forEach((m) => {
        const children = m.children.map((child) => ({ disk: m.name.replace('multipath/', ''), name: child.name, status: child.status }));
        multipathDisks = multipathDisks.concat(children);
      });

      this.ws.call('disk.query').subscribe((res) => {
        const noTempDisks = res.filter((disk) => disk.hddstandby !== 'ALWAYS ON' && !disk.hddstandby_force);
        if (!this.disksWithNoTempGraphs) {
          this.disksWithNoTempGraphs = {};
        }
        for (const disk of noTempDisks) {
          this.disksWithNoTempGraphs[disk.name] = {
            identifiers: [disk.identifier],
            name: disk.name + '-temp',
            title: 'Disk Temperatur ' + disk.name,
            empty: {
              title: T('Disk Temperatures Not Available'),
              message: T('This disk cannot collect temperature data the way it is currently configured. Please either enable ‘Force HDD Standby’ or set ‘HDD Standby’ to ‘Never’ in order to enable temperature data collection.'),
              button: {
                text: T('Edit Disk'),
                click: () => {
                  this.router.navigate(new Array('/').concat([
                    'storage', 'disks', 'edit', disk.identifier,
                  ]));
                },
              },
            },
          };
        }

        this.parseDisks(res, multipathDisks);
        this.core.emit({ name: 'ReportingGraphsRequest', sender: this });
      });
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.shellObserver?.disconnect();
    this.scrollSubscription?.unsubscribe();
    window.removeEventListener('resize', this.scheduleLayout);
    if (this.resizeFrame !== undefined) { cancelAnimationFrame(this.resizeFrame); }
    this.core.unregister({ observerClass: this });
  }

  ngAfterViewInit(): void {
    this.setupSubscriptions();
    this.zone.runOutsideAngular(() => {
      this.scrollSubscription = this.viewport.scrollable.elementScrolled().subscribe(() => {
        const current = this.measurePageScroll();
        if (!this.scrollSnapshot || !this.sameReportCollection(this.scrollSnapshot, current)) {
          // A replacement collection owns its own current native position.
          this.scrollSnapshot = undefined;
          this.scheduleLayout();
        } else if (this.sameScrollGeometry(this.scrollSnapshot, current)) {
          this.scrollSnapshot = current;
        } else {
          // Responsive reflow can clamp scrollTop before ResizeObserver runs.
          // Its queued scroll event must not replace the last settled anchor.
          this.scheduleLayout();
        }
      });
      this.resizeObserver = new ResizeObserver(this.scheduleLayout);
      this.resizeObserver.observe(this.page.nativeElement);
      this.resizeObserver.observe(this.toolbar.nativeElement);
      if (this.scrollContainer) {
        this.resizeObserver.observe(this.scrollContainer);
        const footer = this.scrollContainer.querySelector('.fc-project-footer');
        if (footer) { this.resizeObserver.observe(footer); }
        // The optional console is a shell sibling. Observe insertion/removal, not chart DOM changes.
        if (this.scrollContainer.parentElement) {
          this.shellObserver = new MutationObserver(this.scheduleLayout);
          this.shellObserver.observe(this.scrollContainer.parentElement, { childList: true });
        }
      }
      window.addEventListener('resize', this.scheduleLayout, { passive: true });
      this.scheduleLayout();
    });
  }

  private measurePageScroll(): PageScrollSnapshot {
    return {
      width: this.master.nativeElement.clientWidth,
      height: this.scrollContainer.clientHeight,
      extent: this.scrollContainer.scrollHeight,
      origin: this.viewport.measureViewportOffset(),
      offset: this.scrollContainer.scrollTop,
      itemSize: this.reportItemSize,
      reports: this.activeReports,
      visible: this.visibleReports,
      identities: JSON.stringify(this.visibleReports.map((key, index) => this.trackReport(index, key))),
    };
  }

  private sameReportCollection(previous: PageScrollSnapshot, current: PageScrollSnapshot): boolean {
    return previous.reports === current.reports && previous.visible === current.visible
      && previous.identities === current.identities && previous.itemSize === current.itemSize;
  }

  private sameScrollGeometry(previous: PageScrollSnapshot, current: PageScrollSnapshot): boolean {
    return previous.width === current.width && previous.height === current.height
      && previous.extent === current.extent && previous.origin === current.origin;
  }

  private updateViewportLayout(): void {
    const master = this.master.nativeElement;
    const width = master.clientWidth;
    if (!width || !this.viewport) { return; }
    const layout: ReportLayout = width < 480 ? 'compact' : width < 900 ? 'stacked' : 'wide';
    const previousSize = this.reportItemSize;
    const current = this.measurePageScroll();
    const previous = this.scrollSnapshot && this.sameReportCollection(this.scrollSnapshot, current)
      && !this.sameScrollGeometry(this.scrollSnapshot, current) ? this.scrollSnapshot : current;
    const currentOrigin = current.origin;
    const previousOrigin = previous.origin;
    const shellOffset = previous.offset;
    // Layout origins can be fractional while native scrollTop rounds to a CSS
    // pixel. A visually aligned first report is not partly visible toolbar.
    const beforeList = shellOffset === 0 || shellOffset + 0.5 < previousOrigin;
    const logicalOffset = Math.max(0, shellOffset - previousOrigin) / previousSize;
    this.zone.run(() => {
      const nextSize = REPORT_SLOT_HEIGHTS[layout];
      if (previousSize !== nextSize || previousOrigin !== currentOrigin || shellOffset !== current.offset) {
        // Apply the new scroll extent before moving: the old spacer would clamp
        // a larger offset near the last report. Then move before CDK consumes
        // the new itemSize, so it never interprets old pixels as another report
        // and destroys the visible view (including its range/data channel).
        this.viewport.setTotalContentSize(this.visibleReports.length * nextSize);
        this.changeDetector.detectChanges();
        // CDK measures relative to the list, but its public scrollToOffset writes
        // raw pixels into the external shell. Keep page top/partly visible controls
        // in place; report anchors require the current list origin as well.
        this.viewport.scrollToOffset(beforeList ? shellOffset : currentOrigin + logicalOffset * nextSize);
      }
      this.reportLayout = layout;
      this.changeDetector.detectChanges();
      this.viewport.checkViewportSize();
      this.scrollSnapshot = this.measurePageScroll();
    });
  }

  getVisibility(key) {
    const test = this.visibleReports.indexOf(key);
    return test != -1;
  }

  getBatch(lastSeen: string) {
    return this.visibleReports;
  }

  nextBatch(evt, offset) {
    this.scrolledIndex = evt;
  }

  // A ReportComponent owns chart/data/error state and an async response channel.
  // Keep a view only for the same logical report; numeric list positions can
  // select another Disk device. The template also disables CDK's detached-view
  // cache so a different report can never inherit an old chartId or response.
  trackReport = (_index: number, reportIndex: number): string => {
    const report = this.activeReports[reportIndex];
    return report
      ? JSON.stringify([report.name, report.identifiers?.[0] ?? null])
      : JSON.stringify([null, reportIndex]);
  };

  generateTabs() {
    const labels = [T('CPU'), T('Disk'), T('Memory'), T('Network'), T('NFS'), T('Partition'), T('System'), T('Target'), T('ZFS')];
    const UPS = this.otherReports.find((report) => report.title.startsWith('UPS'));

    if (UPS) {
      labels.splice(8, 0, 'UPS');
    }

    labels.forEach((item) => {
      this.allTabs.push({ label: item, value: item.toLowerCase() });
    });
  }

  activateTabFromUrl() {
    const subpath = this.route.snapshot.url[0] && this.route.snapshot.url[0].path;
    const tabFound = this.allTabs.find((tab) => tab.value === subpath);
    this.updateActiveTab(tabFound || this.allTabs[0]);
  }

  isActiveTab(str: string) {
    let test: boolean;
    if (!this.activeTab) {
      test = ('/reportsdashboard/' + str.toLowerCase()) == this.router.url;
    } else {
      test = (this.activeTab == str.toLowerCase());
    }
    return test;
  }

  updateActiveTab(tab: Tab) {
    // Change the URL without reloading page/component
    // the old fashioned way
    window.history.replaceState({}, '', '/reportsdashboard/' + tab.value);

    const pseudoRouteEvent = [
      {
        url: '/reportsdashboard/' + tab.value,
        title: 'Reporting',
        breadcrumb: 'Reporting',
        disabled: true,
      },
      {
        url: '',
        title: tab.label,
        breadcrumb: tab.label,
        disabled: true,
      },
    ];

    this.core.emit({ name: 'PseudoRouteChange', data: pseudoRouteEvent });

    this.activateTab(tab.label);

    if (tab.label == 'Disk') {
      const selectedDisks = this.route.snapshot.queryParams.disks || [];
      this.diskReportBuilderSetup(selectedDisks);
    }
  }

  navigateToTab(tabName) {
    const link = '/reportsdashboard/' + tabName.toLowerCase();
    this.router.navigate([link]);
  }

  activateTab(name: string) {
    this.activeTab = name;
    this.activeTabVerified = true;

    const reportCategories = name == 'Disk' ? this.diskReports : this.otherReports.filter((report) => {
      // Tabs: CPU, Disk, Memory, Network, NFS, Partition, System, Target, UPS, ZFS
      let condition;
      switch (name) {
        case 'CPU':
          condition = (report.name == 'cpu' || report.name == 'load' || report.name == 'cputemp');
          break;
        case 'Memory':
          condition = (report.name == 'memory' || report.name == 'swap');
          break;
        case 'Network':
          condition = (report.name == 'interface');
          break;
        case 'NFS':
          condition = (report.name == 'nfsstat' || report.name == 'nfsstatbytes');
          break;
        case 'Partition':
          condition = (report.name == 'df');
          break;
        case 'System':
          condition = (report.name == 'processes' || report.name == 'uptime');
          break;
        case 'Target':
          condition = (report.name == 'ctl');
          break;
        case 'UPS':
          condition = report.name.startsWith('ups');
          break;
        case 'ZFS':
          condition = report.name.startsWith('arc');
          break;
        default:
          condition = true;
      }

      return condition;
    });

    this.activeReports = this.flattenReports(reportCategories);

    if (name !== 'Disk') {
      const keys = Object.keys(this.activeReports);
      this.visibleReports = keys.map((v) => parseInt(v));
    }
  }

  flattenReports(list: Report[]) {
    // Based on identifiers, create a single dimensional array of reports to render
    const result = [];
    list.forEach((report) => {
      // Without identifiers

      // With identifiers
      if (report.identifiers) {
        report.identifiers.forEach((item, index) => {
          const r = { ...report };
          r.title = r.title.replace(/{identifier}/, item);

          r.identifiers = [item];
          if (report.isRendered[index]) {
            r.isRendered = [true];
            result.push(r);
          }
        });
      } else if (!report.identifiers && report.isRendered[0]) {
        const r = { ...report };
        r.identifiers = [];
        result.push(r);
      }
    });

    return result;
  }

  // Disk Report Filtering

  diskReportBuilderSetup(selectedDisks: string[]) {
    this.generateValues();

    // Entity-Toolbar Config
    this.toolbarConfig = [
      {
        type: 'multimenu',
        name: 'devices',
        label: T('Devices'),
        disabled: false,
        options: this.diskDevices, // eg. [{label:'ada0',value:'ada0'},{label:'ada1', value:'ada1'}],
        value: this.diskDevices && selectedDisks ? this.diskDevices.filter((device) => selectedDisks.includes(device.value)) : null,
      },
      {
        type: 'multimenu',
        name: 'metrics',
        label: T('Metrics'),
        disabled: false,
        options: this.diskMetrics ? this.diskMetrics : [T('Not Available')], // eg. [{label:'temperature',value:'temperature'},{label:'operations', value:'disk_ops'}],
      },
    ];

    // Entity-Form Config
    this.fieldSets = [
      {
        name: 'Report Options',
        class: 'preferences',
        label: false,
        width: '600px',
        config: [
          {
            type: 'select',
            name: 'devices',
            width: 'calc(50% - 16px)',
            placeholder: T('Devices'),
            options: this.diskDevices, // eg. [{label:'ada0',value:'ada0'},{label:'ada1', value:'ada1'}],
            required: true,
            multiple: true,
            tooltip: T('Choose a device for your report.'),
            class: 'inline',
          },
          {
            type: 'select',
            name: 'metrics',
            width: 'calc(50% - 16px)',
            placeholder: T('Metrics'),
            options: this.diskMetrics ? this.diskMetrics : [{ label: 'None available', value: 'negative' }], // eg. [{label:'temperature',value:'temperature'},{label:'operations', value:'disk_ops'}],
            required: true,
            multiple: true,
            tooltip: T('Choose a metric to display.'),
            class: 'inline',
          },
        ],
      },
    ];

    this.generateFieldConfig();
  }

  generateValues() {
    const metrics = [];

    this.diskReports.forEach((item) => {
      let formatted = item.title.replace(/ \(.*\)/, '');// remove placeholders for identifiers eg. '({identifier})'
      formatted = formatted.replace(/identifier/, '');
      formatted = formatted.replace(/[{][}]/, '');
      formatted = formatted.replace(/requests on/, '');
      metrics.push({ label: formatted, value: item.name });
    });

    this.diskMetrics = metrics;
  }

  generateFieldConfig() {
    for (const i in this.fieldSets) {
      for (const ii in this.fieldSets[i].config) {
        this.fieldConfig.push(this.fieldSets[i].config[ii]);
      }
    }
    this.diskReportConfigReady = true;
  }

  setupSubscriptions() {
    this.target.subscribe((evt: CoreEvent) => {
      switch (evt.name) {
        case 'FormSubmitted':
          this.buildDiskReport(evt.data.devices, evt.data.metrics);
          break;
        case 'ToolbarChanged':
          if (evt.data.devices && evt.data.metrics) {
            this.buildDiskReport(evt.data.devices, evt.data.metrics);
          }
          break;
      }
    });

    this.target.next({ name: 'Refresh' });
  }

  buildDiskReport(device: string | any[], metric: string | any[]) {
    let metricValue: string;
    if (Array.isArray(metric) && metric.length > 0) {
      metricValue = metric[0].value;
    } else {
      metricValue = metric as string;
    }
    // Convert strings to arrays
    if (typeof device == 'string') {
      device = [device];
    } else {
      device = device.map((v) => v.value);
    }

    if (typeof metric == 'string') {
      metric = [metric];
    } else {
      metric = metric.map((v) => v.value);
    }

    const visible = [];
    this.activeReports.forEach((item, index) => {
      const deviceMatch = device.indexOf(item.identifiers[0]) !== -1;
      const metricMatch = metric.indexOf(item.name) !== -1;
      const condition = (deviceMatch && metricMatch);
      if (condition) {
        visible.push(index);
      }
    });

    const visibleNoTempDisks = device.filter((dev) => Object.keys(this.disksWithNoTempGraphs).includes(dev));

    if (metric.indexOf('disktemp') !== -1 && visibleNoTempDisks.length) {
      for (const disk of visibleNoTempDisks) {
        this.activeReports.push(this.disksWithNoTempGraphs[disk]);
        visible.push(this.activeReports.length - 1);
      }
    }

    this.visibleReports = visible;
  }

  parseDisks(res, multipathDisks) {
    const uniqueNames = res.filter((disk) => !disk.devname.includes('multipath'))
      .map((d) => d.devname);

    const activeDisks = multipathDisks.filter((disk) => disk.status == 'ACTIVE');

    const multipathTitles = {};

    const multipathNames = activeDisks.map((disk) => {
      const label = disk.disk; // disk.name + ' (multipath : ' + disk.disk  + ')';
      // Update activeReports with multipathTitles
      multipathTitles[disk.name] = label;
      return {
        label: disk.disk, value: disk.name, labelIcon: 'multipath', labelIconType: 'custom',
      };
    });

    this.multipathTitles = multipathTitles;

    // uniqueNames = uniqueNames.concat(multipathNames);

    const diskDevices = uniqueNames.map((devname) => {
      const spl = devname.split(' ');
      const obj = { label: devname, value: spl[0] };
      return obj;
    });

    this.diskDevices = diskDevices.concat(multipathNames);
  }
}
