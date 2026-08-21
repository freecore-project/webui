import {
  Component, AfterViewInit, Input, OnDestroy,
} from '@angular/core';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { MaterialModule } from 'app/appMaterial.module';
import { NgForm } from '@angular/forms';
import { Subject } from 'rxjs';
import { FlexLayoutModule, MediaObserver } from '@angular/flex-layout';

import { Router } from '@angular/router';
import { UUID } from 'angular2-uuid';

import filesize from 'filesize';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';

import { TranslateService } from '@ngx-translate/core';

import { T } from '../../../../translate-marker';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'widget-cpu',
  templateUrl: './widgetcpu.component.html',
  styleUrls: ['./widgetcpu.component.css'],
  })
export class WidgetCpuComponent extends WidgetComponent implements AfterViewInit, OnDestroy {
  @Input() data: Subject<CoreEvent>;
  @Input() cpuModel: string;
  private _cpuData: any;
  get cpuData() { return this._cpuData; }
  set cpuData(value) {
    this._cpuData = value;
  }

  // Card-spec CPU frame (the internal development record): the average is a plain numeral
  // and the per-thread view is a CSS bar strip fed from these arrays — the
  // gauge + Chart.js canvas (and its render-empty-until-next-tick quirk)
  // are gone.
  avgUsage: number = null;
  threadUsage: number[] = [];
  threadTemps: number[] = [];

  title: string = T('CPU');
  subtitle: string = T('% of all cores');
  widgetColorCssVar = 'var(--accent)';
  configurable = false;
  chartId = UUID.UUID();
  coreCount: number;
  screenType = 'Desktop'; // Desktop || Mobile

  // Mobile Stats
  tempAvailable = 'false';
  tempMax: number;
  tempMaxThreads: number[] = [];
  tempMin: number;
  tempMinThreads: number[] = [];
  usageMax: number;
  usageMaxThreads: number[] = [];
  usageMin: number;
  usageMinThreads: number[] = [];

  constructor(public router: Router, public translate: TranslateService, public mediaObserver: MediaObserver) {
    super(translate);

    mediaObserver.asObservable().pipe(
      filter((changes) => changes.length > 0),
      map((changes) => changes[0]),
    ).subscribe((evt) => {
      this.screenType = evt.mqAlias == 'xs' ? 'Mobile' : 'Desktop';
    });
  }

  ngOnDestroy() {
    this.core.unregister({ observerClass: this });
  }

  ngAfterViewInit() {
    this.data.subscribe((evt: CoreEvent) => {
      if (evt.name == 'CpuStats') {
        if (evt.data.average) {
          this.avgUsage = Math.round(evt.data.average.usage);
          this.setCpuData(evt.data);
        }
      }
    });
  }

  parseCpuData(data) {
    this.tempAvailable = data.temperature_celsius && Object.keys(data.temperature_celsius).length > 0 ? 'true' : 'false';
    const usageColumn: any[] = ['Usage'];
    const temperatureColumn: any[] = ['Temperature'];

    // Calculate number of cores...
    const keys = Object.keys(data);

    if (!this.coreCount) {
      // Middleware always returns an empty array if no temperature data is reported
      this.coreCount = keys.length - 3; // Disregard keys for temperature, temperature_celsius and average
    }

    for (let i = 0; i < this.coreCount; i++) {
      usageColumn.push(parseInt(data[i.toString()].usage.toFixed(1)));

      if (this.tempAvailable && data.temperature_celsius && data.temperature_celsius[i]) {
        temperatureColumn.push(data.temperature_celsius[i]);
      }
    }

    this.setMobileStats(Object.assign([], usageColumn), Object.assign([], temperatureColumn));

    // Feed the per-thread bar strip (index 0 is the series label).
    this.threadUsage = usageColumn.slice(1);
    this.threadTemps = temperatureColumn.slice(1);

    return [usageColumn, temperatureColumn];
  }

  // Semantic bar coloring, same thresholds the facts already use:
  // temperature 70/80 when a sensor reports, usage 70/90 otherwise.
  barClass(index: number): string {
    const temp = this.threadTemps.length > index ? this.threadTemps[index] : null;
    if (temp != null) {
      if (temp > 79) { return 'danger'; }
      if (temp >= 70) { return 'warn'; }
    }
    const usage = this.threadUsage[index];
    if (usage > 89) { return 'danger'; }
    if (usage >= 70) { return 'warn'; }
    return '';
  }

  setMobileStats(usage, temps) {
    // Usage
    usage.splice(0, 1);
    this.usageMin = Math.min(...usage);
    this.usageMax = Math.max(...usage);
    this.usageMinThreads = [];
    this.usageMaxThreads = [];
    for (let u = 0; u < usage.length; u++) {
      if (usage[u] == this.usageMin) {
        this.usageMinThreads.push(u);
      }

      if (usage[u] == this.usageMax) {
        this.usageMaxThreads.push(u);
      }
    }

    // Temperature
    temps.splice(0, 1);
    this.tempMin = Math.min(...temps);
    this.tempMax = Math.max(...temps);
    this.tempMinThreads = [];
    this.tempMaxThreads = [];
    for (let t = 0; t < temps.length; t++) {
      if (temps[t] == this.tempMin) {
        this.tempMinThreads.push(t);
      }

      if (temps[t] == this.tempMax) {
        this.tempMaxThreads.push(t);
      }
    }
  }

  setCpuData(data) {
    const config: any = {};
    config.title = 'Cores';
    config.orientation = 'horizontal';
    config.max = 100;
    config.data = this.parseCpuData(data);
    this.cpuData = config;
  }

  setPreferences(form: NgForm) {
    const filtered: string[] = [];
    for (const i in form.value) {
      if (form.value[i]) {
        filtered.push(i);
      }
    }
  }
}
