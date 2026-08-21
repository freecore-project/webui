import { of } from 'rxjs';

import { CloudCredentialsFormComponent } from './cloudcredentials-form.component';

describe('CloudCredentialsFormComponent hosted OAuth policy', () => {
  let component: CloudCredentialsFormComponent;
  let providers: any[];

  beforeEach(() => {
    providers = [
      { name: 'GOOGLE_DRIVE', title: 'Google Drive', credentials_oauth: 'hosted-oauth' },
      { name: 'S3', title: 'Amazon S3', credentials_oauth: null },
    ];
    component = new CloudCredentialsFormComponent(
      {} as any,
      { params: of({}) } as any,
      { call: jasmine.createSpy('call').and.returnValue(of([])) } as any,
      { getProviders: jasmine.createSpy('getProviders').and.returnValue(of(providers)) } as any,
      {} as any,
      {} as any,
    );
  });

  it('shows a disabled, inert enrollment action for a fresh hosted-OAuth provider', () => {
    const entityForm = { setDisabled: jasmine.createSpy('setDisabled') };

    component.setOauthProviderState('GOOGLE_DRIVE', entityForm);

    expect(component.isCustActionVisible('authenticate')).toBeTrue();
    expect(component.isCustActionDisabled('authenticate')).toBeTrue();
    expect(component.custActions.find((action) => action.id === 'authenticate').function).toBeUndefined();
    expect(component.custActions.find((action) => action.id === 'validCredential').function).toBeDefined();
    expect(entityForm.setDisabled.calls.allArgs()).toEqual([
      ['client_id', false, false],
      ['client_secret', false, false],
      ['hosted_oauth_unavailable', false, false],
    ]);
  });

  it('keeps hosted enrollment out of non-OAuth provider flows', () => {
    const entityForm = { setDisabled: jasmine.createSpy('setDisabled') };

    component.setOauthProviderState('S3', entityForm);

    expect(component.isCustActionVisible('authenticate')).toBeFalse();
    expect(entityForm.setDisabled.calls.allArgs()).toEqual([
      ['client_id', true, true],
      ['client_secret', true, true],
      ['hosted_oauth_unavailable', true, true],
    ]);
  });

  it('round-trips imported OAuth fields without changing provider material', () => {
    const imported = {
      client_id: 'imported-client',
      client_secret: 'imported-secret',
      token: { access_token: 'access', refresh_token: 'refresh', expiry: '2030-01-01' },
    };
    const controls = {
      provider: { value: 'GOOGLE_DRIVE' },
      client_id: { setValue: jasmine.createSpy('client_id') },
      client_secret: { setValue: jasmine.createSpy('client_secret') },
      'token-GOOGLE_DRIVE': { setValue: jasmine.createSpy('token') },
    };
    component.dataAttributeHandler({
      formGroup: { controls },
      wsResponseIdx: imported,
    });
    expect(controls.client_id.setValue).toHaveBeenCalledWith(imported.client_id);
    expect(controls.client_secret.setValue).toHaveBeenCalledWith(imported.client_secret);
    expect(controls['token-GOOGLE_DRIVE'].setValue).toHaveBeenCalledWith(imported.token);

    const submitFunction = jasmine.createSpy('submitFunction').and.returnValue(of({}));
    (component as any).entityForm = {
      loader: { open: jasmine.createSpy('open'), close: jasmine.createSpy('close') },
      router: { navigate: jasmine.createSpy('navigate') },
      submitFunction,
    };
    const value = {
      name: 'Imported Google Drive',
      provider: 'GOOGLE_DRIVE',
      client_id: imported.client_id,
      client_secret: imported.client_secret,
      'token-GOOGLE_DRIVE': imported.token,
    };

    component.finishSubmit(value);

    expect(submitFunction).toHaveBeenCalledWith({
      name: 'Imported Google Drive',
      provider: 'GOOGLE_DRIVE',
      attributes: imported,
    });
    (component as any).entityForm.formGroup = { invalid: false };
    expect(component.isCustActionDisabled('validCredential')).toBeFalse();
  });
});
