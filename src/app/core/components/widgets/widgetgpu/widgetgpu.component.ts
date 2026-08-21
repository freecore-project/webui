import {
  AfterViewInit, ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { WebSocketService } from 'app/services/ws.service';

import { T } from '../../../../translate-marker';

export interface GpuUser {
  kind: 'jail' | 'vm' | 'host';
  name: string;
  procs: number;
  gpu_mem?: number;
}

export interface GpuStats {
  id: string;
  name: string;
  vendor: string;
  driver: string;
  nodes: string[];
  state: 'active' | 'idle' | 'passthrough' | 'no-driver';
  passthrough_vm?: { id: number; name: string };
  util_pct?: number;
  enc_pct?: number;
  dec_pct?: number;
  vram_used?: number;
  vram_total?: number;
  temp_c?: number;
  users: GpuUser[];
}

interface GpuStatsPayload {
  gpus: GpuStats[];
}

// the internal development record: one card instance represents one PCI GPU. Its input is
// the dashboard's first cached gpu.stats sample; after mounting, the card owns
// the same opt-in source and filters subsequent shared samples by PCI selector.
@Component({
  standalone: false,
  selector: 'widget-gpu',
  templateUrl: './widgetgpu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./widgetgpu.component.css'],
})
export class WidgetGpuComponent extends WidgetComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() gpu: GpuStats;

  title: string = T('GPU');
  screenType = 'Desktop';
  loaded = false;

  readonly rowBudget = 4;
  visibleUsers: GpuUser[] = [];
  userOverflow = 0;

  private gpuId: string;
  private gpuSub: Subscription;
  private mediaSub: Subscription;

  constructor(
    public router: Router,
    public translate: TranslateService,
    public mediaObserver: LayoutMediaObserver,
    private ws: WebSocketService,
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes.gpu && changes.gpu.currentValue) {
      this.setGpu(changes.gpu.currentValue);
    }
  }

  ngAfterViewInit() {
    this.gpuSub = this.ws.sub('gpu.stats:{"interval":5}').subscribe((payload: GpuStatsPayload) => {
      const gpus = payload && Array.isArray(payload.gpus) ? payload.gpus : [];
      const gpu = gpus.find((candidate) => candidate && candidate.id === this.gpuId);
      if (gpu) { this.setGpu(gpu); }
    });
  }

  ngOnDestroy() {
    if (this.gpuSub) { this.gpuSub.unsubscribe(); }
    if (this.mediaSub) { this.mediaSub.unsubscribe(); }
    this.core.unregister({ observerClass: this });
  }

  setGpu(gpu: GpuStats) {
    if (!gpu || typeof gpu.id !== 'string') { return; }

    const users = Array.isArray(gpu.users) ? gpu.users.slice() : [];
    users.sort((a, b) => {
      const memory = this.sortValue(b.gpu_mem) - this.sortValue(a.gpu_mem);
      const processes = this.sortValue(b.procs) - this.sortValue(a.procs);
      return memory || processes || String(a.name || '').localeCompare(String(b.name || ''));
    });

    this.gpu = {
      ...gpu,
      nodes: Array.isArray(gpu.nodes) ? gpu.nodes.slice() : [],
      users,
    };
    this.gpuId = gpu.id;
    this.visibleUsers = users.slice(0, this.rowBudget);
    this.userOverflow = Math.max(0, users.length - this.visibleUsers.length);
    this.loaded = true;
  }

  get isPassthrough(): boolean {
    return !!this.gpu && this.gpu.state === 'passthrough';
  }

  get hasUtilization(): boolean {
    return !!this.gpu && this.isAvailable(this.gpu.util_pct);
  }

  get hasEngineTelemetry(): boolean {
    return !!this.gpu && (this.isAvailable(this.gpu.enc_pct) || this.isAvailable(this.gpu.dec_pct));
  }

  get hasVram(): boolean {
    return !!this.gpu && this.isAvailable(this.gpu.vram_used)
      && this.isAvailable(this.gpu.vram_total) && this.gpu.vram_total > 0;
  }

  get isDegraded(): boolean {
    return !!this.gpu && !this.isPassthrough && !this.hasUtilization;
  }

  get pptdev(): string {
    return this.gpu && this.gpu.id ? this.gpu.id.replace(/:/g, '/') : '';
  }

  utilizationWidth(): number {
    return this.hasUtilization ? Math.max(0, Math.min(100, this.gpu.util_pct)) : 0;
  }

  vramWidth(): number {
    return this.hasVram ? Math.max(0, Math.min(100, this.gpu.vram_used / this.gpu.vram_total * 100)) : 0;
  }

  rounded(value: number): number {
    return this.isAvailable(value) ? Math.round(value) : 0;
  }

  formatGiB(bytes: number): string {
    return (this.isAvailable(bytes) ? bytes / 1024 / 1024 / 1024 : 0).toFixed(1);
  }

  userTail(user: GpuUser): string {
    const processes = `${this.rounded(user.procs)} ${this.rounded(user.procs) === 1 ? 'proc' : 'procs'}`;
    return this.isAvailable(user.gpu_mem)
      ? `${processes} · ${this.formatGiB(user.gpu_mem)} GiB vram`
      : processes;
  }

  trackByUser(index: number, user: GpuUser): string {
    return `${user.kind}:${user.name}`;
  }

  goToPassthroughVm() {
    if (this.gpu && this.gpu.passthrough_vm) { this.router.navigate(['/vm']); }
  }

  goToUser(user: GpuUser) {
    if (user.kind === 'jail') {
      this.router.navigate(['/jails']);
    } else if (user.kind === 'vm') {
      this.router.navigate(['/vm']);
    }
  }

  isAvailable(value: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  private sortValue(value: number): number {
    return this.isAvailable(value) ? value : -1;
  }
}
