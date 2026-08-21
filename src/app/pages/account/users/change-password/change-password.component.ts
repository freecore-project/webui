import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { WebSocketService, DialogService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from '../../../common/entity/entity-form/models/fieldset.interface';
import helptext from '../../../../helptext/account/user-change-pw';
import { EntityUtils } from '../../../common/entity/utils';
import { T } from 'app/translate-marker';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})
export class ChangePasswordComponent {
  // protected resource_name = 'account/users/1/password/';
  protected isEntity = true;
  protected entityForm: any;

  readonly settingsTitle = T('Administrator Password'); // the internal development record: the page's h1
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.pw_form_title_name,
      class: helptext.pw_form_title_class,
      label: true,
      settingsLabel: T('General'), // the internal development record: the set's name repeats or paraphrases the page's h1
      config: [
        {
          type: 'input',
          name: 'curr_password',
          placeholder: helptext.pw_current_pw_placeholder,
          inputType: 'password',
          required: true,
          togglePw: true,
        },
        {
          type: 'input',
          name: 'password',
          placeholder: helptext.pw_new_pw_placeholder,
          inputType: 'password',
          required: true,
          tooltip: helptext.pw_new_pw_tooltip,
        },
        {
          type: 'input',
          name: 'password_conf',
          placeholder: helptext.pw_confirm_pw_placeholder,
          inputType: 'password',
          required: true,
          validation: helptext.pw_confirm_pw_validation,
        },
      ],
    }];

  constructor(protected ws: WebSocketService, protected router: Router,
    protected loader: AppLoaderService, protected dialog: DialogService) {
  }

  preInit(entityForm) {
    this.entityForm = entityForm;
  }

  customSubmit(body) {
    delete body.password_conf;
    this.loader.open();
    return this.ws.call('auth.check_user', ['root', body.curr_password]).subscribe((check) => {
      if (check) {
        delete body.curr_password;
        this.ws.call('user.update', [1, body]).subscribe((res) => {
          this.loader.close();
          this.entityForm.success = true;
          this.entityForm.successMessage = helptext.pw_updated;
          this.entityForm.formGroup.markAsPristine();
        }, (res) => {
          this.loader.close();
          new EntityUtils().handleWSError(this.entityForm, res);
        });
      } else {
        this.loader.close();
        this.dialog.report(helptext.pw_invalid_title, helptext.pw_invalid_msg, '300px', 'warning', true);
      }
    }, (res) => {
      this.loader.close();
      new EntityUtils().handleWSError(this.entityForm, res);
    });
  }
}
