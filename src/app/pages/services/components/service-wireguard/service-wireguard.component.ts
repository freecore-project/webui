import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  DialogService, AppLoaderService, WebSocketService,
} from 'app/services';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';

import helptext from 'app/helptext/services/components/service-wireguard';

@Component({
  selector: 'wireguard-edit',
  template: ' <entity-form [conf]="this"></entity-form>',
})

export class ServiceWireguardComponent {
  protected queryCall = 'wireguard.config';
  protected editCall = 'wireguard.update';
  protected route_success: string[] = ['services'];
  protected entityEdit: any;
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.server.header,
      label: true,
      config: [],
    },
    {
      name: 'server-settings',
      label: false,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'public_key',
          placeholder: helptext.public_key.placeholder,
          tooltip: helptext.public_key.tooltip,
          readonly: true,
        },
        {
          type: 'ipwithnetmask',
          name: 'address',
          placeholder: helptext.address.placeholder,
          tooltip: helptext.address.tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'listen_port',
          inputType: 'number',
          placeholder: helptext.listen_port.placeholder,
          tooltip: helptext.listen_port.tooltip,
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
      name: 'client-settings',
      label: false,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'endpoint',
          placeholder: helptext.endpoint.placeholder,
          tooltip: helptext.endpoint.tooltip,
        },
        {
          type: 'input',
          name: 'dns',
          placeholder: helptext.dns.placeholder,
          tooltip: helptext.dns.tooltip,
        },
        {
          type: 'input',
          name: 'mtu',
          inputType: 'number',
          placeholder: helptext.mtu.placeholder,
          tooltip: helptext.mtu.tooltip,
        },
        {
          type: 'input',
          name: 'private_key',
          inputType: 'password',
          togglePw: true,
          placeholder: helptext.private_key.placeholder,
          tooltip: helptext.private_key.tooltip,
        },
      ],
    },
  ];

  custActions: any[] = [
    {
      id: 'generate_keys',
      name: helptext.server.buttons.generate,
      function: () => {
        this.dialog.confirm(
          helptext.server.buttons.generate,
          'Generating a new keypair replaces this server\'s identity. Every peer '
          + 'configuration already handed out stops working until it is regenerated '
          + 'and redistributed. Continue?',
        ).subscribe((confirmed) => {
          if (!confirmed) {
            return;
          }
          this.loader.open();
          this.ws.call('wireguard.generate_keys').subscribe((res) => {
            this.loader.close();
            this.entityEdit.formGroup.controls['public_key'].setValue(res.public_key);
            // The private key is deliberately not written back into the form: the field
            // exists to import a key, and an empty value means "keep the stored one".
          }, (err) => {
            this.loader.close();
            this.dialog.errorReport(helptext.error_dialog_title, err.reason, err.trace.formatted);
          });
        });
      },
    },
    {
      id: 'manage_peers',
      name: helptext.server.buttons.peers,
      function: () => {
        this.router.navigate(['/', 'services', 'wireguard', 'peers']);
      },
    },
  ];

  constructor(protected dialog: DialogService, protected loader: AppLoaderService,
    protected ws: WebSocketService, protected router: Router) { }

  resourceTransformIncomingRestData(data) {
    data.address = `${data.address}/${data.netmask}`;
    // Never round-trip the stored private key through the browser. Blank means
    // "unchanged" and beforeSubmit drops it from the payload.
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

    // public_key is derived server-side; sending it back would be rejected by the schema.
    delete data.public_key;

    if (!data.private_key) {
      delete data.private_key;
    }
  }
}
