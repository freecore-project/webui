import {
  Component, OnInit, AfterViewInit, OnDestroy, ElementRef,
  ChangeDetectionStrategy, HostListener, ViewChild,
} from '@angular/core';
import { CoreService, CoreEvent } from 'app/core/services/core.service';

import { Subject, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component'; // POC
import { WidgetControllerComponent } from 'app/core/components/widgets/widgetcontroller/widgetcontroller.component'; // POC
import { WidgetPoolComponent } from 'app/core/components/widgets/widgetpool/widgetpool.component';

import { RestService, WebSocketService } from '../../services';
import { DashConfigItem } from 'app/core/components/widgets/widgetcontroller/widgetcontroller.component';

@Component({
  standalone: false,
  selector: 'dashboard',
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  screenType = 'Desktop'; // Desktop || Mobile

  dashState: DashConfigItem[]; // Saved State
  activeMobileWidget: DashConfigItem[] = [];
  availableWidgets: DashConfigItem[] = [];
  renderedWidgets: number[] = [];
  hiddenWidgets: number[] = [];

  large = 'lg';
  medium = 'md';
  small = 'sm';
  zPoolFlex = '100';
  noteFlex = '23';

  statsDataEvents: Subject<CoreEvent>;
  private statsEvents: any;
  private gpuConfigSub: Subscription;
  private gpuInventorySub: Subscription;
  tcStats: any;

  // For widgetsysinfo
  isHA: boolean; // = false;
  product_type = window.localStorage['product_type'];
  sysinfoReady = false;

  // For CPU widget
  systemInformation: any;

  // For widgetpool
  system: any;
  system_product = 'Generic';
  pools: any[]; // = [];
  volumeData: any; //= {};

  nics: any[]; // = [];
  gpus: any[] = [];
  gpuInventoryReady = false;
  private gpuWidgetsSynced = false;

  animation = 'stop';
  shake = false;

  showSpinner = true;

  @ViewChild(WidgetControllerComponent) private mobileLauncher: WidgetControllerComponent;
  private lastMobileWidget: DashConfigItem;
  private lastFocusedElement: HTMLElement;
  private focusTimer: ReturnType<typeof setTimeout>;
  private sidenavTimer: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor(protected core: CoreService, protected ws: WebSocketService, private el: ElementRef) {
    core.register({ observerClass: this, eventName: 'SidenavStatus' }).subscribe((evt: CoreEvent) => {
      clearTimeout(this.sidenavTimer);
      this.sidenavTimer = setTimeout(() => this.checkScreenSize(), 100);
    });

    this.statsDataEvents = new Subject<CoreEvent>();

    this.checkScreenSize();
  }

  ngAfterViewInit() {
    this.checkScreenSize();
  }

  @HostListener('focusin', ['$event'])
  rememberFocus(event: FocusEvent): void {
    this.lastFocusedElement = event.target as HTMLElement;
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    const next = window.innerWidth < 600 ? 'Mobile' : 'Desktop';
    if (next === this.screenType) { return; }
    // The shared media observer may remove the mobile Back button just before
    // this resize event. Keep focus ownership when that focused node vanished.
    const restoreFocus = this.el.nativeElement.contains(document.activeElement) ||
      (document.activeElement === document.body && this.lastFocusedElement && !this.lastFocusedElement.isConnected);
    this.screenType = next;
    this.activeMobileWidget = [];
    if (restoreFocus) {
      this.scheduleFocus(() => {
        if (this.screenType === 'Mobile') {
          this.mobileLauncher?.focusWidget(this.lastMobileWidget);
        } else {
          this.el.nativeElement.querySelector('.widgets-wrapper')?.focus();
        }
      });
    }
  }

  onMobileLaunch(widget: DashConfigItem): void {
    this.lastMobileWidget = widget;
    this.activeMobileWidget = [widget];
    this.scheduleFocus(() => {
      this.el.nativeElement.querySelector('.mobile-widget-container [data-dashboard-back]')?.focus();
    });
  }

  onMobileBack(): void {
    this.activeMobileWidget = [];
    this.scheduleFocus(() => this.mobileLauncher?.focusWidget(this.lastMobileWidget));
  }

  private scheduleFocus(focus: () => void): void {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      if (!this.destroyed) { focus(); }
    });
  }

  ngOnInit() {
    this.init();

    if (this.product_type == 'ENTERPRISE') {
      this.ws.call('failover.licensed').subscribe((res) => {
        if (res) {
          this.isHA = true;
        }
        this.sysinfoReady = true;
      });
    } else {
      this.sysinfoReady = true;
    }
  }

  ngOnDestroy() {
    this.stopListeners();
    this.core.unregister({ observerClass: this });

    this.destroyed = true;
    clearTimeout(this.focusTimer);
    clearTimeout(this.sidenavTimer);
  }

  init() {
    this.startListeners();

    this.core.register({ observerClass: this, eventName: 'NicInfo' }).subscribe((evt: CoreEvent) => {
      const clone = Object.assign([], evt.data);
      const removeNics = {};

      // Store keys for fast lookup
      const nicKeys = {};
      evt.data.forEach((item, index) => {
        nicKeys[item.name] = index.toString();
      });

      // Process Vlans (attach vlans to their parent)
      evt.data.forEach((item, index) => {
        if (item.type !== 'VLAN' && !clone[index].state.vlans) {
          clone[index].state.vlans = [];
        }

        if (item.type == 'VLAN' && item.state.parent) {
          const parentIndex = parseInt(nicKeys[item.state.parent]);
          if (!clone[parentIndex].state.vlans) {
            clone[parentIndex].state.vlans = [];
          }

          clone[parentIndex].state.vlans.push(item.state);
          removeNics[item.name] = index;
        }
      });

      // Process LAGGs
      evt.data.forEach((item, index) => {
        if (item.type == 'LINK_AGGREGATION') {
          clone[index].state.lagg_ports = item.lag_ports;
          item.lag_ports.forEach((nic) => {
            // Consolidate addresses
            clone[index].state.aliases.forEach((item) => { item.interface = nic; });
            clone[index].state.aliases = clone[index].state.aliases.concat(clone[nicKeys[nic]].state.aliases);

            // Consolidate vlans
            clone[index].state.vlans.forEach((item) => { item.interface = nic; });
            clone[index].state.vlans = clone[index].state.vlans.concat(clone[nicKeys[nic]].state.vlans);

            // Mark interface for removal
            removeNics[nic] = nicKeys[nic];
          });
        }
      });

      // Remove NICs from list
      for (let i = clone.length - 1; i >= 0; i--) {
        if (removeNics[clone[i].name]) {
          // Remove
          clone.splice(i, 1);
        } else {
          // Only keep INET addresses
          clone[i].state.aliases = clone[i].state.aliases.filter((address) => address.type == 'INET' || address.type == 'INET6');
        }
      }

      // Update NICs array
      this.nics = clone;

      this.isDataReady();
    });

    this.core.emit({ name: 'NicInfoRequest' });
    this.getDisksData();
  }

  startListeners() {
    this.startGpuListeners();

    this.core.register({ observerClass: this, eventName: 'RealtimeStats' }).subscribe((e: CoreEvent) => {
      const evt = e.data;
      if (evt.cpu) {
        this.statsDataEvents.next({ name: 'CpuStats', data: evt.cpu });
      }

      if (evt.virtual_memory) {
        const keys = Object.keys(evt.virtual_memory);
        const memStats: any = {};

        keys.forEach((key, index) => {
          memStats[key] = evt.virtual_memory[key];
        });

        if (evt.zfs && evt.zfs.arc_size != null) {
          memStats.arc_size = evt.zfs.arc_size;
        }
        if (evt.zfs && evt.zfs.cache_hit_ratio != null) {
          memStats.cache_hit_ratio = evt.zfs.cache_hit_ratio;
        }
        this.statsDataEvents.next({ name: 'MemoryStats', data: memStats });
      }

      if (evt.interfaces) {
        const keys = Object.keys(evt.interfaces);
        keys.forEach((key, index) => {
          const data = evt.interfaces[key];
          this.statsDataEvents.next({ name: 'NetTraffic_' + key, data });
        });
      }
    });
  }

  stopListeners() {
    if (this.gpuConfigSub) { this.gpuConfigSub.unsubscribe(); }
    if (this.gpuInventorySub) { this.gpuInventorySub.unsubscribe(); }

    // unsubscribe from middleware
    if (this.statsEvents) { this.statsEvents.complete(); }
  }

  setGpuInventory(payload) {
    const gpus = payload && Array.isArray(payload.gpus) ? payload.gpus : [];
    // the internal development record: a GPU with no driver attached earns no card. Middleware
    // sets `no-driver` as the negation of has_driver, so this is its own
    // determination rather than a guess: such a device reports no utilization,
    // no VRAM and no temperature, leaving a frame holding only its PCI id.
    // Card-spec law 4 forbids an empty row; an empty frame is worse. A
    // passthrough GPU still shows -- it is assigned to a VM, which is the point
    // -- and so does a degraded one, which still lists its consumers.
    this.gpus = gpus.filter((gpu) => gpu && typeof gpu.id === 'string' && gpu.state !== 'no-driver');
    this.gpuInventoryReady = true;
    this.isDataReady();
  }

  private startGpuListeners() {
    // the internal development record: GPU cards require an explicit enabled RC driver
    // tunable. Hardware inventory alone must not opt the Dashboard in.
    this.gpuConfigSub = this.ws.call('tunable.query', [[
      ['var', '=', 'kld_list'], ['type', '=', 'RC'], ['enabled', '=', true],
    ]]).pipe(take(1)).subscribe({
      next: (tunables) => {
        if (!this.hasGpuDriverTunable(tunables)) {
          this.setGpuInventory({ gpus: [] });
          return;
        }

        // Take one discovery payload; mounted GPU cards own continuing
        // subscriptions. take(1) also performs the protocol unsubscribe.
        this.gpuInventorySub = this.ws.sub('gpu.stats:{"interval":5}').pipe(take(1)).subscribe({
          next: (payload) => this.setGpuInventory(payload),
          error: () => this.setGpuInventory({ gpus: [] }),
        });
      },
      error: () => this.setGpuInventory({ gpus: [] }),
    });
  }

  private hasGpuDriverTunable(tunables: any): boolean {
    const modules = ['drm', 'drm2', 'i915kms', 'amdgpu', 'radeonkms', 'nvidia', 'nvidia-modeset', 'nvidia-drm'];
    return Array.isArray(tunables) && tunables.some((tunable) => tunable
      && tunable.var === 'kld_list' && tunable.type === 'RC' && tunable.enabled === true
      && typeof tunable.value === 'string' && tunable.value.split(/\s+/).some((token) => {
      const module = token.split('/').pop().replace(/\.ko$/, '');
      return modules.includes(module);
    }));
  }

  setVolumeData(evt: CoreEvent) {
    const volumes = {};
    for (const dataset of evt.data || []) {
      if (!dataset?.id) { continue; }
      volumes[dataset.id] = { used: dataset.used?.parsed, avail: dataset.available?.parsed };
    }
    this.volumeData = volumes;
  }

  getDisksData() {
    this.core.register({ observerClass: this, eventName: 'PoolData' }).subscribe((evt: CoreEvent) => {
      this.pools = evt.data;
      this.isDataReady();
    });

    this.ws.call('pool.dataset.query', [[], { extra: { retrieve_children: false } }]).subscribe((res) => {
      this.setVolumeData({
        name: 'RootDatasets',
        data: res,
      });
      this.isDataReady();
    });

    this.core.register({ observerClass: this, eventName: 'SysInfo' }).subscribe((evt: CoreEvent) => {
      if (typeof this.systemInformation == 'undefined') {
        this.systemInformation = evt.data;
        this.core.emit({ name: 'PoolDataRequest', sender: this });
      }
    });

    this.core.emit({ name: 'SysInfoRequest', sender: this });
  }

  isDataReady() {
    const isReady = !!(this.statsDataEvents && this.pools && this.volumeData && this.nics);
    if (isReady) {
      this.availableWidgets = this.generateDefaultConfig();
      if (!this.dashState) {
        this.dashState = this.availableWidgets;
        this.gpuWidgetsSynced = this.gpuInventoryReady;
      } else if (this.gpuInventoryReady && !this.gpuWidgetsSynced) {
        this.syncGpuWidgets();
      }
      this.normalizePoolWidgets();
    }
  }

  generateDefaultConfig() {
    const conf: DashConfigItem[] = [
      { name: 'System Information', rendered: true },
    ];

    if (this.isHA) {
      conf.push({ name: 'System Information(Standby)', identifier: 'passive,true', rendered: true });
    }

    conf.push({ name: 'CPU', rendered: true });
    conf.push({ name: 'Memory', rendered: true });
    // the internal development record: guest.stats is self-contained and starts only while
    // the card is visible, so Guests is always present without an entity query.
    conf.push({ name: 'Guests', rendered: true });

    // One GPU card per PCI selector. This list is the first cached gpu.stats
    // payload, not an additional dashboard query; GPU-less boxes add nothing.
    (this.gpus || []).forEach((gpu) => {
      conf.push({ name: 'GPU', identifier: 'id,' + gpu.id, rendered: true });
    });

    // the internal development record: one aggregated Network card in place of one card per
    // NIC -- a box with many bridges/VLANs otherwise renders 100+ cards. The
    // per-interface widget (widget-nic) went in the internal development record.
    if (this.nics && this.nics.length > 0) {
      conf.push({ name: 'Network', rendered: true });
    }

    // An empty installation still has one useful Pools entry and empty state.
    conf.push({ name: 'Pools', rendered: true });

    // the internal development record: the Resources strip is gone; the project footer on
    // every page carries those links. A saved state naming 'Help' renders nothing.

    return conf;
  }

  private normalizePoolWidgets(): void {
    // the internal development record: migrate per-pool state without keeping stale entity
    // identifiers, duplicating the aggregate, or dropping newly imported pools.
    const isPool = (item: DashConfigItem): boolean => ['pool', 'pools'].includes(item.name.toLowerCase());
    const previous = this.dashState.filter(isPool);
    if (previous.length === 1 && previous[0].name === 'Pools' && !previous[0].identifier) { return; }
    const first = this.dashState.findIndex(isPool);
    const aggregate = previous.find((item) => item.name.toLowerCase() === 'pools');
    const poolWidget: DashConfigItem = {
      name: 'Pools',
      rendered: aggregate ? aggregate.rendered : previous.length ? previous.some((item) => item.rendered) : true,
      ...(previous[0]?.position !== undefined ? { position: previous[0].position } : {}),
    };
    const next = this.dashState.filter((item) => !isPool(item));
    next.splice(first < 0 ? next.length : first, 0, poolWidget);
    this.dashState = next;
  }

  dataFromConfig(item: DashConfigItem) {
    let spl;
    let key;
    let value;
    if (item.identifier) {
      spl = item.identifier.split(',');
      key = spl[0];
      value = spl[1];
    }

    let data: any;

    switch (item.name.toLowerCase()) {
      case 'cpu':
        data = this.statsDataEvents;
        break;
      case 'memory':
        data = this.statsDataEvents;
        break;
      case 'pools':
        data = this.pools;
        break;
      case 'gpu':
        data = spl ? this.gpus.filter((gpu) => gpu[key] == value) : console.warn('DashConfigItem has no identifier!');
        if (data) { data = data[0]; }
        break;
      case 'network':
        // the internal development record: the aggregated Network card consumes the whole
        // (already VLAN-/LAGG-folded) interface list and derives its own view.
        data = this.nics;
        break;
    }

    return data || console.warn('Data for this widget is not available!');
  }

  private syncGpuWidgets() {
    const existing = new Map<string, DashConfigItem>();
    this.dashState
      .filter((item) => item.name.toLowerCase() === 'gpu')
      .forEach((item) => {
        if (item.identifier) { existing.set(item.identifier, item); }
      });
    const gpuWidgets = this.availableWidgets
      .filter((item) => item.name.toLowerCase() === 'gpu')
      .map((item) => {
        const previous = item.identifier ? existing.get(item.identifier) : undefined;
        return previous ? { ...item, rendered: previous.rendered, position: previous.position } : item;
      });
    const next = this.dashState.filter((item) => item.name.toLowerCase() !== 'gpu');
    const guests = next.findIndex((item) => item.name.toLowerCase() === 'guests');
    next.splice(guests < 0 ? next.length : guests + 1, 0, ...gpuWidgets);
    this.dashState = next;
    this.gpuWidgetsSynced = true;
  }

  toggleShake() {
    if (this.shake) {
      this.shake = false;
    } else if (!this.shake) {
      this.shake = true;
    }
  }
}
