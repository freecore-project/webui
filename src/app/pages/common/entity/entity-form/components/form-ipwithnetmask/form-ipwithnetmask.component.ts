import {
  Component, Output, ViewChild, EventEmitter, OnInit, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { NetworkService } from '../../../../../../services';

@Component({
  standalone: false,
  selector: 'form-ipwithnetmask',
  templateUrl: './form-ipwithnetmask.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: [
    '../dynamic-field/dynamic-field.css',
    './form-ipwithnetmask-layout.css',
  ],
})
export class FormIpWithNetmaskComponent implements Field, OnInit, OnDestroy {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;

  address = '';

  /** the internal development record: the address input's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }
  netmask = '24';
  netmaskOptions = this.network.getV4Netmasks();
  value: string;
  netmaskPreset: number;

  private ipv6netmaskoptions = this.network.getV6PrefixLength();
  private ipv4netmaskoptions = this.network.getV4Netmasks();
  private valueSubscription: any;
  private control: any;

  constructor(public translate: TranslateService, private network: NetworkService) {
  }

  ngOnInit() {
    this.control = this.group.controls[this.config.name];
    this.valueSubscription = this.control.valueChanges.subscribe((res) => {
      this.setAddressAndNetmask(res);
    });
    if (this.control.value) {
      this.setAddressAndNetmask(this.control.value);
    }
  }

  ngOnDestroy() {
    this.valueSubscription.unsubscribe();
  }

  setAddress($event) {
    const address = $event.target.value;
    this.setAddressAndNetmask(address);
  }

  setNetmaskOptions() {
    if (this.address.indexOf(':') === -1) {
      this.netmaskOptions = this.ipv4netmaskoptions;
    } else {
      this.netmaskOptions = this.ipv6netmaskoptions;
    }
  }

  /** the internal development record: hlm-select emits the value itself, not a MatSelectChange. */
  setNetmask(value: string) {
    this.netmask = value;
    this.setValue();
  }

  setValue() {
    let value = this.address + '/' + this.netmask;
    if (this.address.trim() === '' || this.address === undefined) {
      value = '';
    }
    if (value !== this.value) {
      this.value = value;
      this.control.setValue(value);
    }
  }

  setAddressAndNetmask(value) {
    const strings = value.split('/');
    this.address = strings[0];
    if (strings.length > 1) {
      this.netmask = strings[1];
    } else if (this.config.netmaskPreset) {
      this.netmask = (this.config.netmaskPreset).toString();
    }
    this.setNetmaskOptions();
    this.setValue();
  }
}
