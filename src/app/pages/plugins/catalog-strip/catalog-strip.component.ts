import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input,
  NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { T } from '../../../translate-marker';

/** the internal development record: what one tile needs -- a plugin index entry mapped by the Available Plugins header. */
export interface CatalogStripEntry {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  status?: string;
  reason?: string;
  catalog_app?: boolean;
}

/** The index icon when it is a URL the browser can load, else the placeholder glyph (the internal development record). */
export function catalogIcon(entry: CatalogStripEntry): string | null {
  const icon = (entry.icon || '').trim();
  return /^(https?:\/\/|\/|assets\/|data:image\/|blob:)/i.test(icon) ? icon : null;
}

/**
 * the internal development record: the 15.1 Applications catalog strip (the internal development record), kept on 15.0 for the plugin
 * index it was modelled on.
 * the internal development record: the catalog as the 13.3 Plugins strip -- one fixed-height row of tiles paged
 * by two arrows, a listbox to the keyboard. Geometry lives in the component sheet (plain CSS: this
 * folder is not a Tailwind source).
 */
@Component({
  standalone: false,
  selector: 'app-catalog-strip',
  templateUrl: './catalog-strip.component.html',
  styleUrls: ['./catalog-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogStripComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() entries: CatalogStripEntry[] = [];
  @Input() selectedId: string | null = null;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() emptyText = '';
  @Input() label = '';
  @Output() selected = new EventEmitter<CatalogStripEntry>();
  @ViewChild('scroller') scrollerRef: ElementRef<HTMLElement>;

  /** The one tile in the tab order: the selected entry, else the last one focused, else the first. */
  focusIndex = 0;
  overflowing = false;
  atStart = true;
  atEnd = true;

  readonly catalogIcon = catalogIcon;
  private observer: ResizeObserver = null;
  private measureTimer: ReturnType<typeof setTimeout> = null;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone, private host: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.entries || changes.selectedId) {
      const index = this.entries.findIndex((entry) => entry.id === this.selectedId);
      this.focusIndex = index >= 0 ? index : Math.min(this.focusIndex, Math.max(this.entries.length - 1, 0));
      this.scheduleMeasure();
      if (index >= 0 && changes.selectedId) { this.scheduleReveal(this.selectedId); }
    }
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      // ResizeObserver callbacks are not zone-patched: re-enter the zone so the arrows repaint.
      this.observer = new ResizeObserver(() => this.zone.run(() => this.measure()));
      this.observer.observe(this.host.nativeElement);
    }
    this.scheduleMeasure();
  }

  ngOnDestroy(): void {
    if (this.observer) { this.observer.disconnect(); }
    if (this.measureTimer) { clearTimeout(this.measureTimer); }
  }

  /** The tier line under a title: unavailable, the middleware's reason, or the unreviewed tier. */
  tell(entry: CatalogStripEntry): { label: string; title: string } | null {
    if (entry.status === 'UNAVAILABLE') { return { label: T('Unavailable'), title: entry.reason || '' }; }
    if (entry.reason) { return { label: entry.reason, title: entry.reason }; }
    if (entry.catalog_app === false) { return { label: T('Unreviewed'), title: '' }; }
    return null;
  }

  select(entry: CatalogStripEntry, index: number): void {
    if (this.disabled) { return; }
    this.focusIndex = index;
    this.selected.emit(entry);
  }

  onTileFocus(index: number): void {
    if (this.focusIndex !== index) { this.focusIndex = index; this.cdr.markForCheck(); }
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.entries.length;
    if (!count) { return; }
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = Math.min(this.focusIndex + 1, count - 1); break;
      case 'ArrowLeft': next = Math.max(this.focusIndex - 1, 0); break;
      case 'Home': next = 0; break;
      case 'End': next = count - 1; break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.select(this.entries[this.focusIndex], this.focusIndex);
        return;
      default: return;
    }
    event.preventDefault();
    this.focusIndex = next;
    this.cdr.markForCheck();
    this.focusTile(this.entries[next].id);
  }

  /** Focus one tile and bring it into the strip's view (the Cancel return, the arrow keys). */
  focusTile(id: string): void {
    const tile = this.tile(id);
    if (!tile) { return; }
    tile.focus({ preventScroll: true });
    if (typeof tile.scrollIntoView === 'function') { tile.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
  }

  page(direction: -1 | 1): void {
    const scroller = this.scroller();
    if (!scroller) { return; }
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' });
  }

  onScroll(): void { this.measure(); }

  measure(): void {
    const scroller = this.scroller();
    if (!scroller) { return; }
    const overflowing = scroller.scrollWidth > scroller.clientWidth + 1;
    const atStart = scroller.scrollLeft <= 1;
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
    if (overflowing !== this.overflowing || atStart !== this.atStart || atEnd !== this.atEnd) {
      this.overflowing = overflowing; this.atStart = atStart; this.atEnd = atEnd;
      this.cdr.markForCheck();
    }
  }

  private scroller(): HTMLElement | null { return this.scrollerRef ? this.scrollerRef.nativeElement : null; }

  private tile(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector(`[data-catalog-entry="${CSS.escape(id)}"]`);
  }

  /** After the tiles render (a tick), never inside the check that rendered them. */
  private scheduleMeasure(): void {
    if (this.measureTimer) { clearTimeout(this.measureTimer); }
    this.measureTimer = setTimeout(() => { this.measureTimer = null; this.measure(); });
  }

  private scheduleReveal(id: string): void {
    setTimeout(() => {
      const tile = this.tile(id);
      if (tile && typeof tile.scrollIntoView === 'function') { tile.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
    });
  }
}
