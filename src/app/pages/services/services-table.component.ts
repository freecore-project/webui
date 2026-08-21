import {
  Component, OnChanges, OnInit, OnDestroy, AfterViewInit, ViewChild, Input,
  ChangeDetectionStrategy, ElementRef, HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import { RestService, WebSocketService } from '../../services';

@Component({
  standalone: false,
  selector: 'services-table',
  // the internal development record: the shell's table law (the internal development record) is scoped on .fc-records; the host carries it.
  host: { class: 'fc-records' },
  templateUrl: './services-table.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./services-table.component.css'],
})
export class ServicesTableComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input() conf: any;
  @Input() data: any[];
  @ViewChild('datatable') datatable: DatatableComponent;

  columns: any[] = [
    { name: 'Running', prop: 'state' },
    { name: 'Label', prop: 'label' },
    { name: 'Enable', prop: 'enable' },
    { name: 'Actions', prop: 'cardActions' },
  ];

  pageSize = 12;

  /** the internal development record: the Start Automatically box writes the row first, as ngModel did, then
   * hands the page the change (it reads `service.enable` and reverts it on a failed call). */
  onAutostart(checked: boolean, row: any): void {
    row.enable = checked;
    this.conf.enableToggle({ checked }, row);
  }

  onAutostartCell(row: any): void {
    this.onAutostart(!row.enable, row);
  }

  // the internal development record: the shell's table geometry (the internal development record): 40px rows, 32px header, 40px footer.
  readonly rowHeight = 40;
  readonly headerHeight = 32;
  readonly footerHeight = 40;
  minPageSize = 3;
  baseWindowHeight = 910;
  tableHeight: number;
  isFooterConsoleOpen: boolean;
  private resizeObserver: ResizeObserver;
  private observedWidth = 0;

  constructor(protected router: Router, protected rest: RestService, protected ws: WebSocketService,
    private element: ElementRef<HTMLElement>) {}

  ngOnInit() {
    this.findPageSize();

    this.ws.call('system.advanced.config').subscribe((res) => {
      if (res) {
        this.isFooterConsoleOpen = res.consolemsg;
        this.setTableHeight(this.datatable);
      }
    });
  }

  ngAfterViewInit() {
    // Sidebar transitions change the container after the window resize event.
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.width !== this.observedWidth) {
        this.observedWidth = entry.contentRect.width;
        this.datatable?.recalculate();
        const body = this.datatable?.bodyComponent;
        const columns = body?.columns;
        if (columns) {
          // ngx-datatable mutates widths in place; refresh its cached scroll extent
          // through the body input without resetting the user's column order/widths.
          body.columns = columns;
        }
      }
    });
    this.resizeObserver.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:resize')
  findPageSize() {
    const x = window.innerHeight - this.baseWindowHeight;
    this.pageSize = 12 + (Math.floor(x / this.rowHeight));
    if (this.pageSize < this.minPageSize) {
      this.pageSize = this.minPageSize;
    }
    this.setTableHeight(this.datatable);
  }

  ngOnChanges(changes) {
    if (changes.data) {
      const newData = Object.assign(this.data, {});
      this.data = newData;
    }
    if (this.datatable) {
      this.datatable.limit = this.pageSize; // items per page
      this.datatable.recalculate();
      this.setTableHeight(this.datatable);
    }
  }

  setTableHeight(t) {
    const frame = this.headerHeight + this.footerHeight;
    if (this.isFooterConsoleOpen) {
      this.tableHeight = (this.rowHeight * this.pageSize) + frame - 22;
    } else {
      this.tableHeight = (this.rowHeight * this.pageSize) + frame + 28;
    }
  }
}
