import { ApplicationRef, Component, Injector, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import * as _ from 'lodash';
import {
  FieldConfig,
} from '../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { T } from '../../../translate-marker';
import helptext from '../../../helptext/vm/vm-wizard/vm-wizard';
import globalHelptext from '../../../helptext/global-helptext';
import {
  WebSocketService, StorageService, VmService, ValidationService,
} from '../../../services';
import { Validators } from '@angular/forms';

@Component({
  standalone: false,
  selector: 'app-vm',
  template: '<entity-form [conf]="this"></entity-form>',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [StorageService],

})
export class VmFormComponent {
  protected queryCall = 'vm.query';
  protected editCall = 'vm.update';
  protected isEntity = true;
  protected route_success: string[] = ['vm'];
  protected entityForm: any;
  protected save_button_enabled = true;
  vcpus: number;
  cores: number;
  threads: number;
  protected queryCallOption: any[] = [];

  readonly settingsTitle = T('Virtual Machine'); // the internal development record: the page's h1
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.vm_settings_title,
      class: 'vm_settings',
      label: true,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'name',
          placeholder: helptext.name_placeholder,
          tooltip: helptext.name_tooltip,
        },
        {
          type: 'input',
          name: 'description',
          placeholder: helptext.description_placeholder,
          tooltip: helptext.description_tooltip,
        },
        {
          name: 'time',
          placeholder: helptext.time_placeholder,
          tooltip: helptext.time_tooltip,
          type: 'select',
          options: [{ label: helptext.time_local_text, value: 'LOCAL' }, { label: helptext.time_utc_text, value: 'UTC' }],
        },
        {
          type: 'select',
          name: 'bootloader',
          placeholder: helptext.bootloader_placeholder,
          tooltip: helptext.bootloader_tooltip,
          options: [],
        },
        {
          // the internal development record: shown, never editable. Disk images and firmware
          // variables are architecture-specific; the middleware refuses a change too.
          type: 'select',
          name: 'arch',
          placeholder: helptext.arch_placeholder,
          tooltip: helptext.arch_tooltip,
          options: [],
          disabled: true,
        },
        {
          type: 'input',
          name: 'shutdown_timeout',
          inputType: 'number',
          placeholder: helptext.shutdown_timeout.placeholder,
          tooltip: helptext.shutdown_timeout.tooltip,
          validation: helptext.shutdown_timeout.validation,
        },
        {
          type: 'checkbox',
          name: 'autostart',
          placeholder: helptext.autostart_placeholder,
          tooltip: helptext.autostart_tooltip,
        },
      ],
    },
    {
      name: 'spacer',
      class: 'spacer',
      label: false,
      width: '2%',
      config: [],
    },
    {
      name: helptext.vm_cpu_mem_title,
      class: 'vm_settings',
      label: true,
      width: '49%',
      config: [
        {
          type: 'input',
          name: 'vcpus',
          inputType: 'number',
          placeholder: helptext.vcpus_placeholder,
          tooltip: helptext.vcpus_tooltip,
          validation: [Validators.required, Validators.min(1), Validators.max(16), this.cpuValidator('threads')],
        },
        {
          type: 'input',
          name: 'cores',
          inputType: 'number',
          placeholder: helptext.cores.placeholder,
          tooltip: helptext.cores.tooltip,
          validation: [Validators.required, Validators.min(1), Validators.max(16), this.cpuValidator('threads')],
        },
        {
          type: 'input',
          name: 'threads',
          inputType: 'number',
          placeholder: helptext.threads.placeholder,
          tooltip: helptext.threads.tooltip,
          validation: [Validators.required, Validators.min(1), Validators.max(16), this.cpuValidator('threads')],
        },
        {
          type: 'input',
          name: 'memory',
          placeholder: `${helptext.memory_placeholder} ${globalHelptext.human_readable.suggestion_label}`,
          tooltip: helptext.memory_tooltip,
          blurStatus: true,
          blurEvent: this.blurEvent,
          parent: this,
        },

      ],
    },
  ];
  private bootloader: any;
  private currentBootloader: string;
  bootloader_type: any[];

  constructor(protected router: Router,
    protected ws: WebSocketService, protected storageService: StorageService,
    protected _injector: Injector, protected _appRef: ApplicationRef,
    protected vmService: VmService, protected route: ActivatedRoute) {}

  private setArchitectureOptions() {
    const arch = _.find(this.fieldConfig, { name: 'arch' });
    if (arch) {
      arch.options = this.vmService.getArchitectureLabels().map((item) => ({ label: item[1], value: item[0] }));
      arch.disabled = true;
    }
    const control = this.entityForm?.formGroup?.controls?.['arch'];
    if (control) {
      control.disable({ emitEvent: false });
    }
  }

  private setBootloaderOptions() {
    this.bootloader = this.bootloader || _.find(this.fieldConfig, { name: 'bootloader' });
    this.bootloader.options = this.vmService.getBootloaderOptions().map((item) => ({
      label: item[1],
      value: item[0],
    }));
  }

  private applyBootloaderPolicy() {
    const normalized = typeof this.currentBootloader === 'string'
      ? this.currentBootloader.trim().toUpperCase()
      : '';
    const unsupported = normalized === 'GRUB' || normalized === 'UEFI_CSM';
    this.bootloader.disabled = unsupported;
    this.bootloader.hasErrors = unsupported;
    this.bootloader.warnings = normalized === 'GRUB'
      ? T('This VM uses GRUB, which is unsupported in FreeCORE 15.1. It cannot be edited or started. '
        + 'Boot FreeCORE 15.0 to migrate it to ordinary UEFI, delete the VM record, or remain on 15.0.')
      : normalized === 'UEFI_CSM'
        ? T('This VM uses UEFI-CSM, which is unsupported in FreeCORE 15.1 because the required legacy '
          + 'firmware is not shipped. Boot FreeCORE 15.0 to verify its boot media and migrate the record '
          + 'to ordinary UEFI, or delete the VM record. No automatic conversion was performed.')
        : null;
    this.save_button_enabled = !unsupported;

    const control = this.entityForm?.formGroup?.controls?.['bootloader'];
    if (control) {
      if (unsupported) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }

  preInit(entityForm: any) {
    this.entityForm = entityForm;
    this.route.params.subscribe((params) => {
      if (params['pk']) {
        const opt = params.pk ? ['id', '=', parseInt(params.pk, 10)] : [];
        this.queryCallOption = [opt];
      }
    });
  }

  afterInit(entityForm: any) {
    this.entityForm = entityForm;
    this.setBootloaderOptions();
    this.applyBootloaderPolicy();
    this.setArchitectureOptions();

    entityForm.formGroup.controls['memory'].valueChanges.subscribe((value) => {
      const mem = _.find(this.fieldConfig, { name: 'memory' });
      if (typeof (value) === 'number') {
        value = value.toString();
      }
      const filteredValue = this.storageService.convertHumanStringToNum(value);
      mem['hasErrors'] = false;
      mem['errors'] = '';
      if (isNaN(filteredValue)) {
        mem['hasErrors'] = true;
        mem['errors'] = globalHelptext.human_readable.input_error;
      }
    });

    entityForm.formGroup.controls['vcpus'].valueChanges.subscribe((value) => {
      this.vcpus = value;
    });
    entityForm.formGroup.controls['cores'].valueChanges.subscribe((value) => {
      this.cores = value;
    });
    entityForm.formGroup.controls['threads'].valueChanges.subscribe((value) => {
      this.threads = value;
    });
  }

  blurEvent(parent) {
    if (parent.entityForm) {
      parent.entityForm.formGroup.controls['memory'].setValue(parent.storageService.humanReadable);
      const valString = (parent.entityForm.formGroup.controls['memory'].value);
      const valBytes = Math.round(parent.storageService.convertHumanStringToNum(valString) / 1048576);
      if (valBytes < 256) {
        const mem = _.find(parent.fieldConfig, { name: 'memory' });
        mem['hasErrors'] = true;
        mem['errors'] = helptext.memory_size_err;
      }
    }
  }

  cpuValidator(name: string) {
    const self = this;
    return function validCPU(control: UntypedFormControl) {
      const config = self.fieldConfig.find((c) => c.name === name);
      setTimeout(() => {
        const errors = self.vcpus * self.cores * self.threads > 16
          ? { validCPU: true }
          : null;

        if (errors) {
          config.hasErrors = true;
          config.warnings = T('The product of vCPUs, cores, and threads must not exceed 16.');
        } else {
          config.hasErrors = false;
          config.warnings = '';
        }
        return errors;
      }, 100);
    };
  }

  resourceTransformIncomingRestData(wsResponse) {
    this.currentBootloader = wsResponse['bootloader'];
    this.setBootloaderOptions();
    this.applyBootloaderPolicy();
    this.setArchitectureOptions();
    wsResponse['arch'] = wsResponse['arch'] || VmService.nativeArchitecture;
    wsResponse['memory'] = this.storageService.convertBytestoHumanReadable(wsResponse['memory'] * 1048576, 0);
    return wsResponse;
  }

  beforeSubmit(data) {
    if (data['memory'] !== undefined && data['memory'] !== null) {
      data['memory'] = Math.round(this.storageService.convertHumanStringToNum(data['memory']) / 1048576);
    }
  }
}
