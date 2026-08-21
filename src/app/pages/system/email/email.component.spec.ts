import { of, Subject } from 'rxjs';

import { EmailComponent } from './email.component';

describe('EmailComponent hosted OAuth policy', () => {
  let component: EmailComponent;
  let ws: any;
  let loader: any;

  beforeEach(() => {
    ws = { call: jasmine.createSpy('call').and.returnValue(of({})) };
    loader = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
    };
    component = new EmailComponent(
      {} as any,
      {} as any,
      ws,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      loader,
    );
  });

  it('makes fresh Gmail enrollment explicitly unavailable without an OAuth callback', () => {
    const login = component.fieldSets.config('login-gmail');
    const unavailable = component.fieldSets.config('oauth_not_applied');
    const sendMethod = component.fieldSets.config('send_mail_method');

    expect(login.disabled).toBeTrue();
    expect(login.customEventMethod).toBeUndefined();
    expect(login.label).toContain('Unavailable');
    expect(unavailable.paraText).toContain('Existing imported GMail OAuth credentials remain usable');
    expect(sendMethod.options.some((option) => option.name === 'smtp')).toBeTrue();
  });

  it('keeps hosted Gmail enrollment disabled after the SMTP/Gmail relation updates', () => {
    const valueChanges = new Subject<boolean>();
    const sendMailMethod = {
      value: false,
      setValue: jasmine.createSpy('setValue'),
      valueChanges,
    };
    const entityEdit = {
      formGroup: {
        controls: {
          smtp: {},
          send_mail_method: sendMailMethod,
        },
      },
      setDisabled: jasmine.createSpy('setDisabled'),
    };
    ws.call.and.returnValue(of([{ email: '' }]));

    component.afterInit(entityEdit as any);
    expect(entityEdit.setDisabled).toHaveBeenCalledWith('login-gmail', true, false);

    valueChanges.next(true);
    expect(entityEdit.setDisabled).toHaveBeenCalledWith('login-gmail', true, true);

    valueChanges.next(false);
    expect(entityEdit.setDisabled).toHaveBeenCalledWith('login-gmail', true, false);
    component.ngOnDestroy();
  });

  it('saves imported Gmail OAuth material unchanged for continued use', () => {
    const imported = {
      client_id: 'imported-client',
      client_secret: 'imported-secret',
      refresh_token: 'imported-refresh',
    };
    const incoming = { oauth: imported, pass: 'masked' };
    expect(component.resourceTransformIncomingRestData(incoming)).toEqual({ oauth: imported });

    (component as any).sendMailMethod = { value: false };
    (component as any).smtp = { setValue: jasmine.createSpy('setValue') };
    component.entityEdit = {
      success: false,
      formGroup: { markAsPristine: jasmine.createSpy('markAsPristine') },
    };
    const value = {
      fromemail: 'alerts@example.invalid',
      send_mail_method: false,
      oauth_applied: true,
    };

    component.saveConfigSubmit(value);

    expect(ws.call).toHaveBeenCalledWith('mail.update', [{
      fromemail: 'alerts@example.invalid',
      oauth: imported,
      smtp: false,
    }]);
    expect(component.entityEdit.success).toBeTrue();
    expect(component.entityEdit.formGroup.markAsPristine).toHaveBeenCalled();
    expect(loader.open).toHaveBeenCalled();
    expect(loader.close).toHaveBeenCalled();
  });

  it('sends the test mail as FreeCORE, not TrueNAS (the internal development record)', () => {
    const componentInstance = {
      setCall: jasmine.createSpy('setCall'),
      submit: jasmine.createSpy('submit'),
      setDescription: jasmine.createSpy('setDescription'),
      success: new Subject<any>(),
      failure: new Subject<any>(),
    };
    const dialog = { open: jasmine.createSpy('open').and.returnValue({ componentInstance, close: jasmine.createSpy('close') }) };
    ws.call.and.returnValue(of({ hostname: 'nas.example.invalid' }));
    const mailComponent = new EmailComponent(
      {} as any,
      {} as any,
      ws,
      {} as any,
      {} as any,
      {} as any,
      dialog as any,
      loader,
    );
    mailComponent.rootEmail = 'root@example.invalid';
    mailComponent.entityEdit = {
      formGroup: { value: { fromemail: 'nas@example.invalid', send_mail_method: true, pass: 'secret' } },
      data: { pass: 'secret' },
    };

    mailComponent.custActions[0].function();

    expect(ws.call).toHaveBeenCalledWith('system.info');
    const [method, [message]] = componentInstance.setCall.calls.mostRecent().args;
    expect(method).toBe('mail.send');
    expect(message).toEqual({
      subject: 'Test Message hostname: nas.example.invalid',
      text: 'This is a test message from FreeCORE.',
    });
    expect(JSON.stringify(message)).not.toContain('TrueNAS');
    expect(componentInstance.submit).toHaveBeenCalled();
  });
});
