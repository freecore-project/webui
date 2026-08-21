import { ApplicationRef, Injector } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { CoreService } from 'app/core/services/core.service';
import { EntityFormEmbeddedComponent } from 'app/pages/common/entity/entity-form/entity-form-embedded.component';
import { RestService, WebSocketService } from 'app/services';
import { DefaultTheme, ThemeService } from 'app/services/theme/theme.service';
import { GeneralPreferencesFormComponent } from './general-preferences-form.component';

describe('GeneralPreferencesFormComponent', () => {
  let component: GeneralPreferencesFormComponent;
  let formGroup: UntypedFormGroup;

  beforeEach(() => {
    component = new GeneralPreferencesFormComponent(
      {} as Router, {} as RestService, {} as WebSocketService, {} as Injector,
      {} as ApplicationRef, {} as ThemeService, {} as CoreService,
    );
    formGroup = new UntypedFormGroup({
      userTheme: new UntypedFormControl('old-theme'),
      preferIconsOnly: new UntypedFormControl(false),
      allowPwToggle: new UntypedFormControl(false),
      tableDisplayedColumns: new UntypedFormControl(true),
      retroLogo: new UntypedFormControl(true),
      reset: new UntypedFormControl(true),
    });
    component.embeddedForm = { formGroup } as EntityFormEmbeddedComponent;
  });

  for (const columns of [[], ['Users']]) {
    it(`clears one-shot actions with ${columns.length} saved column entries`, () => {
      component.updateValues({
        userTheme: 'default',
        preferIconsOnly: true,
        allowPwToggle: true,
        tableDisplayedColumns: columns,
        retroLogo: false,
      });
      expect(formGroup.controls.userTheme.value).toBe(DefaultTheme.name);
      expect(formGroup.controls.preferIconsOnly.value).toBeTrue();
      expect(formGroup.controls.allowPwToggle.value).toBeTrue();
      expect(formGroup.controls.retroLogo.value).toBeFalse();
      expect(formGroup.controls.tableDisplayedColumns.value).toBeFalse();
      expect(formGroup.controls.reset.value).toBeFalse();
      // A second unrelated save must not turn the stored array into a reset request.
      const secondSave = formGroup.value;
      component.beforeSubmit(secondSave);
      expect(Object.prototype.hasOwnProperty.call(secondSave, 'tableDisplayedColumns')).toBeFalse();
    });
  }

  it('turns an explicit table-column reset into an empty stored column list', () => {
    const submitted: { tableDisplayedColumns?: boolean | unknown[] } = { tableDisplayedColumns: true };
    component.beforeSubmit(submitted);
    expect(submitted.tableDisplayedColumns).toEqual([]);
  });

  it('omits the table-column action when it was not selected', () => {
    const submitted: { tableDisplayedColumns?: boolean | unknown[] } = { tableDisplayedColumns: false };
    component.beforeSubmit(submitted);
    expect(Object.prototype.hasOwnProperty.call(submitted, 'tableDisplayedColumns')).toBeFalse();
  });
});
