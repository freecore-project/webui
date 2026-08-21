import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import helptext from '../../../helptext/shell/shell';
import { WebTerminalTarget } from '../../../services/web-terminal.service';

/**
 * Jail console. Migrated onto the redesigned terminal endpoint
 * (the internal development record phase 4) — this page used to carry its own copy of
 * the xterm setup, its own socket wiring, and a `_.trim(value) == 'logout'`
 * check against the raw output stream to decide the session had ended.
 *
 * All of that is now the terminal widget's problem, and "the session ended"
 * is a socket event rather than a guess about what the pty printed.
 */
@Component({
  standalone: false,
  selector: 'app-jail-shell',
  templateUrl: './jail-shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class JailShellComponent implements OnInit {
  pk: string;
  target: WebTerminalTarget;
  tooltip = helptext.usage_tooltip;

  protected route_success: string[] = ['jails'];

  constructor(protected aroute: ActivatedRoute, protected router: Router) {}

  ngOnInit(): void {
    // the internal development record: this console is iocage's only; a Bastille jail is
    // reached with `bastille console` on the host.
    this.aroute.params.subscribe((params) => {
      this.pk = params['pk'];
      this.target = { jail: this.pk };
      this.route_success = ['jails'];
    });
  }

  onEnded(): void {
    this.router.navigate(new Array('/').concat(this.route_success));
  }
}
