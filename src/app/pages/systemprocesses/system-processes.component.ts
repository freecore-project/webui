import { Component } from '@angular/core';

/**
 * System Processes. Migrated onto the redesigned terminal endpoint
 * (the internal development record phase 4).
 *
 * This page used to open a full interactive root login shell, type `top` into
 * it after a one-second timer, and then set xterm's `disableStdin` — so the
 * only thing standing between this monitoring page and a root prompt was the
 * client politely declining to send keystrokes. It now asks the endpoint for
 * `top` directly, and the endpoint discards client input on this target, so
 * the page is a viewer on both ends rather than by convention.
 */
@Component({
  selector: 'app-system-processes',
  templateUrl: './system-processes.component.html',
  })
export class SystemProcessesComponent {}
