import { reflectComponentType } from '@angular/core';

import { VolumeChangekeyFormComponent } from './volumechangekey-form/volumechangekey-form.component';
import { VolumeCreatekeyFormComponent } from './volumecreatekey-form/volumecreatekey-form.component';

describe('volume key form component identities', () => {
  it('uses a stable identity for the create-passphrase form', () => {
    expect(reflectComponentType(VolumeCreatekeyFormComponent)?.selector)
      .toBe('app-createpassphrase-form');
  });

  it('uses a distinct identity for the change-passphrase form', () => {
    const createSelector = reflectComponentType(VolumeCreatekeyFormComponent)?.selector;
    const changeSelector = reflectComponentType(VolumeChangekeyFormComponent)?.selector;

    expect(changeSelector).toBe('app-changepassphrase-form');
    expect(changeSelector).not.toBe(createSelector);
  });
});
