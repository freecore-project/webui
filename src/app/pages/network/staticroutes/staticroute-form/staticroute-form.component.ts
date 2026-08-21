import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { ipv4or6Validator } from 'app/pages/common/entity/entity-form/validators/ip-validation';
import helptext from '../../../../helptext/network/staticroutes/staticroutes';
import { NetworkService, RestService, WebSocketService } from '../../../../services';
import { T } from 'app/translate-marker';

@Component({
  standalone: false,
  selector: 'app-staticroute-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})
export class StaticRouteFormComponent {
  protected queryCall = 'staticroute.query';
  protected queryKey = 'id';
  protected addCall = 'staticroute.create';
  protected editCall = 'staticroute.update';

  protected route_success: string[] = ['network', 'staticroutes'];
  protected isEntity = true;

  readonly settingsTitle = T('Static Route'); // the internal development record: the page's h1
  protected fieldSets: FieldSet[] = [
    {
      name: helptext.sr_fieldset_general,
      label: true,
      settingsLabel: T('General'), // the internal development record: the set's name repeats or paraphrases the page's h1
      config: [
        {
          type: 'input',
          name: 'destination',
          placeholder: helptext.sr_destination_placeholder,
          tooltip: helptext.sr_destination_tooltip,
          required: true,
          validation: helptext.sr_destination_validation,
        },
        {
          type: 'input',
          name: 'gateway',
          placeholder: helptext.sr_gateway_placeholder,
          tooltip: helptext.sr_gateway_tooltip,
          required: true,
          validation: [ipv4or6Validator('gateway')],
        },
        {
          type: 'input',
          name: 'description',
          placeholder: helptext.sr_description_placeholder,
          tooltip: helptext.sr_description_tooltip,
        },
      ],
    },
  ];

  constructor(protected router: Router, protected rest: RestService,
    protected ws: WebSocketService,
    protected networkService: NetworkService) {}
}
