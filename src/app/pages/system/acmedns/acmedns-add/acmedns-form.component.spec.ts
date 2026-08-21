import { of, throwError } from 'rxjs';

import { EntityUtils } from '../../../common/entity/utils';
import { AcmednsFormComponent } from './acmedns-form.component';

describe('AcmednsFormComponent provider schemas', () => {
  let component: AcmednsFormComponent;
  let loader: any;
  let router: any;
  let ws: any;

  const schemas = [
    {
      key: 'cloudflare',
      schema: [
        {
          _name_: 'api_token',
          _private_: true,
          _required_: false,
          default: null,
          title: 'API Token',
          type: ['string', 'null'],
        },
      ],
    },
    {
      key: 'OVH',
      schema: [
        {
          _name_: 'endpoint',
          _private_: false,
          _required_: true,
          default: 'ovh-eu',
          enum: ['ovh-eu', 'ovh-ca', 'ovh-us'],
          title: 'Endpoint',
          type: 'string',
        },
      ],
    },
    {
      key: 'route53',
      schema: [
        {
          _name_: 'secret_access_key',
          _private_: true,
          _required_: true,
          title: 'Secret Access Key',
          type: 'string',
        },
      ],
    },
    {
      key: 'shell',
      schema: [
        {
          _name_: 'timeout',
          _private_: false,
          _required_: false,
          default: 60,
          title: 'Script Timeout',
          type: 'integer',
        },
      ],
    },
  ];

  beforeEach(() => {
    loader = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
    };
    router = { navigate: jasmine.createSpy('navigate') };
    ws = {
      call: jasmine.createSpy('call').and.callFake((method) => {
        return of(method === 'acme.dns.authenticator.authenticator_schemas' ? schemas : {});
      }),
    };
    component = new AcmednsFormComponent(
      router,
      ws,
      { params: of({}) } as any,
      loader,
      {} as any,
    );
  });

  it('leaves conf.pk unset during preInit so entity-form builds a valid query filter', async () => {
    // Regression guard for the edit form loading empty. entity-form builds the query
    // as `if (conf.pk) filter.push(conf.pk)` BEFORE pushing queryCallOption, so a pk
    // set during preInit is sent as the first positional argument and
    // acme.dns.authenticator.query rejects it with "[query-filters] Not a list".
    const editComponent = new AcmednsFormComponent(
      router,
      ws,
      { params: of({ pk: '13' }) } as any,
      loader,
      {} as any,
    );
    await editComponent.prerequisite();
    editComponent.preInit();

    // entity-form reads conf.pk at this point; it must still be falsy.
    expect((editComponent as any).pk).toBeFalsy();

    // ...and the filter it will build must be a list of filter triples.
    const filter: any[] = [];
    if ((editComponent as any).pk) {
      filter.push((editComponent as any).pk);
    }
    filter.push((editComponent as any).queryCallOption);
    expect(filter).toEqual([[['id', '=', 13]]]);
    expect(Array.isArray(filter[0])).toBe(true);
  });

  it('assigns pk in afterInit so the update call still targets the right row', () => {
    const editComponent = new AcmednsFormComponent(
      router,
      ws,
      { params: of({ pk: '13' }) } as any,
      loader,
      {} as any,
    );
    editComponent.afterInit({
      formGroup: { controls: { authenticator: { value: 'route53', valueChanges: of('route53') } } },
    } as any);

    expect((editComponent as any).pk).toBe(13);
  });

  it('builds provider-specific fields from middleware schemas', async () => {
    await component.prerequisite();

    const provider = component.fieldSets[0].config.find((field) => field.name === 'authenticator');
    const fields = component.fieldSets[1].config;

    expect(provider.options).toEqual([
      { label: 'Cloudflare', value: 'cloudflare' },
      { label: 'OVHcloud', value: 'OVH' },
      { label: 'Amazon Route 53', value: 'route53' },
      { label: 'Shell', value: 'shell' },
    ]);
    expect(provider.value).toBe('route53');
    expect(fields.find((field) => field.name === 'api_token-cloudflare')).toEqual(jasmine.objectContaining({
      inputType: 'password',
      togglePw: true,
    }));
    expect(fields.find((field) => field.name === 'endpoint-OVH')).toEqual(jasmine.objectContaining({
      type: 'select',
      value: 'ovh-eu',
    }));
    expect(fields.find((field) => field.name === 'timeout-shell')).toEqual(jasmine.objectContaining({
      inputType: 'number',
      value: 60,
    }));
  });

  it('submits only the selected provider attributes and round-trips masked secrets', async () => {
    await component.prerequisite();
    (component as any).pk = 7;
    (component as any).selectedAuthenticator = 'cloudflare';
    (component as any).entityForm = {
      formGroup: { controls: { authenticator: { value: 'cloudflare' } } },
    };

    component.customSubmit({
      name: 'Cloudflare DNS',
      'api_token-cloudflare': '********',
      'endpoint-OVH': 'ovh-eu',
      'secret_access_key-route53': 'not-selected',
    });

    expect(ws.call.calls.mostRecent().args).toEqual([
      'acme.dns.authenticator.update',
      [7, {
        name: 'Cloudflare DNS',
        attributes: { api_token: '********' },
      }],
    ]);
    expect(loader.open).toHaveBeenCalled();
    expect(loader.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/', 'system', 'acmedns']);
  });

  it('loads masked stored attributes into the matching provider controls', () => {
    const attributes = { api_token: '********' };
    const controls = {
      authenticator: { setValue: jasmine.createSpy('authenticator') },
      'api_token-cloudflare': { setValue: jasmine.createSpy('api_token') },
    };

    component.dataAttributeHandler({
      formGroup: { controls },
      wsResponse: { authenticator: 'cloudflare', attributes },
      wsResponseIdx: attributes,
    });

    expect(controls.authenticator.setValue).toHaveBeenCalledWith('cloudflare');
    expect(controls['api_token-cloudflare'].setValue).toHaveBeenCalledWith('********');
  });

  it('maps nested provider validation errors to the selected provider fields once', () => {
    const error = {
      exc_info: {
        extra: [
          ['dns_authenticator_create.attributes.cloudflare_email', 'Email cannot be used with a token.'],
          ['dns_authenticator_create.attributes.api_key', 'Choose one credential mode.'],
        ],
      },
    };
    const emailField = { name: 'cloudflare_email-cloudflare' };
    const apiKeyField = { name: 'api_key-cloudflare' };
    const dialog = { errorReport: jasmine.createSpy('errorReport') };
    const handleWSError = spyOn(EntityUtils.prototype, 'handleWSError').and.callThrough();
    ws.call.and.returnValue(throwError(() => error));
    (component as any).entityForm = {
      formGroup: { controls: { authenticator: { value: 'cloudflare' } } },
      fieldConfig: [emailField, apiKeyField],
      dialog,
    };

    component.customSubmit({
      name: 'Cloudflare DNS',
      authenticator: 'cloudflare',
      'cloudflare_email-cloudflare': 'admin@example.test',
      'api_key-cloudflare': 'global-key',
      'api_token-cloudflare': 'api-token',
    });

    expect(handleWSError).toHaveBeenCalledTimes(1);
    const mappedError = handleWSError.calls.mostRecent().args[1];
    expect(mappedError.exc_info.extra.map((entry) => entry[0])).toEqual([
      'dns_authenticator_create.cloudflare_email-cloudflare',
      'dns_authenticator_create.api_key-cloudflare',
    ]);
    expect(emailField).toEqual(jasmine.objectContaining({
      hasErrors: true,
      errors: 'Email cannot be used with a token.',
    }));
    expect(apiKeyField).toEqual(jasmine.objectContaining({
      hasErrors: true,
      errors: 'Choose one credential mode.',
    }));
    expect(dialog.errorReport).not.toHaveBeenCalled();
  });
});
