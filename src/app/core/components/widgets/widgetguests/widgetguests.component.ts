import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, Optional, ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, timer } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { WebSocketService } from 'app/services/ws.service';

import { T } from '../../../../translate-marker';

interface GuestVm {
  id: number;
  name: string;
  state: string;
  provisioned: number;
  vcpus: number;
  cpu_pct?: number;
  rss?: number;
}

interface GuestJail {
  jid: number;
  name: string;
  cpu_pct: number;
  rss: number;
  nproc: number;
}

type FamilyKey = 'vms' | 'jails' | 'bastille' | 'apps';

interface FamilyPlan {
  visible: GuestVm[] | GuestJail[];
  overflow: number;
  collapsed: boolean;
}

// the internal development record: an Applications container runs in a jail, so it used
// to arrive as one -- named by its 64-hex container id. Middleware now reports
// the family separately, under the name the user gave the app.
interface GuestStatsPayload {
  cpu_count: number;
  vms: GuestVm[];
  jails: GuestJail[];
  // Optional: a middleware that predates the internal development record sends no
  // apps key, and the card must still render its VMs and jails.
  apps?: GuestJail[];
  // Optional likewise: the internal development record reports Bastille jails as their
  // own family so they route to Bastille Jails instead of the iocage list.
  bastille?: GuestJail[];
  services_bytes: number;
  attributed_bytes: number;
}

// the internal development record: one bounded dashboard card attributes the host CPU and
// Services memory already consumed by VMs and jails. The event is deliberately
// self-contained: rendering this card must never add vm.query/jail.query calls
// to the dashboard load path, especially on hosts with hundreds of jails.
@Component({
  standalone: false,
  selector: 'widget-guests',
  templateUrl: './widgetguests.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./widgetguests.component.css'],
})
export class WidgetGuestsComponent extends WidgetComponent implements AfterViewInit, OnDestroy {
  title: string = T('Guests');
  screenType = 'Desktop';
  loaded = false;
  statsUnavailable = false;

  readonly initialStatsTimeoutMs = 15_000;

  // Guests retains its 400px frame while sparse Dashboard cards use content
  // heights. The planner keeps every present family inside that bounded frame.
  // These pixel costs mirror widgetguests.component.css and the shared facts
  // law; the planner spends them on families instead of counting guest rows,
  // so section labels, the "+ N more" links and the services footer are
  // inside the budget and nothing ends up under the body's scrollbar.
  static readonly FRAME = {
    body: 318, // 400 - 2 (borders) - 32 (body spacing) - 48 (header)
    facts: 87, // the three-row facts list, 10px padding above and below
    footer: 31, // the services footer, 10px/2px padding
    bodyPadding: 8, // .guests-body padding-bottom
    label: 29, // .section-label-sm.guest-section
    row: 34, // .guest-row: a guest, a "+ N more" link, or a family's aggregated row
  };
  readonly familyRowCap = 4;

  vms: GuestVm[] = [];
  jails: GuestJail[] = [];
  apps: GuestJail[] = [];
  bastille: GuestJail[] = [];
  visibleVms: GuestVm[] = [];
  visibleJails: GuestJail[] = [];
  visibleApps: GuestJail[] = [];
  visibleBastille: GuestJail[] = [];
  vmOverflow = 0;
  jailOverflow = 0;
  appOverflow = 0;
  bastilleOverflow = 0;
  // A family the frame cannot show as a labelled section keeps one
  // aggregated row (law 5) instead of disappearing or growing the card.
  vmsCollapsed = false;
  jailsCollapsed = false;
  appsCollapsed = false;
  bastilleCollapsed = false;
  bodyUsedPx = 0;

  cpuPct: number = null;
  vmBytes = 0;
  jailBytes = 0;
  appBytes = 0;
  bastilleBytes = 0;
  attributedBytes = 0;
  servicesBytes = 0;
  baseBytes = 0;

  private guestSub: Subscription;
  private initialStatsTimerSub: Subscription;
  private mediaSub: Subscription;

  private factsElement: HTMLElement;
  private footerElement: HTMLElement;
  private frameObserver: ResizeObserver;
  private destroyed = false;
  private factsHeight = WidgetGuestsComponent.FRAME.facts;
  private footerHeight = WidgetGuestsComponent.FRAME.footer;

  @ViewChild('guestFacts') set guestFacts(ref: ElementRef<HTMLElement>) {
    this.factsElement = ref?.nativeElement;
    this.observeFrameParts();
  }

  @ViewChild('servicesFooter') set servicesFooter(ref: ElementRef<HTMLElement>) {
    this.footerElement = ref?.nativeElement;
    this.observeFrameParts();
  }

