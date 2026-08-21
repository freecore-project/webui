import { T } from 'app/translate-marker';
import { ApplicationRef, Component, Injector, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { helptext_system_bootenv } from 'app/helptext/system/bootenv';
import * as _ from 'lodash';
import { RestService, WebSocketService } from '../../../../services';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';

@Component({
  standalone: false,
  selector: 'bootenv-replace-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})

export class BootEnvReplaceFormComponent {
  settingsTitle = T('Boot Device'); // the internal development record: the object noun; the verb is on the button
  saveSubmitText = T('Replace');
  protected route_success: string[] = ['system', 'boot', 'status'];
  protected isEntity = true;
  protected addCall = 'boot.replace';
  protected pk: any;
  protected isNew = true;

  protected entityForm: any;

  fieldConfig: FieldConfig[] = [
    {
      type: 'select',
      name: 'dev',
      placeholder: helptext_system_bootenv.replace_name_placeholder,
      options: [],
    },

  ];
  protected diskChoice: any;

  constructor(protected router: Router, protected route: ActivatedRoute,
    protected rest: RestService, protected ws: WebSocketService,
    protected _injector: Injector, protected _appRef: ApplicationRef) {}

  preInit(entityForm: any) {
    this.route.params.subscribe((params) => {
      this.pk = params['pk'];
    });
    this.entityForm = entityForm;
  }

  afterInit(entityForm: any) {
    this.entityForm = entityForm;
    this.diskChoice = _.find(this.fieldConfig, { name: 'dev' });
    this.ws.call('disk.get_unused').subscribe((res) => {
      res.forEach((item) => {
        this.diskChoice.options.push({ label: item.name, value: item.name });
      });
    });
    entityForm.submitFunction = this.submitFunction;
  }
  submitFunction(entityForm) {
    return this.ws.call('boot.replace', [this.pk, entityForm.dev]);
  }
}
