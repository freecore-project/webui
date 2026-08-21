import { Component, Input } from '@angular/core';

// the internal development record: this is now a pure display panel. updateLicense() and its
// system.license_update dialog went with the ENTER LICENSE button -- enterprise
// licensing has no meaning in this fork (the internal development record / the internal development record), which is
// also why the websocket/loader/dialog injections are gone.
@Component({
  selector: 'app-fn-sys-info',
  templateUrl: './fn-sys-info.component.html',
})
export class FnSysInfoComponent {
  @Input() FN_version;
  @Input() FN_model;
  @Input() FN_memory;
  @Input() FN_serial;
  @Input() FN_instructions;
}