  // Narrow cards and translations can wrap the summary/footer. Measure their
  // actual cost, then spend the remaining space with the existing family
  // planner. Family rows stay 34px; no family or navigation link is removed.
  private observeFrameParts(): void {
    this.frameObserver?.disconnect();
    if (!this.factsElement || !this.footerElement) { return; }
    this.frameObserver ||= new ResizeObserver(() => {
      const update = () => {
        if (this.destroyed || !this.factsElement || !this.footerElement) { return; }
        const facts = Math.max(WidgetGuestsComponent.FRAME.facts, Math.ceil(this.factsElement.getBoundingClientRect().height));
        const footer = Math.max(WidgetGuestsComponent.FRAME.footer, Math.ceil(this.footerElement.getBoundingClientRect().height));
        if (facts === this.factsHeight && footer === this.footerHeight) { return; }
        this.factsHeight = facts;
        this.footerHeight = footer;
        this.applyFamilyPlan();
      };
      if (this.zone) { this.zone.run(update); } else { update(); }
    });
    this.frameObserver.observe(this.factsElement);
    this.frameObserver.observe(this.footerElement);
  }

  constructor(
    public router: Router,
    public translate: TranslateService,
    public mediaObserver: LayoutMediaObserver,
    private ws: WebSocketService,
    @Optional() private zone?: NgZone,
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

  ngAfterViewInit() {
    this.initialStatsTimerSub = timer(this.initialStatsTimeoutMs).subscribe(() => {
      if (!this.loaded) {
        this.setStatsUnavailable();
      }
    });
    this.guestSub = this.ws.sub('guest.stats:{"interval":5}').subscribe({
      next: (payload: GuestStatsPayload) => this.setGuestStats(payload),
      error: () => this.setStatsUnavailable(),
      complete: () => {
        if (!this.loaded) {
          this.setStatsUnavailable();
        }
      },
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.frameObserver?.disconnect();
    if (this.guestSub) { this.guestSub.unsubscribe(); }
    if (this.initialStatsTimerSub) { this.initialStatsTimerSub.unsubscribe(); }
    if (this.mediaSub) { this.mediaSub.unsubscribe(); }
    this.core.unregister({ observerClass: this });
  }

  setGuestStats(payload: GuestStatsPayload) {
    if (this.initialStatsTimerSub) { this.initialStatsTimerSub.unsubscribe(); }
    this.statsUnavailable = false;
    const vms = payload && Array.isArray(payload.vms) ? payload.vms : [];
    const jails = payload && Array.isArray(payload.jails) ? payload.jails : [];
    const apps = payload && Array.isArray(payload.apps) ? payload.apps : [];
    const bastille = payload && Array.isArray(payload.bastille) ? payload.bastille : [];

    this.vms = vms.slice().sort((a, b) => this.compareVms(a, b));
    this.jails = jails.slice().sort((a, b) => this.compareLoad(a, b));
    this.apps = apps.slice().sort((a, b) => this.compareLoad(a, b));
    this.bastille = bastille.slice().sort((a, b) => this.compareLoad(a, b));

    this.applyFamilyPlan();

    this.vmBytes = this.vms.reduce((total, vm) => total + this.nonNegative(vm.rss), 0);
    this.jailBytes = this.jails.reduce((total, jail) => total + this.nonNegative(jail.rss), 0);
    this.appBytes = this.apps.reduce((total, app) => total + this.nonNegative(app.rss), 0);
    this.bastilleBytes = this.bastille.reduce((total, jail) => total + this.nonNegative(jail.rss), 0);
    const rowAttributedBytes = this.vmBytes + this.jailBytes + this.appBytes + this.bastilleBytes;
    this.attributedBytes = this.isNonNegative(payload && payload.attributed_bytes)
      ? payload.attributed_bytes
      : rowAttributedBytes;
    this.servicesBytes = this.nonNegative(payload && payload.services_bytes);
    this.baseBytes = Math.max(0, this.servicesBytes - this.attributedBytes);

    const cpuSamples = [...this.vms, ...this.jails, ...this.apps, ...this.bastille]
      .map((guest) => guest.cpu_pct)
      .filter((cpu) => this.isNonNegative(cpu));
    const noExecutingGuests = this.jails.length === 0 && this.apps.length === 0 &&
      this.bastille.length === 0 && this.vms.every((vm) => vm.state === 'STOPPED');
    this.cpuPct = cpuSamples.length
      ? Math.min(100, cpuSamples.reduce((total, cpu) => total + cpu, 0))
      : (noExecutingGuests ? 0 : null);
    this.loaded = true;
  }

  private applyFamilyPlan(): void {
    const plans = this.planFamilies([
      { key: 'vms', entries: this.vms },
      { key: 'jails', entries: this.jails },
      { key: 'bastille', entries: this.bastille },
      { key: 'apps', entries: this.apps },
    ]);
    this.visibleVms = plans.get('vms').visible as GuestVm[];
    this.vmOverflow = plans.get('vms').overflow;
    this.vmsCollapsed = plans.get('vms').collapsed;
    this.visibleJails = plans.get('jails').visible as GuestJail[];
    this.jailOverflow = plans.get('jails').overflow;
    this.jailsCollapsed = plans.get('jails').collapsed;
    this.visibleBastille = plans.get('bastille').visible as GuestJail[];
    this.bastilleOverflow = plans.get('bastille').overflow;
    this.bastilleCollapsed = plans.get('bastille').collapsed;
    this.visibleApps = plans.get('apps').visible as GuestJail[];
    this.appOverflow = plans.get('apps').overflow;
    this.appsCollapsed = plans.get('apps').collapsed;
  }

  /** Pixels the frame leaves for family sections once the facts and footer are placed. */
  get familyBudgetPx(): number {
    const frame = WidgetGuestsComponent.FRAME;
    return Math.max(0, frame.body - this.factsHeight - this.footerHeight - frame.bodyPadding);
  }

  /**
   * Spend the frame on families. Every present family starts as one
   * aggregated row so none can vanish; families are then expanded largest
   * first (ties keep reading order), each to the most rows that still fit
   * together with its label and, when it overflows, its "+ N more" row.
   * A family that cannot get a labelled section stays aggregated.
   */
  private planFamilies(families: { key: FamilyKey; entries: GuestVm[] | GuestJail[] }[]): Map<FamilyKey, FamilyPlan> {
    const { row, label } = WidgetGuestsComponent.FRAME;
    const plans = new Map<FamilyKey, FamilyPlan>();
    const present = families.filter((family) => family.entries.length > 0);
    let used = present.length * row;
    const order = present.slice().sort((a, b) => b.entries.length - a.entries.length);
    for (const family of order) {
      const total = family.entries.length;
      let rows = 0;
      for (let candidate = Math.min(total, this.familyRowCap); candidate >= 1; candidate--) {
        // The section replaces the family's aggregated row, hence "- row".
        const cost = label + row * candidate + (candidate < total ? row : 0) - row;
        if (used + cost <= this.familyBudgetPx) {
          rows = candidate;
          used += cost;
          break;
        }
      }
      plans.set(family.key, rows
        ? { visible: family.entries.slice(0, rows), overflow: total - rows, collapsed: false }
        : { visible: [], overflow: total, collapsed: true });
    }
    families.filter((family) => family.entries.length === 0)
      .forEach((family) => plans.set(family.key, { visible: [], overflow: 0, collapsed: false }));
    this.bodyUsedPx = used;
    return plans;
  }

  /** Sampled CPU of a whole family as a share of the host, for its aggregated row. */
  familyCpu(entries: GuestVm[] | GuestJail[]): number {
    const samples = (entries as (GuestVm | GuestJail)[])
      .map((guest) => guest.cpu_pct)
      .filter((cpu) => this.isNonNegative(cpu));
    return samples.length ? Math.min(100, samples.reduce((total, cpu) => total + cpu, 0)) : null;
  }

  isVmRunning(vm: GuestVm): boolean {
    return !!vm && vm.state === 'RUNNING';
  }

  cpuWidth(cpu: number): number {
    return this.isNonNegative(cpu) ? Math.min(100, cpu) : 0;
  }

  cpuLabel(cpu: number): string {
    return this.isNonNegative(cpu) ? `${Math.round(cpu)}%` : '…';
  }

  formatGiB(bytes: number): string {
    return (this.nonNegative(bytes) / 1024 / 1024 / 1024).toFixed(1);
  }

  vmMemory(vm: GuestVm): string {
    const used = this.isVmRunning(vm) && this.isNonNegative(vm.rss)
      ? this.formatGiB(vm.rss)
      : '—';
    return `${used}/${this.formatGiB(vm.provisioned)} GiB`;
  }

  trackByName(index: number, guest: GuestVm | GuestJail) {
    return guest.name;
  }

  goToVms() {
    this.router.navigate(['/vm']);
  }

  goToApps() {
    this.router.navigate(['/applications']);
  }

  goToJails() {
    this.router.navigate(['/jails']);
  }

  goToBastille() {
    this.router.navigate(['/jails', 'bastille']);
  }

  private compareVms(a: GuestVm, b: GuestVm): number {
    const state = Number(this.isVmRunning(b)) - Number(this.isVmRunning(a));
    return state || this.compareLoad(a, b);
  }

  private compareLoad(a: GuestVm | GuestJail, b: GuestVm | GuestJail): number {
    const cpu = this.sortValue(b.cpu_pct) - this.sortValue(a.cpu_pct);
    const rss = this.sortValue(b.rss) - this.sortValue(a.rss);
    return cpu || rss || String(a.name || '').localeCompare(String(b.name || ''));
  }

  private sortValue(value: number): number {
    return this.isNonNegative(value) ? value : -1;
  }

  private nonNegative(value: number): number {
    return this.isNonNegative(value) ? value : 0;
  }

  private isNonNegative(value: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  private setStatsUnavailable() {
    if (this.initialStatsTimerSub) { this.initialStatsTimerSub.unsubscribe(); }
    this.statsUnavailable = true;
    this.loaded = true;
  }
}
