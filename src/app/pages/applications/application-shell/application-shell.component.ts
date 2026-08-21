import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import helptext from '../../../helptext/shell/shell';
import { WebTerminalTarget } from '../../../services/web-terminal.service';

/**
 * Shell inside a running application's container (the internal development record,
 * the internal development record). The same page as the iocage jail console: the
 * terminal widget owns the socket; this component only names the target and
 * goes back to the Applications page when the session ends.
 */
@Component({
  standalone: false,
  selector: 'app-application-shell',
  templateUrl: './application-shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ApplicationShellComponent implements OnInit {
  name: string;
  target: WebTerminalTarget;
  tooltip = helptext.usage_tooltip;

  protected route_success: string[] = ['applications'];

  constructor(protected aroute: ActivatedRoute, protected router: Router) {}

  ngOnInit(): void {
    this.aroute.params.subscribe((params) => {
      this.name = params['name'];
      this.target = { application: this.name };
    });
  }

  onEnded(): void {
    this.router.navigate(new Array('/').concat(this.route_success));
  }
}
