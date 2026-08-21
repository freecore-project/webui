import {
  Component, AfterViewInit, Input, OnDestroy,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CoreEvent } from 'app/core/services/core.service';
import { Subject } from 'rxjs';
import { MediaObserver } from '@angular/flex-layout';

import { Router } from '@angular/router';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { TranslateService } from '@ngx-translate/core';

import { T } from '../../../../translate-marker';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'widget-memory',
  templateUrl: './widgetmemory.component.html',
  styleUrls: ['./widgetmemory.component.css'],
  })
export class WidgetMemoryComponent extends WidgetComponent implements AfterViewInit, OnDestroy {
  @Input() data: Subject<CoreEvent>;
  @Input() ecc = false;
  memData: any;
  arcHitPct: number = null;

  title: string = T('Memory');
  widgetColorCssVar = 'var(--accent)';
  configurable = false;
  colorPattern: string[];
  currentTheme;

  screenType = 'Desktop';

  constructor(public router: Router, public translate: TranslateService, private sanitizer: DomSanitizer, public mediaObserver: MediaObserver) {
    super(translate);
    mediaObserver.asObservable().pipe(
      filter((changes) => changes.length > 0),
      map((changes) => changes[0]),
    ).subscribe((evt) => {
      const st = evt.mqAlias == 'xs' ? 'Mobile' : 'Desktop';
      this.screenType = st;
    });
  }

  ngOnDestroy() {
    this.core.unregister({ observerClass: this });
  }

  ngAfterViewInit() {
    this.data.subscribe((evt: CoreEvent) => {
      if (evt.name == 'MemoryStats') {
        if (evt.data.used) {
          this.setMemData(evt.data);
        }
      }
    });
  }

  bytesToGigabytes(value) {
    return value / 1024 / 1024 / 1024;
  }

  parseMemData(data) {
    const services = data['total'] - data['free'] - data['arc_size'];

    const columns = [
      ['Free', this.bytesToGigabytes(data['free']).toFixed(1)],
      ['ZFS Cache', this.bytesToGigabytes(data['arc_size']).toFixed(1)],
      ['Services', this.bytesToGigabytes(services).toFixed(1)],
    ];

    return columns;
  }

  setMemData(data) {
    const config: any = {};
    config.units = 'GiB';
    config.max = this.bytesToGigabytes(data.total).toFixed(1);
    config.data = this.parseMemData(data);
    this.memData = config;
    // ARC hit ratio rides the same realtime payload (card-spec reserve fact).
    this.arcHitPct = data.cache_hit_ratio != null ? Math.round(data.cache_hit_ratio * 100) : null;

    if (!this.colorPattern) {
      this.currentTheme = this.themeService.currentTheme();
      this.colorPattern = this.processThemeColors(this.currentTheme);
    }
  }

  segPercent(index: number): number {
    if (!this.memData || !this.memData.max || parseFloat(this.memData.max) === 0) {
      return 0;
    }
    return (parseFloat(this.memData.data[index][1]) / parseFloat(this.memData.max)) * 100;
  }

  trustedSecurity(style) {
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }

  private processThemeColors(theme): string[] {
    const colors: string[] = [];
    theme.accentColors.map((color) => {
      colors.push(theme[color]);
    });
    return colors;
  }
}
