import { Component, OnInit } from '@angular/core';
import { WebSocketService } from '../../../services';
import { helptext_system_support as helptext } from 'app/helptext/system/support';

// the internal development record: reduced to the system-information panel.
//
// Gone with the ticket-submission surface: the enterprise licence/contract
// fields (getTNSysInfo, daysTillExpiration) and the product-image lookups
// (getTrueNASImage / getFreeNASImage / isRackmount), whose default branch was
// `ix-original.png` -- the iXsystems logo the internal development record removed from the topbar but not
// from here. All of them only fed markup that no longer exists.
//
// Also gone: the `product_type` branch. It was read from localStorage, which is
// undefined on a browser that has never logged in, so the page fell through to
// the ENTERPRISE variant -- the same latent bug fixed in the internal development record. This fork is
// CORE-only, so the CORE panel now renders unconditionally.
@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  providers: [],
})
export class SupportComponent implements OnInit {
  FN_version;
  FN_model;
  FN_memory;
  FN_serial;
  FN_instructions;

  constructor(protected ws: WebSocketService) {}

  ngOnInit() {
    this.ws.call('system.info').subscribe((res) => {
      this.FN_version = res.version;
      this.FN_model = res.system_product;
      this.FN_memory = (res.physmem / 1024 / 1024 / 1024).toFixed(0) + ' GiB';
      this.FN_serial = res.system_serial ? res.system_serial : '';
      this.FN_instructions = helptext.FN_instructions;
    });
  }
}
