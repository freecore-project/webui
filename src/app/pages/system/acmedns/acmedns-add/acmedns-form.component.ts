import { T } from 'app/translate-marker';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { EntityUtils } from '../../../common/entity/utils';
import { helptext_system_acme as helptext } from 'app/helptext/system/acme';

interface AuthenticatorAttributeSchema {
  _name_: string;
  _private_: boolean;
  _required_: boolean;
  default?: any;
  description?: string;
  enum?: string[];
  title?: string;
  type: string | string[];
}

interface AuthenticatorSchema {
  key: string;
  schema: AuthenticatorAttributeSchema[];
}

@Component({
  standalone: false,
  selector: 'app-acmedns-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})
export class AcmednsFormComponent {
  settingsTitle = T('ACME DNS Authenticator');
  protected addCall = 'acme.dns.authenticator.create';
  protected queryCall = 'acme.dns.authenticator.query';
  protected editCall = 'acme.dns.authenticator.update';
  protected route_success: string[] = ['system', 'acmedns'];
  protected isEntity = true;

  protected fieldConfig: FieldConfig[];
  fieldSets: FieldSet[] = [
    {
      name: 'Add DNS Authenticator',
      settingsLabel: helptext.select_auth_label,
      label: true,
      width: '50%',
      config: [
        {
          type: 'paragraph',
          name: 'select_auth',
          paraText: helptext.select_auth_label,
          isHidden: true,
        },
        {
          type: 'input',
          name: helptext.authenticator_name_name,
          placeholder: helptext.authenticator_name_placeholder,
          tooltip: helptext.authenticator_name_tooltip,
          required: true,
          validation: helptext.authenticator_name_validation,
          parent: this,
        },
        {
          type: 'select',
          name: helptext.authenticator_provider_name,
          placeholder: helptext.authenticator_provider_placeholder,
          tooltip: helptext.authenticator_provider_tooltip,
          options: [],
          parent: this,
        },
      ],
    },
    {
      name: helptext.auth_attributes_label,
      settingsLabel: helptext.auth_attributes_label,
      width: '50%',
      label: false,
      config: [
        {
          type: 'paragraph',
          name: 'auth_attributes',
          paraText: helptext.auth_attributes_label,
          isHidden: true,
        },
      ],
    }];

  protected entityForm: any;
  private pk: any;
  private selectedAuthenticator: string;
  protected queryCallOption: any[] = [['id', '=']];

  constructor(protected router: Router, protected ws: WebSocketService, protected route: ActivatedRoute,
    protected loader: AppLoaderService, protected dialog: DialogService) {}

  async prerequisite(): Promise<boolean> {
    const schemas = await this.ws.call(
      'acme.dns.authenticator.authenticator_schemas', [],
    ).toPromise() as AuthenticatorSchema[];
    const providerField = this.fieldSets[0].config.find((field) => field.name === 'authenticator');
    const attributes = this.fieldSets[1].config;

    providerField.options = schemas.map((schema) => ({
      label: this.providerLabel(schema.key),
      value: schema.key,
    }));
    providerField.value = schemas.some((schema) => schema.key === 'route53')
      ? 'route53'
      : schemas[0].key;

    schemas.forEach((authenticator) => {
      authenticator.schema.forEach((schema) => {
        attributes.push(this.attributeField(authenticator.key, schema));
      });
    });
    return true;
  }

  private providerLabel(provider: string): string {
    return {
      cloudflare: 'Cloudflare',
      digitalocean: 'DigitalOcean',
      OVH: 'OVHcloud',
      route53: 'Amazon Route 53',
      shell: 'Shell',
    }[provider] || provider;
  }

  private attributeField(provider: string, schema: AuthenticatorAttributeSchema): FieldConfig {
    const field: FieldConfig = {
      type: schema.enum ? 'select' : 'input',
      name: `${schema._name_}-${provider}`,
      placeholder: schema.title || schema._name_,
      tooltip: schema.description,
      required: schema._required_,
      validation: schema._required_ ? [Validators.required] : [],
      parent: this,
      relation: [{
        action: 'SHOW',
        when: [{
          name: 'authenticator',
          value: provider,
        }],
      }],
    };

    if (Object.prototype.hasOwnProperty.call(schema, 'default')) {
      field.value = schema.default;
    }
    if (schema.enum) {
      field.options = schema.enum.map((value) => ({ label: value, value }));
    }
    if (schema._private_) {
      field.inputType = 'password';
      field.togglePw = true;
    } else if (schema.type === 'integer') {
      field.inputType = 'number';
    }

    return field;
  }

  preInit() {
    this.route.params.subscribe((params) => {
      if (params['pk']) {
        // Do NOT assign this.pk here. entity-form reads conf.pk while it builds the
        // query filter and, when it is set, pushes the raw pk as the first positional
        // argument -- acme.dns.authenticator.query then receives an integer where
        // query-filters belongs and rejects the call with "[query-filters] Not a list",
        // so the edit form loads unpopulated. Assign it in afterInit(), which runs
        // after the filter is built and long before customSubmit() needs it.
        this.queryCallOption[0].push(parseInt(params['pk'], 10));
        this.fieldSets[0].config.find((field) => field.name === 'authenticator').disabled = true;
      }
    });
  }

  afterInit(entityEdit: any) {
    this.entityForm = entityEdit;
    this.route.params.subscribe((params) => {
      if (params['pk']) {
        this.pk = parseInt(params['pk'], 10);
      }
    });
    const authenticatorControl = entityEdit.formGroup.controls['authenticator'];
    this.selectedAuthenticator = authenticatorControl.value;
    authenticatorControl.valueChanges.subscribe((authenticator) => {
      if (authenticator) {
        this.selectedAuthenticator = authenticator;
      }
    });
  }

  dataAttributeHandler(entityForm: any) {
    if (entityForm.wsResponseIdx !== entityForm.wsResponse.attributes) {
      return;
    }
    const authenticator = entityForm.wsResponse.authenticator;
    this.selectedAuthenticator = authenticator;
    entityForm.formGroup.controls['authenticator'].setValue(authenticator);

    for (const item in entityForm.wsResponseIdx) {
      const control = entityForm.formGroup.controls[`${item}-${authenticator}`];
      if (control) {
        control.setValue(entityForm.wsResponseIdx[item]);
      }
    }
  }

  customSubmit(value) {
    const attributes = {};
    const authenticator = value.authenticator
      || this.selectedAuthenticator
      || this.entityForm.formGroup.controls['authenticator'].value;
    const suffix = `-${authenticator}`;

    for (const item in value) {
      if (item.endsWith(suffix)) {
        attributes[item.slice(0, -suffix.length)] = value[item];
      }
    }

    const payload = {};
    payload['name'] = value.name;
    payload['attributes'] = attributes;

    let newCall; let
      data;
    if (this.pk) {
      newCall = this.editCall;
      data = [this.pk, payload];
    } else {
      payload['authenticator'] = authenticator;
      newCall = this.addCall;
      data = [payload];
    }

    this.loader.open();
    this.ws.call(newCall, data).subscribe(
      (res) => {
        this.loader.close();
        this.router.navigate(new Array('/').concat(this.route_success));
      },
      (res) => {
        this.loader.close();
        this.handleSubmitError(res, authenticator);
      },
    );
  }

  private handleSubmitError(res: any, authenticator: string): void {
    const extra = res && res.exc_info && Array.isArray(res.exc_info.extra)
      ? res.exc_info.extra
      : res && res.extra;

    if (Array.isArray(extra)) {
      const marker = '.attributes.';
      const mappedExtra = extra.map((entry) => {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string') {
          return entry;
        }

        const markerIndex = entry[0].indexOf(marker);
        if (markerIndex === -1) {
          return entry;
        }

        const namespace = entry[0].slice(0, markerIndex);
        const attribute = entry[0].slice(markerIndex + marker.length);
        return [`${namespace}.${attribute}-${authenticator}`, ...entry.slice(1)];
      });

      res = { ...res, extra: mappedExtra };
      if (res.exc_info) {
        res.exc_info = { ...res.exc_info, extra: mappedExtra };
      }
    }

    new EntityUtils().handleWSError(this.entityForm, res);
  }
}
