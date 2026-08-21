export interface EntityTreeNode<T = any> {
  data?: T;
  children?: EntityTreeNode<T>[];
  expanded?: boolean;
  leaf?: boolean;
  parent?: EntityTreeNode<T>;
}

export class EntityTreeTableColumn {
  name: string;
  prop: string;
  /** Display/sort field when the saved column key names a raw property. */
  valueProp?: string;
  filesizePipe?: boolean;
  /** Preferred width used only by an opted-in column projection. */
  width?: number;
}

export class EntityTreeTable {
  tableData?: EntityTreeNode[];
  columns: EntityTreeTableColumn[];
  queryCall?: string;
  /** runs when a row's menu opens (the internal development record: it was the trigger's click) -- the Pools tree disables actions here */
  clickAction?: (row: any) => void;
}
