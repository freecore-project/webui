import { ApplicationRef, Component, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import helptext from '../../../../helptext/services/components/service-rar2fs';
import { RestService, WebSocketService } from '../../../../services';

@Component({
  selector: 'rar2fs-edit',
  template: '<entity-form [conf]="this"></entity-form>',
})
export class ServiceRar2fsComponent {
  protected queryCall = 'rar2fs.config';
  protected route_success: string[] = ['services'];

  fieldSets: FieldSet[] = [
    {
      name: helptext.rar2fs_fieldset_general,
      label: true,
      config: [
        {
          type: 'input',
          name: 'source',
          placeholder: helptext.rar2fs_source_placeholder,
          tooltip: helptext.rar2fs_source_tooltip,
          required: true,
        },
        {
          type: 'input',
          name: 'mountpoint',
          placeholder: helptext.rar2fs_mountpoint_placeholder,
          tooltip: helptext.rar2fs_mountpoint_tooltip,
          required: true,
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'seek_length',
          placeholder: helptext.rar2fs_seek_length_placeholder,
          tooltip: helptext.rar2fs_seek_length_tooltip,
          validation: helptext.rar2fs_seek_length_validation,
        },
        {
          type: 'checkbox',
          name: 'allow_other',
          placeholder: helptext.rar2fs_allow_other_placeholder,
          tooltip: helptext.rar2fs_allow_other_tooltip,
        },
        {
          type: 'checkbox',
          name: 'create_mountpoint',
          placeholder: helptext.rar2fs_create_mountpoint_placeholder,
          tooltip: helptext.rar2fs_create_mountpoint_tooltip,
        },
      ],
    },
    {
      name: helptext.rar2fs_fieldset_advanced,
      label: true,
      config: [
        {
          type: 'textarea',
          name: 'extra_options',
          placeholder: helptext.rar2fs_extra_options_placeholder,
          tooltip: helptext.rar2fs_extra_options_tooltip,
        },
      ],
    },
  ];

  constructor(
    protected router: Router,
    protected route: ActivatedRoute,
    protected rest: RestService,
    protected ws: WebSocketService,
    protected _injector: Injector,
    protected _appRef: ApplicationRef,
  ) {}

  afterInit(entityEdit: EntityFormComponent) {
    entityEdit.submitFunction = (body) => this.ws.call('rar2fs.update', [body]);
  }
}
