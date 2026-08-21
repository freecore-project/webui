import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  DialogService, AppLoaderService, WebSocketService, StorageService,
} from 'app/services';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';

import helptext from 'app/helptext/services/components/service-wireguard';

@Component({
  selector: 'app-wireguard-peer-form',
  template: '<entity-form [conf]="this"></entity-form>',
})
export class WireguardPeerFormComponent {
  protected addCall = 'wireguard.peer.create';
  protected queryCall = 'wireguard.peer.query';
  protected editCall = 'wireguard.peer.update';
  protected route_success: string[] = ['services', 'wireguard', 'peers'];
  protected isEntity = true;
  protected customFilter: any[] = [[['id', '=']]];
  protected peerId: number;
  protected isNew = true;

  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.peer.header,
      label: true,
      class: 'peer',
      width: '100%',
      config: [
        {
          type: 'input',
          name: 'name',
          placeholder: helptext.peer.name.placeholder,
          tooltip: helptext.peer.name.tooltip,
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'input',
          name: 'public_key',
          placeholder: helptext.peer.public_key.placeholder,
          tooltip: helptext.peer.public_key.tooltip,
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'chip',
          name: 'allowed_ips',
          placeholder: helptext.peer.allowed_ips.placeholder,
          tooltip: helptext.peer.allowed_ips.tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'preshared_key',
          inputType: 'password',
          togglePw: true,
          placeholder: helptext.peer.preshared_key.placeholder,
          tooltip: helptext.peer.preshared_key.tooltip,
        },
        {
          type: 'input',
          name: 'keepalive',
          inputType: 'number',
          placeholder: helptext.peer.keepalive.placeholder,
          tooltip: helptext.peer.keepalive.tooltip,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          placeholder: helptext.peer.enabled.placeholder,
          tooltip: helptext.peer.enabled.tooltip,
          value: true,
        },
      ],
    },
  ];

  custActions: any[] = [
    {
      id: 'download_config',
      name: helptext.peer.buttons.download,
      function: () => {
        this.loader.open();
        this.ws.call('wireguard.peer.peer_configuration_generation', [this.peerId]).subscribe((conf) => {
          this.loader.close();
          const blob = new Blob([conf], { type: 'text/plain' });
          this.storageService.downloadBlob(blob, 'wg-peer.conf');
        }, (err) => {
          this.loader.close();
          this.dialog.errorReport(helptext.error_dialog_title, err.reason, err.trace.formatted);
        });
      },
    },
  ];

  constructor(protected dialog: DialogService, protected loader: AppLoaderService,
    protected ws: WebSocketService, protected storageService: StorageService,
    protected aroute: ActivatedRoute) { }

  // entity-form binds custBtn.disabled as a value, not a callback, so a function there
  // would read as permanently truthy. isCustActionVisible is the supported hook -- the
  // download only means anything once the peer exists server-side.
  isCustActionVisible(actionId: string) {
    if (actionId === 'download_config') {
      return !this.isNew;
    }
    return true;
  }

  preInit() {
    this.aroute.params.subscribe((params) => {
      if (params['pk']) {
        this.peerId = parseInt(params['pk'], 10);
        this.isNew = false;
        this.customFilter[0][0].push(this.peerId);
      }
    });
  }
}
