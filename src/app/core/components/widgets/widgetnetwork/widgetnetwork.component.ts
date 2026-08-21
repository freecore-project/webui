import {
  Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, Input,
} from '@angular/core';
import { Router } from '@angular/router';
import { MediaObserver } from '@angular/flex-layout';
import { Subscription } from 'rxjs';
import { CoreEvent } from 'app/core/services/core.service';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';

import { TranslateService } from '@ngx-translate/core';

import { T } from '../../../../translate-marker';
import { filter, map } from 'rxjs/operators';

interface Converted {
  value: string;
  units: string;
}

interface Traffic {
  in: string;
  inUnits: string;
  out: string;
  outUnits: string;
  rate: number; // raw bytes/s (in + out) -- used for busiest-first ordering only
  rawIn: number;
  rawOut: number;
}

interface NetRow {
  name: string;
  media: string;
  ip: string;
  moreIps: number;
  vlans: number;
  traffic?: Traffic;
}

interface DownGroup {
  count: number;
  names: string[];
}

interface BridgeGroup {
  count: number;
  up: number;
}

// the internal development record: one aggregated Network card in place of one card per NIC.
// A box with VNET jails/VMs spawns a bridge per guest and quickly reaches 100+
// per-interface cards; this collapses them the way the locked card-system spec
// prescribes (aggregation before repetition) -- PHYSICAL uplinks busiest-first
// with live traffic, DOWN interfaces folded to a single row, bridges/VLANs
// summarised. Everything here is derived client-side from the same interface
// list + realtime stream the per-NIC widget already consumed; no backend change.
@Component({
  selector: 'widget-network',
  templateUrl: './widgetnetwork.component.html',
  styleUrls: ['./widgetnetwork.component.css'],
  })
