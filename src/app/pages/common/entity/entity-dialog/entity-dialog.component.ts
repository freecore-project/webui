import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { EntityFormService } from '../entity-form/services/entity-form.service';
import { FieldRelationService } from '../entity-form/services/field-relation.service';
import { FieldConfig } from '../entity-form/models/field-config.interface';
import { UntypedFormGroup } from '@angular/forms';
import { RestService } from '../../../../services/rest.service';
import { WebSocketService } from '../../../../services/ws.service';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { EntityUtils } from '../utils';
import * as _ from 'lodash';
import { DialogFormConfiguration } from './dialog-form-configuration.interface';
import { DatePipe } from '@angular/common';
import { T } from '../../../../translate-marker';

@Component({
  standalone: false,
  selector: 'app-entity-dialog',
  host: { '[class.fc-settings-dialog]': 'conf?.settingsStyle' },
  templateUrl: './entity-dialog.component.html',
  styleUrls: ['../entity-form/components/dynamic-field/dynamic-field.css', './entity-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [EntityFormService, DatePipe, FieldRelationService],
})
export class EntityDialogComponent implements OnInit {
  @Input() conf: DialogFormConfiguration;

  title: string;
  warning: string;
  fieldConfig: FieldConfig[] ;
  formGroup: UntypedFormGroup;
  saveButtonText: string;
  cancelButtonText = 'Cancel';
  detachButtonText: string;
  getKeyButtonText: string;
  error: string;
  formValue: any;
  parent: any;
  submitEnabled = true;
  instructions: string;
  confirmCheckbox = false;

  constructor(public dialogRef: MatDialogRef < EntityDialogComponent >,
    protected translate: TranslateService,
    protected entityFormService: EntityFormService,
    protected rest: RestService,
    protected ws: WebSocketService,
    protected loader: AppLoaderService,
    public mdDialog: MatDialog,
    public datePipe: DatePipe,
    protected fieldRelationService: FieldRelationService) {}

  ngOnInit() {
    this.translate.get(this.conf.title).subscribe((title) => {
      this.title = title;
    });

    this.fieldConfig = this.conf.fieldConfig;

    if (this.conf.parent) {
      this.parent = this.conf.parent;
    }

    if (this.conf.confirmCheckbox) {
      this.confirmCheckbox = this.conf.confirmCheckbox;
      this.submitEnabled = false;
    }
    if (this.conf.preInit) {
      this.conf.preInit(this);
    }

    if (this.conf.saveButtonText) {
      this.saveButtonText = this.conf.saveButtonText;
    }
    if (this.conf.cancelButtonText) {
      this.cancelButtonText = this.conf.cancelButtonText;
    }
    this.formGroup = this.entityFormService.createFormGroup(this.fieldConfig);

    for (const i in this.fieldConfig) {
      const config = this.fieldConfig[i];
      if (config.relation.length > 0) {
        this.fieldRelationService.setRelation(config, this.formGroup, this.fieldConfig);
      }
    }

    if (this.conf.afterInit) {
      this.conf.afterInit(this);
    }
    this.instructions = T(`Enter <strong>${this.conf['name']}</strong> below to confirm.`);
  }

  submit() {
    this.clearErrors();
    this.formValue = _.cloneDeep(this.formGroup.value);

    if (this.conf.customSubmit) {
      this.conf.customSubmit(this);
    } else {
      this.loader.open();
      this.ws.call(this.conf.method_ws, [this.formValue]).subscribe(
        () => {},
        (e) => {
          this.loader.close();
          this.dialogRef.close(false);
          new EntityUtils().handleWSError(this, e);
        },
        () => {
          this.loader.close();
          this.dialogRef.close(true);
        },
      );
    }
  }

  cancel() {
    this.dialogRef.close(false);
    this.clearErrors();
  }

  clearErrors() {
    this.error = null;
    for (let f = 0; f < this.fieldConfig.length; f++) {
      this.fieldConfig[f]['errors'] = '';
      this.fieldConfig[f]['hasErrors'] = false;
    }
  }

  setDisabled(name: string, disable: boolean, hide?: boolean, status?: string) {
    // if field is hidden, disable it too
    if (hide) {
      disable = hide;
    } else {
      hide = false;
    }

    this.fieldConfig = this.fieldConfig.map((item) => {
      if (item.name === name) {
        item.disabled = disable;
        item['isHidden'] = hide;
      }
      return item;
    });

    if (this.formGroup.controls[name]) {
      const method = disable ? 'disable' : 'enable';
      this.formGroup.controls[name][method]();
    }
  }

  toggleSubmit(checked: boolean) {
    this.submitEnabled = checked;
  }
}
