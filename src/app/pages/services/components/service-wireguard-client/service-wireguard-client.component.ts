import { Component } from '@angular/core';
import {
  DialogService, AppLoaderService, WebSocketService,
} from 'app/services';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';

import helptext from 'app/helptext/services/components/service-wireguard';

@Component({
  selector: 'wireguard-client-edit',
  template: ' <entity-form [conf]="this"></entity-form>',
})

export class ServiceWireguardClientComponent {
  protected queryCall = 'wireguard.client.config';
  protected editCall = 'wireguard.client.update';
  protected route_success: string[] = ['services'];
  protected entityEdit: any;
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.client.header,
      label: true,
      config: [],
    },
    {
      name: 'remote-settings',
      label: false,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'peer_public_key',
          placeholder: helptext.client.peer_public_key.placeholder,
          tooltip: helptext.client.peer_public_key.tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'endpoint',
          placeholder: helptext.client.endpoint.placeholder,
          tooltip: helptext.client.endpoint.tooltip,
          required: true,
        },
        {
          type: 'chip',
          name: 'allowed_ips',
          placeholder: helptext.client.allowed_ips.placeholder,
          tooltip: helptext.client.allowed_ips.tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'preshared_key',
          inputType: 'password',
          togglePw: true,
          placeholder: helptext.client.preshared_key.placeholder,
          tooltip: helptext.client.preshared_key.tooltip,
        },
      ],
    },
    {
      name: 'vertical-spacer',
      label: false,
      width: '2%',
      config: [],
    },
    {
      name: 'local-settings',
      label: false,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'public_key',
          placeholder: helptext.client.public_key.placeholder,
          tooltip: helptext.client.public_key.tooltip,
          readonly: true,
        },
        {
          type: 'ipwithnetmask',
          name: 'address',
          placeholder: helptext.client.address.placeholder,
          tooltip: helptext.client.address.tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'keepalive',
          inputType: 'number',
          placeholder: helptext.client.keepalive.placeholder,
          tooltip: helptext.client.keepalive.tooltip,
        },
        {
          type: 'input',
          name: 'mtu',
          inputType: 'number',
          placeholder: helptext.client.mtu.placeholder,
          tooltip: helptext.client.mtu.tooltip,
        },
        {
          type: 'input',
          name: 'private_key',
          inputType: 'password',
          togglePw: true,
          placeholder: helptext.client.private_key.placeholder,
          tooltip: helptext.client.private_key.tooltip,
        },
      ],
    },
  ];

  custActions: any[] = [
    {
      id: 'generate_keys',
      name: helptext.client.buttons.generate,
      function: () => {
        this.dialog.confirm(
          helptext.client.buttons.generate,
          'Generating a new keypair changes this system\'s identity. The tunnel stays '
          + 'down until the remote server\'s operator is given the new public key. Continue?',
        ).subscribe((confirmed) => {
          if (!confirmed) {
            return;
          }
          this.loader.open();
          this.ws.call('wireguard.client.generate_keys').subscribe((res) => {
            this.loader.close();
            this.entityEdit.formGroup.controls['public_key'].setValue(res.public_key);
            // Same as the server page: the private key is never written back into the
            // form. The field is for importing, and empty means "keep the stored one".
          }, (err) => {
            this.loader.close();
            this.dialog.errorReport(helptext.error_dialog_title, err.reason, err.trace.formatted);
          });
        });
      },
    },
  ];

  constructor(protected dialog: DialogService, protected loader: AppLoaderService,
    protected ws: WebSocketService) { }

  resourceTransformIncomingRestData(data) {
    data.address = `${data.address}/${data.netmask}`;
    data.private_key = '';
    return data;
  }

  afterInit(entityEdit: any) {
    this.entityEdit = entityEdit;
  }

  beforeSubmit(data) {
    const addressInfo = data.address.split('/');
    data.address = addressInfo[0];
    data.netmask = parseInt(addressInfo[1], 10);

    // Derived server-side and absent from the update schema.
    delete data.public_key;

    if (!data.private_key) {
      delete data.private_key;
    }
  }
}
