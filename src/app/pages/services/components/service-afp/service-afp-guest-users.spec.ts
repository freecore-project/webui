import { of } from 'rxjs';
import helptext from '../../../../helptext/services/components/service-afp';
import { ServiceAFPComponent } from './service-afp.component';

describe('AFP service Guest Account choices', () => {
  it('offers every user returned by user.query once, keeping the nobody default', () => {
    const guestUser = { name: 'guest_user', options: [{ label: 'nobody', value: 'nobody' }] };
    const fake: any = {
      fieldSets: [
        { name: helptext.afp_fieldset_access, config: [guestUser] },
        { name: helptext.afp_fieldset_other, config: [{ name: 'bindip', options: [] }] },
      ],
      userService: { listUsers: () => of([{ username: 'nobody' }, { username: 'alice' }, { username: 'asa' }]) },
      ws: { call: () => of({}) },
      submitFunction: () => undefined,
    };

    ServiceAFPComponent.prototype.afterInit.call(fake, {});

    expect(guestUser.options.map((option) => option.value)).toEqual(['nobody', 'alice', 'asa']);
  });
});
