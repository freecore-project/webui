import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import helptext from '../../../helptext/shell/shell';

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
  selector: 'app-jail-shell',
  templateUrl: './jail-shell.component.html',
  styleUrls: ['./jail-shell.component.css'],
  })
export class JailShellComponent implements OnInit {
  pk: string;
  tooltip = helptext.usage_tooltip;

  protected route_success: string[] = ['jails'];

  constructor(protected aroute: ActivatedRoute, protected router: Router) {}

  ngOnInit(): void {
    this.aroute.params.subscribe((params) => {
      this.pk = params['pk'];
    });
  }

  onEnded(): void {
    this.router.navigate(new Array('/').concat(this.route_success));
  }
}
