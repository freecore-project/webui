import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges,
} from '@angular/core';
import { T } from '../../../translate-marker';
import { ApplicationCatalogEntry } from '../applications.types';
import { catalogIcon, catalogMaterialIcon } from '../catalog-icon';

/**
 * the internal development record: the catalog as a list beside its detail panel (layout C) -- a listbox to the
 * keyboard, one row per entry with its tag (category, Installed, or the tier). It replaces the
 * #425 one-row strip, which showed about eight of a hundred entries at a time. Geometry lives in the
 * component sheet (plain CSS: this folder is not a Tailwind source).
 */
@Component({
  standalone: false,
  selector: 'app-catalog-list',
  templateUrl: './catalog-list.component.html',
  styleUrls: ['./catalog-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogListComponent implements OnChanges {
  @Input() entries: ApplicationCatalogEntry[] = [];
  @Input() selectedId: string | null = null;
  /** Catalog ids with an installed application; their rows say so. */
  @Input() installedIds: ReadonlySet<string> = new Set();
  @Input() disabled = false;
  @Input() loading = false;
  @Input() emptyText = '';
  @Input() label = '';
  @Output() selected = new EventEmitter<ApplicationCatalogEntry>();

  /** The one row in the tab order: the selected entry, else the last one focused, else the first. */
  focusIndex = 0;

  readonly catalogIcon = catalogIcon;
  readonly catalogMaterialIcon = catalogMaterialIcon;

  constructor(private cdr: ChangeDetectorRef, private host: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.entries || changes.selectedId) {
      const index = this.entries.findIndex((entry) => entry.id === this.selectedId);
      this.focusIndex = index >= 0 ? index : Math.min(this.focusIndex, Math.max(this.entries.length - 1, 0));
      if (index >= 0 && changes.selectedId) { this.scheduleReveal(this.selectedId); }
    }
  }

  /** The tier tag: unavailable, the middleware's reason, the unreviewed tier, Installed, else the category. */
  tag(entry: ApplicationCatalogEntry): { label: string; title: string; tone: 'muted' | 'warn' | 'installed' } {
    if (entry.status === 'UNAVAILABLE') { return { label: T('Not available'), title: entry.reason || '', tone: 'warn' }; }
    if (entry.reason) { return { label: entry.reason, title: entry.reason, tone: 'warn' }; }
    if (entry.catalog_app === false) { return { label: T('Unreviewed'), title: '', tone: 'muted' }; }
    if (this.installedIds.has(entry.id)) { return { label: T('Installed'), title: '', tone: 'installed' }; }
    return { label: entry.category || '', title: '', tone: 'muted' };
  }

  select(entry: ApplicationCatalogEntry, index: number): void {
    if (this.disabled) { return; }
    this.focusIndex = index;
    this.selected.emit(entry);
  }

  onRowFocus(index: number): void {
    if (this.focusIndex !== index) { this.focusIndex = index; this.cdr.markForCheck(); }
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.entries.length;
    if (!count) { return; }
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = Math.min(this.focusIndex + 1, count - 1); break;
      case 'ArrowUp': next = Math.max(this.focusIndex - 1, 0); break;
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
    this.focusEntry(this.entries[next].id);
  }

  /** Focus one row and bring it into the list's view (the Cancel return, the arrow keys). */
  focusEntry(id: string): void {
    const row = this.row(id);
    if (!row) { return; }
    row.focus({ preventScroll: true });
    if (typeof row.scrollIntoView === 'function') { row.scrollIntoView({ block: 'nearest' }); }
  }

  private row(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector(`[data-catalog-entry="${CSS.escape(id)}"]`);
  }

  private scheduleReveal(id: string): void {
    setTimeout(() => {
      const row = this.row(id);
      if (row && typeof row.scrollIntoView === 'function') { row.scrollIntoView({ block: 'nearest' }); }
    });
  }
}
