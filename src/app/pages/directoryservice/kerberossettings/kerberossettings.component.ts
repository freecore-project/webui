import { T } from 'app/translate-marker';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FieldConfig } from '../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import helptext from '../../../helptext/directoryservice/kerberossettings';

@Component({
  standalone: false,
  selector: 'directoryservice-kerberossettings',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<entity-form [conf]="this"></entity-form>',
})

export class KerberosSettingsComponent {
  readonly settingsTitle = T('Kerberos Settings');
  protected queryCall = 'kerberos.config';
  protected addCall = 'kerberos.update';
  protected editCall = 'kerberos.update';

  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.ks_label,
      settingsLabel: T('Auxiliary parameters'),
      class: 'heading',
      label: true,
      config: [
        {
          type: 'textarea',
          name: helptext.ks_appdefaults_name,
          placeholder: helptext.ks_appdefaults_placeholder,
          tooltip: helptext.ks_appdefaults_tooltip,
        },
        {
          type: 'textarea',
          name: helptext.ks_libdefaults_name,
          placeholder: helptext.ks_libdefaults_placeholder,
          tooltip: helptext.ks_libdefaults_tooltip,
        },
      ],
    },
  ];

  resourceTransformIncomingRestData(data) {
    return data;
  }
}
