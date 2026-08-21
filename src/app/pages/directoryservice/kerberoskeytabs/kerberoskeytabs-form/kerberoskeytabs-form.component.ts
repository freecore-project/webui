import { T } from 'app/translate-marker';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';

import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import helptext from '../../../../helptext/directoryservice/kerberoskeytabs-form-list';

@Component({
  standalone: false,
  selector: 'app-kerberos-keytbas-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})
export class KerberosKeytabsFormComponent {
  readonly settingsTitle = T('Kerberos Keytab'); // the internal development record: the object noun, add and edit alike

  protected addCall = 'kerberos.keytab.create';
  protected editCall = 'kerberos.keytab.update';
  protected queryCall = 'kerberos.keytab.query';
  protected pk: any;
  protected isNew = true;
  protected queryKey = 'id';
  protected route_success: string[] = ['directoryservice', 'kerberoskeytabs'];
  protected isEntity = true;

  protected fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.kkt_heading,
      class: 'heading',
      label: true,
      config: [
        {
          type: 'input',
          name: helptext.kkt_ktname_name,
          placeholder: helptext.kkt_ktname_placeholder,
          tooltip: helptext.kkt_ktname_tooltip,
          required: true,
          validation: helptext.kkt_ktname_validation,
        },
        {
          type: 'input',
          inputType: 'file',
          name: helptext.kkt_ktfile_name,
          placeholder: helptext.kkt_ktfile_placeholder,
          tooltip: helptext.kkt_ktfile_tooltip,
          fileType: 'binary',
          required: true,
          validation: helptext.kkt_ktfile_validation,
        },
      ],
    },
  ];

  constructor(private router: Router, protected aroute: ActivatedRoute) {}

  preInit() {
    this.aroute.params.subscribe((params) => {
      if (params.pk) {
        this.pk = parseInt(params.pk);
        this.isNew = false;
      }
    });
  }
}
