import { Component, OnInit } from '@angular/core';
import { WebSocketService, DialogService, AppLoaderService } from 'app/services/';
import { WebauthnService } from 'app/services/webauthn.service';
import { helptext } from 'app/helptext/system/webauthn';
import { DialogFormConfiguration } from '../../common/entity/entity-dialog/dialog-form-configuration.interface';
import { EntityUtils } from '../../common/entity/utils';

@Component({
  selector: 'app-webauthn-keys',
  templateUrl: './webauthn.component.html',
})
export class WebauthnComponent implements OnInit {
  helptext = helptext.webauthn;
  config: any = { enabled: false };
  credentials: any[] = [];
  browserOk = true;
  loading = true;
  twoFactorEnabled = false;

  constructor(
    private ws: WebSocketService,
    private dialogService: DialogService,
    private loader: AppLoaderService,
    private webauthnService: WebauthnService,
  ) {}

  ngOnInit() {
    this.browserOk = this.webauthnService.available();
    this.refresh();
  }

  refresh() {
    this.ws.call('auth.webauthn.config').subscribe((config) => {
      this.config = config;
    });
    this.ws.call('auth.webauthn.credentials').subscribe((credentials) => {
      this.credentials = credentials;
      this.loading = false;
    });
    this.ws.call('auth.twofactor.config').subscribe((twofactor) => {
      this.twoFactorEnabled = twofactor.enabled;
    });
  }

  addKey() {
    const self = this;
    const conf: DialogFormConfiguration = {
      title: helptext.webauthn.add_dialog.title,
      fieldConfig: [
        {
          type: 'input',
          name: 'name',
          placeholder: helptext.webauthn.add_dialog.name_placeholder,
          tooltip: helptext.webauthn.add_dialog.name_tooltip,
          required: true,
        },
      ],
      saveButtonText: helptext.webauthn.add_dialog.submit,
      customSubmit(entityDialog) {
        const name = entityDialog.formValue.name;
        entityDialog.dialogRef.close(true);
        self.loader.open();
        self.webauthnService.register(name).subscribe(
          () => {
            self.loader.close();
            self.refresh();
          },
          (err) => {
            self.loader.close();
            self.handleError(err);
          },
        );
      },
    };
    this.dialogService.dialogForm(conf);
  }

  deleteKey(credential) {
    this.dialogService.confirm(
      helptext.webauthn.delete_dialog.title,
      helptext.webauthn.delete_dialog.message + '"' + credential.name + '"?',
    ).subscribe((res) => {
      if (!res) {
        return;
      }
      this.loader.open();
      this.ws.call('auth.webauthn.delete_credential', [credential.id]).subscribe(
        () => {
          this.loader.close();
          this.refresh();
        },
        (err) => {
          this.loader.close();
          this.handleError(err);
        },
      );
    });
  }

  toggleEnabled() {
    const enabling = !this.config.enabled;
    const dialog = enabling ? helptext.webauthn.enable_dialog : helptext.webauthn.disable_dialog;
    this.dialogService.confirm(dialog.title, dialog.message).subscribe((res) => {
      if (!res) {
        return;
      }
      this.loader.open();
      this.ws.call('auth.webauthn.update', [{ enabled: enabling }]).subscribe(
        () => {
          this.loader.close();
          this.refresh();
        },
        (err) => {
          this.loader.close();
          this.handleError(err);
        },
      );
    });
  }

  handleError(err) {
    if (err && err.name === 'NotAllowedError') {
      this.dialogService.errorReport(helptext.webauthn.errors.title, helptext.webauthn.errors.cancelled);
      return;
    }
    if (err && err.name === 'InvalidStateError') {
      this.dialogService.errorReport(helptext.webauthn.errors.title, helptext.webauthn.errors.already_enrolled);
      return;
    }
    new EntityUtils().handleWSError(this, err, this.dialogService);
  }
}
