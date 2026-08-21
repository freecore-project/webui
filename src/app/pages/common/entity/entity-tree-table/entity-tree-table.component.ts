import { Component, Input, OnChanges, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DialogService, WebSocketService } from '../../../../services';
import { EntityUtils } from '../utils';
import { EntityTreeNode, EntityTreeTable, EntityTreeTableColumn } from './entity-tree-table.model';
import { EntityTreeTableService } from './entity-tree-table.service';
import { TranslateService } from '@ngx-translate/core';

interface EntityTreeTableRow {
  node: EntityTreeNode;
  level: number;
}

interface ColumnResizeState {
  columnIndex: number;
  startX: number;
  startWidth: number;
  startTableWidth: number;
  minimumWidth: number;
}

@Component({
  standalone: false,
  selector: 'entity-tree-table',
  templateUrl: './entity-tree-table.component.html',
  styleUrls: ['./entity-tree-table.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [EntityTreeTableService],
})
export class EntityTreeTableComponent implements OnChanges, OnInit, OnDestroy {
  @Input() conf: EntityTreeTable;
  @Input() expandRootNodes = false;
  /** the internal development record: absent keeps every existing tree consumer unchanged. */
  @Input() visibleColumnProperties: string[];

  showActions = true;
  treeTableData: EntityTreeNode[] = [];
  sortField: string = null;
  sortOrder: -1 | 0 | 1 = 0;
  columnWidths: number[] = [];
  tableWidth: number = null;

  private activeNodes: EntityTreeNode[] = null;
  private originalSortPositions = new WeakMap<EntityTreeNode, number>();
  private resizeState: ColumnResizeState = null;
  private projectedColumnKey: string;

  constructor(private ws: WebSocketService,
    private treeTableService: EntityTreeTableService,
    private dialogService: DialogService,
    protected translate: TranslateService) { }

  get hasColumnProjection(): boolean {
    return this.visibleColumnProperties != null;
  }

  get visibleColumns(): EntityTreeTableColumn[] {
    const columns = this.conf?.columns || [];
    if (!this.hasColumnProjection) return columns;
    // Name owns the tree expander. Never allow a preference to remove/reorder it.
    const name = columns.find((column) => column.prop === 'name');
    return [
      ...(name ? [name] : []),
      ...columns.filter((column) => column !== name && this.visibleColumnProperties.includes(column.prop)),
    ];
  }

  projectedColumnWidth(column: EntityTreeTableColumn): number | null {
    return column.prop === 'name' ? null : (column.width || 112);
  }

  get projectedMinimumWidth(): number | null {
    if (!this.hasColumnProjection) return null;
    return this.visibleColumns.reduce((total, column) => total + (this.projectedColumnWidth(column) || 200), this.showActions ? 56 : 0);
  }

  ngOnChanges() {
    if (!this.hasColumnProjection && this.projectedColumnKey == null) return;
    const key = this.hasColumnProjection ? this.visibleColumns.map((column) => column.prop).join('|') : null;
    if (key === this.projectedColumnKey) return;
    // Explicit policy: a changed projection resets manual widths, including an
    // active drag. Indexed widths can never migrate onto another property.
    this.stopColumnResize();
    this.columnWidths = [];
    this.tableWidth = null;
    this.projectedColumnKey = key;
    if (this.sortField && !this.visibleColumns.some((column) => column.prop === this.sortField)) {
      const nodes = this.getActiveNodes();
      this.sortField = null;
      this.sortOrder = 0;
      this.restoreOriginalOrder(nodes);
    }
  }

  ngOnInit() {
    if (this.conf.queryCall) {
      this.getData();
    } else if (this.conf.tableData && this.expandRootNodes) {
      /* Expand the root nodes by default */
      this.conf.tableData.filter((node) => !node.parent).forEach((node) => (node.expanded = true));
    }
  }

  ngOnDestroy() {
    this.stopColumnResize();
  }

  get visibleRows(): EntityTreeTableRow[] {
    return this.flattenVisibleNodes(this.getActiveNodes());
  }

  getData() {
    this.ws.call(this.conf.queryCall).subscribe(
      (res) => {
        this.treeTableData = this.treeTableService.buildTree(res);
      },
      (err) => {
        new EntityUtils().handleWSError(this, err, this.dialogService);
      },
    );
  }
  clickAction() {
    return null;
  }

  sortColumn(field: string) {
    const nodes = this.getActiveNodes();

    if (this.sortField !== field || this.sortOrder === 0) {
      this.sortField = field;
      this.sortOrder = 1;
      this.sortNodes(nodes, field, this.sortOrder);
    } else if (this.sortOrder === 1) {
      this.sortOrder = -1;
      this.sortNodes(nodes, field, this.sortOrder);
    } else {
      this.sortField = null;
      this.sortOrder = 0;
      this.restoreOriginalOrder(nodes);
    }
  }

  toggleNode(node: EntityTreeNode, event: Event) {
    event.stopPropagation();
    node.expanded = !node.expanded;
  }

  hasChildren(node: EntityTreeNode): boolean {
    return node.leaf === false || Boolean(node.children && node.children.length);
  }

  startColumnResize(
    event: MouseEvent,
    columnIndex: number,
    header: HTMLElement,
    table: HTMLTableElement,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.stopColumnResize();
    this.resizeState = {
      columnIndex,
      startX: event.clientX,
      startWidth: header.getBoundingClientRect().width,
      startTableWidth: table.getBoundingClientRect().width,
      minimumWidth: header.classList.contains('entity-tree-name-column') ? 200 : 80,
    };

    document.addEventListener('mousemove', this.resizeColumn);
    document.addEventListener('mouseup', this.stopColumnResize);
  }

  private resizeColumn = (event: MouseEvent) => {
    if (!this.resizeState) {
      return;
    }

    const delta = event.clientX - this.resizeState.startX;
    const width = Math.max(
      this.resizeState.minimumWidth,
      this.resizeState.startWidth + delta,
    );
    const effectiveDelta = width - this.resizeState.startWidth;
    const widths = [...this.columnWidths];
    widths[this.resizeState.columnIndex] = width;

    this.columnWidths = widths;
    this.tableWidth = Math.max(1, this.resizeState.startTableWidth + effectiveDelta);
  };

  private stopColumnResize = () => {
    document.removeEventListener('mousemove', this.resizeColumn);
    document.removeEventListener('mouseup', this.stopColumnResize);
    this.resizeState = null;
  };

  private getActiveNodes(): EntityTreeNode[] {
    const nodes = this.conf?.tableData || this.treeTableData || [];

    if (nodes !== this.activeNodes) {
      this.activeNodes = nodes;
      this.originalSortPositions = new WeakMap<EntityTreeNode, number>();
      this.captureOriginalOrder(nodes);

      if (this.sortField && this.sortOrder) {
        this.sortNodes(nodes, this.sortField, this.sortOrder);
      }
    }

    return nodes;
  }

  private flattenVisibleNodes(nodes: EntityTreeNode[], level = 0): EntityTreeTableRow[] {
    const rows: EntityTreeTableRow[] = [];

    nodes.forEach((node) => {
      rows.push({ node, level });
      if (node.expanded && node.children?.length) {
        rows.push(...this.flattenVisibleNodes(node.children, level + 1));
      }
    });

    return rows;
  }

  private captureOriginalOrder(nodes: EntityTreeNode[] = []) {
    nodes.forEach((node, index) => {
      if (!this.originalSortPositions.has(node)) {
        this.originalSortPositions.set(node, index);
      }
      this.captureOriginalOrder(node.children);
    });
  }

  private sortNodes(nodes: EntityTreeNode[] = [], field: string, order: -1 | 1) {
    this.captureOriginalOrder(nodes);
    const valueField = this.conf.columns.find((column) => column.prop === field)?.valueProp || field;

    nodes.sort((node1, node2) => {
      const value1 = node1.data?.[valueField];
      const value2 = node2.data?.[valueField];

      let result = 0;

      if (value1 == null && value2 != null) result = -1;
      else if (value1 != null && value2 == null) result = 1;
      else if (value1 == null && value2 == null) result = 0;
      else if (typeof value1 === 'string' && typeof value2 === 'string') result = value1.localeCompare(value2);
      else result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

      return order * result;
    });

    nodes.forEach((node) => this.sortNodes(node.children, field, order));
  }

  private restoreOriginalOrder(nodes: EntityTreeNode[] = []) {
    nodes.sort((node1, node2) => {
      const position1 = this.originalSortPositions.get(node1) ?? Number.MAX_SAFE_INTEGER;
      const position2 = this.originalSortPositions.get(node2) ?? Number.MAX_SAFE_INTEGER;
      return position1 - position2;
    });

    nodes.forEach((node) => this.restoreOriginalOrder(node.children));
  }
}
