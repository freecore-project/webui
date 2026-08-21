import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DialogService, WebSocketService } from '../../services';
import helptext from '../../helptext/shell/shell';

/**
 * The root shell page (the internal development record phase 3).
 *
 * This is the one part of the web terminal that is a genuinely new
 * capability, so it is the one part behind `system.webterminal.enabled` —
 * off until someone turns it on, per rule 5. The jail console, the VM serial
 * console and System Processes are pre-existing pages and are not gated.
 *
 * The toggle is deliberately offered here rather than buried in a services
 * list: "click-to-enable in webui" is the requirement, and a feature nobody
 * can find is not opt-in, it is just missing.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  })
export class ShellComponent implements OnInit {
  enabled: boolean = undefined;
  loading = true;
  tooltip = helptext.usage_tooltip;

  constructor(
    private ws: WebSocketService,
    private dialogService: DialogService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.loading = true;
    this.ws.call('system.webterminal.config').subscribe(
      (config) => {
        this.enabled = config?.enabled === true;
        this.loading = false;
      },
      (error) => {
        this.loading = false;
        this.dialogService.errorReport(
          this.translate.instant('Shell'),
          this.translate.instant('Could not read the web terminal configuration.'),
          error?.reason || error?.message,
        );
      },
    );
  }

  enable(): void {
    this.dialogService.confirm({
      title: this.translate.instant('Enable Shell'),
      message: this.translate.instant(
        'This opens a root command prompt in the browser for anyone who can sign in to this web \
interface. It is off by default for that reason. Commands run here are logged, and the shell can \
be turned off again at any time.',
      ),
      buttonMsg: this.translate.instant('Enable'),
      hideCheckBox: true,
    }).subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      this.ws.call('system.webterminal.update', [{ enabled: true }]).subscribe(
        () => this.enabled = true,
        (error) => this.dialogService.errorReport(
          this.translate.instant('Shell'),
          this.translate.instant('Could not enable the web terminal.'),
          error?.reason || error?.message,
        ),
      );
    });
  }
}
