import {
  Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, Input,
  ChangeDetectionStrategy, ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoreEvent } from 'app/core/services/core.service';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';

import { TranslateService } from '@ngx-translate/core';

import { T } from '../../../../translate-marker';
import { filter, map } from 'rxjs/operators';
import {
  IfaceRef, addressesOf, bridgeMembers, bridgeRefs, descriptionOf, findIface, isUpState, laggPorts, physicalRefs,
  vlanCountOn, vlanRefs, vlansOn,
} from './widgetnetwork-drilldown';

interface Converted {
  value: string;
  units: string;
}

interface Traffic {
  in: string;
  inUnits: string;
  out: string;
  outUnits: string;
  rate: number; // raw bytes/s (in + out) -- picks the VLAN row's busiest member
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

// the internal development record: in-card navigation. Each entry is one level; `key` is the data-drill-key of
// the row that opened it, so going back can return focus there.
type DrillKind = 'iface' | 'vlans' | 'bridges' | 'down';

interface DrillEntry {
  kind: DrillKind;
  key: string;
  /** iface: the interface; vlans: the parent whose VLANs are listed (all VLANs when absent). */
  name?: string;
}

interface DrillFact {
  label: string;
  values?: string[];
  mono?: boolean;
  state?: 'up' | 'down';
  traffic?: Traffic;
}

interface DrillRow {
  name: string;
  up: boolean;
  meta: string;
  traffic?: Traffic;
  key: string;
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
// prescribes (aggregation before repetition) -- PHYSICAL uplinks by name
// with live traffic, DOWN interfaces folded to a single row, bridges/VLANs
// summarised. Everything here is derived client-side from the same interface
// list + realtime stream the per-NIC widget already consumed; no backend change.

// the internal development record: the rows keep one order, by interface name with numbers compared as
// numbers (ix2 before ix10), instead of re-sorting busiest-first on every traffic sample.
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

@Component({
  standalone: false,
  selector: 'widget-network',
  templateUrl: './widgetnetwork.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  drill: DrillEntry[] = [];
  drillMoved = false;
  drillBack = false;
  drillIface: IfaceRef | null = null;
  drillCrumb = '';
  drillFacts: DrillFact[] = [];
  drillRows: DrillRow[] = [];
  drillVlans: { count: number; key: string; meta: string } | null = null;
  private drillScroll: number[] = [];

  private trafficSub: Subscription;

  private mediaSub: Subscription;

  constructor(
    public router: Router,
    public translate: TranslateService,
    public mediaObserver: LayoutMediaObserver,
    private host: ElementRef<HTMLElement>,
  ) {
    super(translate);
    this.configurable = false;
    this.mediaSub = this.mediaObserver.asObservable().pipe(
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
    this.mediaSub?.unsubscribe();
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
  // realtime cadence (~2s) so each row's live traffic stays current; the order
  // is by name and does not follow it (the internal development record).
  private rebuild() {
    if (!this.nics) { return; }

    const physical = this.nics.filter((n) => this.isPhysical(n));

    const up = physical
      .filter((n) => this.isUp(n))
      .sort((a, b) => byName.compare(a.name, b.name))
      .map((n) => this.toRow(n));
    this.physicalVisible = up.slice(0, this.rowBudget);
    this.physicalOverflow = up.length > this.rowBudget ? up.length - this.rowBudget : 0;

    const downNics = physical.filter((n) => !this.isUp(n));
    this.down = { count: downNics.length, names: downNics.map((n) => n.name).sort(byName.compare) };

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
    if (this.drill?.length) { this.resolveDrill(); }
  }

  get drillTop(): DrillEntry | null {
    return this.drill?.length ? this.drill[this.drill.length - 1] : null;
  }

  get drillTitle(): string {
    const top = this.drillTop;
    switch (top?.kind) {
      case 'iface': return top.name;
      case 'vlans': return this.translate.instant(T('VLANs'));
      case 'bridges': return this.translate.instant(T('Bridges'));
      case 'down': return this.translate.instant(T('Down interfaces'));
      default: return this.translate.instant(this.title);
    }
  }

  openIface(name: string): void {
    this.drillTo({ kind: 'iface', name, key: 'iface:' + name });
  }

  openList(kind: DrillKind, name?: string): void {
    this.drillTo({ kind, name, key: name ? `${kind}:${name}` : kind });
  }

  // The "N down" row: one down interface opens directly, several open their list.
  openDown(): void {
    if (this.down.count === 1) {
      this.drillTo({ kind: 'iface', name: this.down.names[0], key: 'down' });
    } else {
      this.openList('down');
    }
  }

  drillUp(): void {
    const left = this.drill.pop();
    this.afterDrill(false, left?.key);
  }

  private drillTo(entry: DrillEntry): void {
    const body = this.host?.nativeElement?.querySelector('.net-body') as HTMLElement;
    this.drillScroll.push(body?.scrollTop || 0);
    this.drill = [...this.drill, entry];
    this.afterDrill(true);
  }

  private afterDrill(forward: boolean, returnKey?: string): void {
    this.drill = [...this.drill];
    const scrollTop = forward ? 0 : (this.drillScroll.pop() || 0);
    this.drillMoved = true;
    this.drillBack = !forward;
    this.resolveDrill();
    setTimeout(() => {
      const root = this.host?.nativeElement;
      const body = root?.querySelector('.net-body') as HTMLElement;
      if (body) { body.scrollTop = scrollTop; }
      const target = forward || !returnKey
        ? root?.querySelector('[data-drill-back]')
        : root?.querySelector(`[data-drill-key="${CSS.escape(returnKey)}"]`);
      (target as HTMLElement)?.focus();
    });
  }

  // Rebuild the open level from the current nics + traffic (runs on every ~2s traffic sample, so
  // the facts stay live). An interface that disappeared drops the levels it opened.
  private resolveDrill(): void {
    this.drillIface = null;
    this.drillFacts = [];
    this.drillRows = [];
    this.drillVlans = null;
    this.drillCrumb = '';
    while (this.drill.length && this.drill[this.drill.length - 1].kind === 'iface'
      && !findIface(this.nics, this.drill[this.drill.length - 1].name)) {
      this.drill = this.drill.slice(0, -1);
      this.drillScroll.pop();
    }
    const top = this.drillTop;
    if (!top) { return; }
    if (top.kind === 'iface') {
      this.resolveIface(findIface(this.nics, top.name));
    } else if (top.kind === 'vlans') {
      const refs = top.name ? vlansOn(this.nics, top.name) : vlanRefs(this.nics);
      this.drillCrumb = top.name || '';
      this.drillRows = refs.map((ref) => this.listRow(ref, descriptionOf(ref) || addressesOf(ref.state)[0]
        || this.interpolate(T('tag {{tag}}'), { tag: ref.state?.tag ?? '?' })));
    } else if (top.kind === 'bridges') {
      this.drillRows = bridgeRefs(this.nics).map((ref) => this.listRow(ref, descriptionOf(ref)
        || addressesOf(ref.state)[0] || bridgeMembers(ref).join(', ')));
    } else if (top.kind === 'down') {
      this.drillRows = physicalRefs(this.nics).filter((ref) => !isUpState(ref.state))
        .map((ref) => this.listRow(ref, descriptionOf(ref) || ref.state?.active_media_subtype || ''));
    }
  }

  private listRow(ref: IfaceRef, meta: string): DrillRow {
    return { name: ref.name, up: isUpState(ref.state), meta: meta || '', traffic: this.traffic[ref.name], key: 'iface:' + ref.name };
  }

  private resolveIface(ref: IfaceRef): void {
    this.drillIface = ref;
    const state = ref.state || {};
    const up = isUpState(state);
    const kinds = { physical: T('Physical'), lagg: T('Link aggregation'), vlan: T('VLAN'), bridge: T('Bridge') };
    this.drillCrumb = this.translate.instant(kinds[ref.kind])
      + (ref.kind === 'vlan' && state.parent ? ' · ' + state.parent : '');
    // Card law 4: a fact the interface does not have is left out, never shown empty.
    const facts: DrillFact[] = [{ label: T('Status'), state: up ? 'up' : 'down', values: [up ? T('up') : T('down')] }];
    if (up && this.traffic[ref.name]) { facts.push({ label: T('Traffic'), traffic: this.traffic[ref.name] }); }
    const description = descriptionOf(ref);
    if (description) { facts.push({ label: T('Description'), values: [description] }); }
    const addresses = addressesOf(state);
    if (addresses.length) { facts.push({ label: T('Addresses'), values: addresses, mono: true }); }
    if (ref.kind === 'vlan') {
      if (state.parent) { facts.push({ label: T('Parent'), values: [state.parent], mono: true }); }
      if (state.tag !== undefined && state.tag !== null) { facts.push({ label: T('Tag'), values: [String(state.tag)] }); }
      if (state.pcp !== undefined && state.pcp !== null) { facts.push({ label: T('Priority (PCP)'), values: [String(state.pcp)] }); }
    }
    if (ref.kind === 'lagg') {
      if (ref.nic?.lag_protocol) { facts.push({ label: T('Protocol'), values: [ref.nic.lag_protocol] }); }
      const ports = laggPorts(ref);
      if (ports.length) { facts.push({ label: T('Ports'), values: [ports.join(', ')], mono: true }); }
    }
    if (ref.kind === 'bridge') {
      const members = bridgeMembers(ref);
      if (members.length) { facts.push({ label: T('Members'), values: [members.join(', ')], mono: true }); }
    }
    const media = state.active_media_subtype || state.active_media_type;
    if (media && ref.kind !== 'bridge') { facts.push({ label: T('Media'), values: [media] }); }
    if (state.mtu) { facts.push({ label: T('MTU'), values: [String(state.mtu)] }); }
    if (state.link_address) { facts.push({ label: T('MAC'), values: [state.link_address], mono: true }); }
    this.drillFacts = facts;
    const vlans = ref.kind === 'physical' || ref.kind === 'lagg' ? vlanCountOn(ref.nic) : 0;
    this.drillVlans = vlans
      ? { count: vlans, key: 'vlans:' + ref.name, meta: this.interpolate(T('on {{name}}'), { name: ref.name }) }
      : null;
  }

  private interpolate(key: string, params: Record<string, unknown>): string {
    return this.translate.parser.interpolate(this.translate.instant(key), params) as string;
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

  // Byte-rate -> value + IEC units, ported from the per-interface widget (retired in the internal development record).
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
