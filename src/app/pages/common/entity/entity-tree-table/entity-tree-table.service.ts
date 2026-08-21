import { Injectable } from '@angular/core';

import { WebSocketService } from '../../../../services';
import { EntityTreeNode } from './entity-tree-table.model';

@Injectable()
export class EntityTreeTableService {
  constructor(private ws: WebSocketService) {}

  buildTree(data): EntityTreeNode[] {
    const tree: EntityTreeNode[] = [];
    for (let i = 0; i < data.length; i++) {
      const node = this.getNode(data[i]);
      tree.push(node);
    }
    return tree;
  }

  getNode(item): EntityTreeNode {
    const nodeData = {};
    for (const prop in item) {
      nodeData[prop] = item[prop];
    }

    const nodeChildren = [];
    for (const child in item.children) {
      nodeChildren.push(this.getNode(item.children[child]));
    }

    const node: EntityTreeNode = {};
    node.data = nodeData;
    node.expanded = true;
    node.children = nodeChildren;
    return node;
  }
}
