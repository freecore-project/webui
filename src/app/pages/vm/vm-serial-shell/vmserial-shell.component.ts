import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import helptext from '../../../helptext/vm/vm-cards/vm-cards';

/**
 * VM serial console. Migrated onto the redesigned terminal endpoint
 * (the internal development record phase 4); the terminal itself is now the shared
 * widget rather than a third hand-rolled copy of the same xterm wiring.
 */
@Component({
  selector: 'app-vmserial-shell',
  templateUrl: './vmserial-shell.component.html',
  styleUrls: ['./vmserial-shell.component.css'],
  })
export class VMSerialShellComponent implements OnInit {
  pk: number = undefined;
  tooltip = helptext.serial_shell_tooltip;

  constructor(protected aroute: ActivatedRoute) {}

  ngOnInit(): void {
    this.aroute.params.subscribe((params) => {
      const pk = Number(params['pk']);
      // A junk :pk gives NaN, which JSON-serializes to null and reads on the
      // far end as "no vm_id given" — i.e. an unusable URL would quietly hand
      // back a root shell instead of a serial console. Don't ask at all
      // unless we have a real id.
      this.pk = Number.isFinite(pk) ? pk : undefined;
    });
  }
}
