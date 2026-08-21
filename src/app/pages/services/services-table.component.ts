import {
  Component, OnChanges, OnInit, OnDestroy, AfterViewInit, ViewChild, Input, ElementRef, HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import { RestService, WebSocketService } from '../../services';

@Component({
  selector: 'services-table',
  templateUrl: './services-table.component.html',
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
          // Refresh the cached scroll extent without resetting operator column widths/order.
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
    this.pageSize = 12 + (Math.floor(x / 50));
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
    if (this.isFooterConsoleOpen) {
      this.tableHeight = (50 * this.pageSize) + 50;
    } else {
      this.tableHeight = (50 * this.pageSize) + 100;
    }
  }
}
