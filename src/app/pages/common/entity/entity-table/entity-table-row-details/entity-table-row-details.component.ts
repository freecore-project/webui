import {
  AfterViewInit, Component, ElementRef, HostBinding, Input, NgZone, OnChanges, OnDestroy, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as _ from 'lodash';
import { EntityTableAction, EntityTableComponent } from '../entity-table.component';
import cronstrue from 'cronstrue';

@Component({
  standalone: false,
  selector: 'app-entity-table-row-details',
  templateUrl: './entity-table-row-details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-table-row-details.component.scss'],
})
export class EntityTableRowDetailsComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() config: any;
  @Input() parent: EntityTableComponent & { conf: any };

  columns = [];
  actions: EntityTableAction[] = [];
  private resizeObserver: ResizeObserver;
  private measureFrame: number;

  constructor(private element: ElementRef<HTMLElement>, private zone: NgZone) {}

  @HostBinding('class.wrap-row-actions') get wrapRowActions(): boolean { return !!this.parent?.conf.wrapRowActions; }

  ngOnInit() {
    this.buildColumns();
    this.actions = this.getActions();
  }

  ngOnChanges() {
    this.buildColumns();
    this.actions = this.getActions();
    if (this.resizeObserver) { this.measureHeight(); }
  }

  ngAfterViewInit(): void {
    if (!this.wrapRowActions) { return; }
    this.resizeObserver = new ResizeObserver(() => this.measureHeight());
    this.resizeObserver.observe(this.element.nativeElement);
    this.measureHeight();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.measureFrame !== undefined) { cancelAnimationFrame(this.measureFrame); }
  }

  private measureHeight(): void {
    if (this.measureFrame !== undefined) { return; }
    this.zone.runOutsideAngular(() => {
      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = undefined;
        const height = this.element.nativeElement.getBoundingClientRect().height;
        this.zone.run(() => this.parent.updateRowDetailHeight(this.config, height));
      });
    });
  }

  getPropValue(prop, isCronTime = false) {
    let val = _.get(this.config, prop.split('.'));
    if (val === undefined || val === null) {
      val = 'N/A';
    }
    return isCronTime ? (val !== 'N/A' && val !== 'Disabled' ? cronstrue.toString(val) : val) : val;
  }

  buildColumns(): void {
    this.columns = this.parent.allColumns.filter((col) => !this.parent.conf.columns.some((c) => c.prop === col.prop));
  }

  getActions(): EntityTableAction[] {
    return this.parent.conf.getActions ? this.parent.conf.getActions(this.config) : this.parent.getActions(this.config);
  }
}
