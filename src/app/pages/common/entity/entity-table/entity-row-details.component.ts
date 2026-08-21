import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ChangeDetectionStrategy,
} from '@angular/core';
import { alignBandToContent } from './entity-row-details-align';
import { EntityAction, EntityRowDetails } from './entity-row-details.interface';

@Component({
  standalone: false,
  selector: 'app-entity-row-details',
  styles: [
    `
      /* the internal development record: the label is fg2, the value fg1, a destructive action red. */
      p {
        color: var(--fg2) !important;
      }

      h4 {
        color: var(--fg1) !important;
      }

      .button-delete:not(:disabled) span {
        color: var(--red) !important;
      }
    `,
  ],
  templateUrl: './entity-row-details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-row-details.component.css'],
})
export class EntityRowDetailsComponent implements AfterViewInit, OnDestroy {
  @Input() conf: EntityRowDetails;

  private resizeObserver: ResizeObserver;
  private measureFrame: number;

  constructor(private element: ElementRef<HTMLElement>, private zone: NgZone) {}

  isActionVisible(action: EntityAction): boolean {
    return this.conf.isActionVisible ? this.conf.isActionVisible(action.id, this.conf.config) : true;
  }

  /**
   * the internal development record: a band rendered through a table's rowDetailComponent reports its height to
   * the table as the table's own band does, so the detail row fits it instead of a fixed guess.
   */
  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined' || !this.table()) { return; }
    this.resizeObserver = new ResizeObserver(() => this.measureHeight());
    this.resizeObserver.observe(this.element.nativeElement);
    this.measureHeight();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.measureFrame !== undefined) { cancelAnimationFrame(this.measureFrame); }
  }

  private table(): { updateRowDetailHeight: (row: object, height: number) => void } | null {
    const parent = this.conf?.parent as unknown as { updateRowDetailHeight?: (row: object, height: number) => void } | undefined;
    return parent && typeof parent.updateRowDetailHeight === 'function' ? parent as { updateRowDetailHeight: (row: object, height: number) => void } : null;
  }

  private measureHeight(): void {
    if (this.measureFrame !== undefined) { return; }
    this.zone.runOutsideAngular(() => {
      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = undefined;
        const parent = this.conf?.parent as unknown as { conf?: { config?: { multiSelect?: boolean } } } | undefined;
        alignBandToContent(this.element.nativeElement, !!parent?.conf?.config?.multiSelect);
        const height = this.element.nativeElement.getBoundingClientRect().height;
        this.zone.run(() => this.table()?.updateRowDetailHeight(this.conf.config, height));
      });
    });
  }
}
