import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { T } from 'app/translate-marker';

@Component({
  selector: 'app-wireguard-peer-list',
  template: `
    <entity-table [conf]="this" [title]="tableTitle"></entity-table>
  `,
})
export class WireguardPeerListComponent {
  tableTitle = 'WireGuard Peers';
  protected queryCall = 'wireguard.peer.query';
  protected wsDelete = 'wireguard.peer.delete';
  protected route_add: string[] = ['services', 'wireguard', 'peers', 'add'];
  protected route_add_tooltip = 'Add WireGuard Peer';
  protected route_edit: string[] = ['services', 'wireguard', 'peers', 'edit'];

  columns: any[] = [
    {
      name: T('Name'),
      prop: 'name',
      always_display: true,
    },
    {
      name: T('Allowed IPs'),
      prop: 'allowed_ips_string',
    },
    {
      name: T('Enabled'),
      prop: 'enabled',
    },
  ];
  rowIdentifier = 'name';
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: 'WireGuard Peer',
      key_props: ['name'],
    },
  };

  constructor(protected router: Router) {}

  resourceTransformIncomingRestData(data) {
    // allowed_ips comes back as a list; entity-table renders scalars.
    return data.map((peer) => ({
      ...peer,
      allowed_ips_string: (peer.allowed_ips || []).join(', '),
    }));
  }
}