export class WidgetNetworkComponent extends WidgetComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() stats;
  @Input() nics: any[] = [];

  title: string = T('Network');
  screenType = 'Desktop';

  // Physical rows shown before the frame's budget forces a "+ N more" row.
  // The frame never grows; overflow links to the interfaces page.
  readonly rowBudget = 6;

  // Live per-interface traffic, keyed by interface name (matches NetTraffic_<name>).
  traffic: { [name: string]: Traffic } = {};

  // Derived, rebuilt on data/traffic change so the template binds stable fields.
  physicalVisible: NetRow[] = [];
  physicalOverflow = 0;
  down: DownGroup = { count: 0, names: [] };
  bridges: BridgeGroup = { count: 0, up: 0 };
  vlanTotal = 0;
  vlanSummary = '';
  vlanTraffic: Traffic = null;
  hasVirtual = false;

  private trafficSub: Subscription;

  constructor(public router: Router, public translate: TranslateService, public mediaObserver: MediaObserver) {
    super(translate);
    this.configurable = false;
    this.mediaObserver.asObservable().pipe(
      filter((changes) => changes.length > 0),
      map((changes) => changes[0]),
    ).subscribe((evt) => {
      this.screenType = evt.mqAlias == 'xs' ? 'Mobile' : 'Desktop';
    });
  }

  ngOnInit() {
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.nics) {
      this.rebuild();
    }
  }

  ngAfterViewInit() {
    if (!this.stats) { return; }
    this.trafficSub = this.stats.subscribe((evt: CoreEvent) => {
      if (!evt.name || evt.name.indexOf('NetTraffic_') !== 0) { return; }
      const name = evt.name.substring('NetTraffic_'.length);
      const received: Converted = this.convert(evt.data.received_bytes_rate);
      const sent: Converted = this.convert(evt.data.sent_bytes_rate);
      this.traffic[name] = {
        in: received.value,
        inUnits: received.units,
        out: sent.value,
        outUnits: sent.units,
        rate: (evt.data.received_bytes_rate || 0) + (evt.data.sent_bytes_rate || 0),
        rawIn: evt.data.received_bytes_rate || 0,
        rawOut: evt.data.sent_bytes_rate || 0,
      };
      this.rebuild();
    });
  }

  ngOnDestroy() {
    if (this.trafficSub) { this.trafficSub.unsubscribe(); }
    this.core.unregister({ observerClass: this });
  }

  trackByName(index: number, row: NetRow) {
    return row.name;
  }

  private isUp(nic): boolean {
    return !!(nic && nic.state && nic.state.link_state == 'LINK_STATE_UP');
  }

  private isPhysical(nic): boolean {
    return nic.type == 'PHYSICAL' || nic.type == 'LINK_AGGREGATION';
  }

  private ipsOf(nic): any[] {
    if (!nic.state || !nic.state.aliases) { return []; }
    return nic.state.aliases.filter((a) => a.type == 'INET' || a.type == 'INET6');
  }

  private rate(name: string): number {
    return this.traffic[name] ? this.traffic[name].rate : 0;
  }

  private toRow(nic): NetRow {
    const ips = this.ipsOf(nic);
    return {
      name: nic.name,
      media: nic.state ? (nic.state.active_media_subtype || nic.state.active_media_type || '') : '',
      ip: ips.length ? ips[0].address + '/' + ips[0].netmask : '',
      moreIps: ips.length > 1 ? ips.length - 1 : 0,
      vlans: nic.state && nic.state.vlans ? nic.state.vlans.length : 0,
      traffic: this.traffic[nic.name],
    };
  }

  // Recompute the aggregated view. Cheap (a handful of interfaces); runs on the
  // realtime cadence (~2s) so busiest-first ordering tracks live traffic while
  // trackBy keeps the DOM stable across re-sorts.
  private rebuild() {
    if (!this.nics) { return; }

    const physical = this.nics.filter((n) => this.isPhysical(n));

    const up = physical
      .filter((n) => this.isUp(n))
      .sort((a, b) => this.rate(b.name) - this.rate(a.name))
      .map((n) => this.toRow(n));
    this.physicalVisible = up.slice(0, this.rowBudget);
    this.physicalOverflow = up.length > this.rowBudget ? up.length - this.rowBudget : 0;

    const downNics = physical.filter((n) => !this.isUp(n));
    this.down = { count: downNics.length, names: downNics.map((n) => n.name) };

    const bridgeNics = this.nics.filter((n) => n.type == 'BRIDGE');
    this.bridges = { count: bridgeNics.length, up: bridgeNics.filter((n) => this.isUp(n)).length };

    // The dashboard's NicInfo handler folds each VLAN's state into
    // parent.state.vlans and drops the top-level entry, so vlan counting
    // reads the folded lists (an orphan VLAN entry survives only when its
    // parent is absent from the list).
    let vlans = 0;
    const vlanStates = [];
    const vlanParents = [];
    this.nics.forEach((n) => {
      if (n.type == 'VLAN') {
        vlans += 1;
        if (n.state) { vlanStates.push(n.state); }
      }
      if (n.state && n.state.vlans && n.state.vlans.length) {
        vlans += n.state.vlans.length;
        vlanStates.push(...n.state.vlans);
        vlanParents.push(n.name);
      }
    });
    this.vlanTotal = vlans;

    // Aggregate VLAN row meta: parents + busiest member + summed live traffic.
    let busiest = '';
    let busiestRate = 0;
    let rawIn = 0;
    let rawOut = 0;
    let seen = false;
    vlanStates.forEach((state) => {
      const t = state && state.name ? this.traffic[state.name] : null;
      if (!t) { return; }
      seen = true;
      rawIn += t.rawIn;
      rawOut += t.rawOut;
      if (t.rate > busiestRate) { busiestRate = t.rate; busiest = state.name; }
    });
    const parts = [];
    if (vlanParents.length) {
      parts.push('on ' + vlanParents.slice(0, 2).join(', ') + (vlanParents.length > 2 ? ' +' + (vlanParents.length - 2) : ''));
    }
    if (busiest && busiestRate > 0) { parts.push('busiest ' + busiest); }
    this.vlanSummary = parts.join(' · ');
    if (seen) {
      const rin = this.convert(rawIn);
      const rout = this.convert(rawOut);
      this.vlanTraffic = {
        in: rin.value, inUnits: rin.units, out: rout.value, outUnits: rout.units, rate: rawIn + rawOut, rawIn, rawOut,
      };
    } else {
      this.vlanTraffic = null;
    }

    this.hasVirtual = this.bridges.count > 0 || this.vlanTotal > 0;
  }

  goToInterfaces() {
    this.router.navigate(['network/interfaces']);
  }

  goToInterface(name: string) {
    this.router.navigate(['network/interfaces/edit/' + name]);
  }

  goToReports() {
    this.router.navigate(['reportsdashboard/network']);
  }

  // Byte-rate -> value + IEC units. Ported from widgetnic so the two widgets
  // read identically.
  convert(value): Converted {
    let result;
    let units;

    switch (this.optimizeUnits(value)) {
      case 'B':
      case 'KB':
        units = T('KiB');
        result = value / 1024;
        break;
      case 'MB':
        units = T('MiB');
        result = value / 1024 / 1024;
        break;
      case 'GB':
        units = T('GiB');
        result = value / 1024 / 1024 / 1024;
        break;
      case 'TB':
        units = T('TiB');
        result = value / 1024 / 1024 / 1024 / 1024;
        break;
      case 'PB':
        units = T('PiB');
        result = value / 1024 / 1024 / 1024 / 1024 / 1024;
        break;
      default:
        units = T('KiB');
        result = 0.00;
    }

    return result ? { value: result.toFixed(2), units } : { value: '0.00', units };
  }

  optimizeUnits(value) {
    let units = 'B';
    if (value > 1024 && value < (1024 * 1024)) {
      units = 'KB';
    } else if (value >= (1024 * 1024) && value < (1024 * 1024 * 1024)) {
      units = 'MB';
    } else if (value >= (1024 * 1024 * 1024) && value < (1024 * 1024 * 1024 * 1024)) {
      units = 'GB';
    } else if (value >= (1024 * 1024 * 1024 * 1024) && value < (1024 * 1024 * 1024 * 1024 * 1024)) {
      units = 'TB';
    }

    return units;
  }
}
