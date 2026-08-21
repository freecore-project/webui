import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { T } from 'app/translate-marker';
import { displayWireguardPeer } from './wireguard-peer-runtime';

@Component({
  selector: 'app-wireguard-peer-list',
  template: `
    <entity-table [conf]="this" [title]="tableTitle"></entity-table>
  `,
  })
export class WireguardPeerListComponent {
  tableTitle = 'WireGuard Peers';
  protected queryCall = 'wireguard.peer.status';
  asyncView = true;
  preservePageOnRefresh = true;
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
    { name: T('Last Handshake'), prop: 'handshake_display', always_display: true },
    { name: T('Status'), prop: 'runtime_state_display' },
    { name: T('Current Endpoint'), prop: 'endpoint_display' },
    { name: T('Received'), prop: 'received_display' },
    { name: T('Sent'), prop: 'sent_display' },
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

  constructor(protected router: Router, private translate: TranslateService) {}

  resourceTransformIncomingRestData(data) {
    return data.map((peer) => displayWireguardPeer(peer, (message) => this.translate.instant(message)));
  }
}
