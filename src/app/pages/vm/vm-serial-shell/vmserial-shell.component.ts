import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import helptext from '../../../helptext/vm/vm-cards/vm-cards';
import { WebSocketService } from '../../../services';

/**
 * VM serial console. Migrated onto the redesigned terminal endpoint
 * (the internal development record phase 4); the terminal itself is now the shared
 * widget rather than a third hand-rolled copy of the same xterm wiring.
 *
 * the internal development record: the route carries the numeric id, so the page asks for
 * the VM's name once to title itself like the jail and application consoles
 * ('Shell: <name>'); until the answer lands the h1 shows the id.
 */
@Component({
  standalone: false,
  selector: 'app-vmserial-shell',
  templateUrl: './vmserial-shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class VMSerialShellComponent implements OnInit {
  pk: number = undefined;
  name: string;
  tooltip = helptext.serial_shell_tooltip;

  constructor(protected aroute: ActivatedRoute, private ws: WebSocketService) {}

  ngOnInit(): void {
    this.aroute.params.subscribe((params) => {
      const pk = Number(params['pk']);
      // A junk :pk gives NaN, which JSON-serializes to null and reads on the
      // far end as "no vm_id given" — i.e. an unusable URL would quietly hand
      // back a root shell instead of a serial console. Don't ask at all
      // unless we have a real id.
      this.pk = Number.isFinite(pk) ? pk : undefined;
      if (this.pk !== undefined) {
        this.ws.call('vm.query', [[['id', '=', this.pk]]]).subscribe((vms) => {
          this.name = vms?.[0]?.name;
        });
      }
    });
  }
}
