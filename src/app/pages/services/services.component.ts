import {
  Component, OnInit, ViewChild, ElementRef, Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { RestService, WebSocketService, IscsiService } from '../../services';
import { DialogService } from '../../services/dialog.service';

import * as _ from 'lodash';
import { T } from '../../translate-marker';

@Component({
  standalone: false,
  selector: 'services',
  styleUrls: ['./services.component.css'],
  templateUrl: './services.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [IscsiService],
})
export class Services implements OnInit {
  @ViewChild('filter', { static: true }) filter: ElementRef;
  @Input() searchTerm = '';
  @Input() cards = []; // Display List
  focusedVM: string;

  services: any[];
  busy: Subscription;
  productType = window.localStorage.getItem('product_type');

  name_MAP: Object = {
    afp: 'AFP',
    dynamicdns: 'Dynamic DNS',
    ftp: 'FTP',
    iscsitarget: 'iSCSI',
    lldp: 'LLDP',
    nfs: 'NFS',
    openvpn_client: 'OpenVPN Client',
    openvpn_server: 'OpenVPN Server',
    qemu_guest_agent: 'QEMU Guest Agent',
    rar2fs: 'rar2fs',
    rsync: 'Rsync',
    smartd: 'S.M.A.R.T.',
    snmp: 'SNMP',
    ssh: 'SSH',
    cifs: 'SMB',
    tftp: 'TFTP',
    ups: 'UPS',
    webdav: 'WebDAV',
    wireguard: 'WireGuard',
    wireguard_client: 'WireGuard Client',
  };

  /**
   * the internal development record: Configure rendered for every service but netdata, and
   * editService() falls through to /services/<name>. A service whose lifecycle is the
   * whole feature therefore inherited a button leading to a route that does not exist.
   * Naming the exceptions here keeps that a property of the service rather than another
   * name compared inline in the template.
   */
  lifecycleOnlyServices = ['qemu_guest_agent'];

  cache = [];
  showSpinner = true;
  // public viewValue: any;

  constructor(protected rest: RestService, protected ws: WebSocketService, protected router: Router,
    private dialog: DialogService, private iscsiService: IscsiService) {}

  parseResponse(data) {
    const card = {
      id: data.id,
      label: data.label,
      title: data.service,
      enable: data.enable,
      state: data.state,
      lazyLoaded: false,
      template: 'none',
      isNew: false,
      onChanging: false,
    };
    return card;
  }

  ngOnInit() {
    this.busy = this.ws.call('service.query', [
      [], { order_by: ['service'] },
    ])
      .subscribe((res) => {
        this.services = res;

        // nfs and webdav are hidden temporarily in SCALE, to be restored when ready
        const hidden = this.productType === 'SCALE' ? ['nfs', 'webdav', 'netdata'] : ['netdata'];
        this.services.forEach((item) => {
          if (!hidden.includes(item.service)) {
            if (this.name_MAP[item.service]) {
              item.label = this.name_MAP[item.service];
            } else {
              item.label = item.service;
            }
            const card = this.parseResponse(item);
            this.cards.push(card);
            this.cache.push(card);
          }
        });
        this.cards = _.sortBy(this.cards, [function (i) { return i.label.toLowerCase(); }]);
        this.cache = _.sortBy(this.cache, [function (i) { return i.label.toLowerCase(); }]);
        this.showSpinner = false;
      });
  }

  displayFilter(key, query ?) {
    if (query == '' || !query) {
      this.displayAll();
    } else {
      this.cards = this.cache.filter((card) => {
        const result = card[key].toLowerCase().replace(/[.]/g, '').replace(/[ ]/g, '')
          .indexOf(query.toLowerCase().replace(/[.]/g, '').replace(/[ ]/g, '')) > -1;
        return result;
      });
    }
  }

  displayAll() {
    this.cards = this.cache;
  }

  toggle(service: any) {
    let rpc: string;
    if (service.state != 'RUNNING') {
      rpc = 'service.start';
    } else {
      rpc = 'service.stop';
    }

    if (rpc === 'service.stop') {
      if (service.title == 'iscsitarget') {
        this.iscsiService.getGlobalSessions().subscribe(
          (res) => {
            const msg = res.length == 0 ? '' : T('<font color="red"> There are ') + res.length
              + T(' active iSCSI connections.</font><br>Stop the ' + service.label + ' service and close these connections?');
            this.dialog.confirm(T('Alert'), msg == '' ? T('Stop ') + service.label + '?' : msg, true, T('Stop')).subscribe((dialogRes) => {
              if (dialogRes) {
                this.updateService(rpc, service);
              }
            });
          },
        );
      } else {
        this.dialog.confirm(T('Alert'), T('Stop ') + service.label + '?', true, T('Stop')).subscribe((res) => {
          if (res) {
            this.updateService(rpc, service);
          }
        });
      }
    } else {
      this.updateService(rpc, service);
    }
  }

  updateService(rpc, service) {
    service['onChanging'] = true;
    this.busy = this.ws.call(rpc, [service.title]).subscribe((res) => {
      if (res) {
        if (service.state === 'RUNNING' && rpc === 'service.stop') {
          this.dialog.report(T('Service failed to stop'),
            this.name_MAP[service.title] + ' ' + T('service failed to stop.'));
        }
        service.state = 'RUNNING';
        service['onChanging'] = false;
      } else {
        if (service.state === 'STOPPED' && rpc === 'service.start') {
          this.dialog.report(T('Service failed to start'),
            this.name_MAP[service.title] + ' ' + T('service failed to start.'));
        }
        service.state = 'STOPPED';
        service['onChanging'] = false;
      }
    }, (res) => {
      let message = T('Error starting service ');
      if (rpc === 'service.stop') {
        message = T('Error stopping service ');
      }
      this.dialog.errorReport(message + this.name_MAP[service.title], res.message, res.stack);
      service['onChanging'] = false;
    });
  }

  enableToggle($event: any, service: any) {
    this.busy = this.ws
      .call('service.update', [service.id, { enable: service.enable }])
      .subscribe((res) => {
        if (!res) {
          service.enable = !service.enable;
        }
      });
  }

  isConfigurable(service: string): boolean {
    return service !== 'netdata' && !this.lifecycleOnlyServices.includes(service);
  }

  editService(service: any) {
    // The guard belongs here as well as on the button: the fallback below navigates to
    // /services/<name> for anything it does not recognise, so a service with no page
    // has to be refused by the behaviour, not only hidden in the template. It tests
    // lifecycle-only, not isConfigurable -- netdata has no Configure button but its
    // Launch button reaches this same method and does have somewhere to go.
    if (this.lifecycleOnlyServices.includes(service)) { return; }
    if (service === 'iscsitarget') {
      // iscsi target global config route
      const route = ['sharing', 'iscsi'];
      this.router.navigate(new Array('').concat(route));
    } else if (service === 'cifs') {
      this.router.navigate(new Array('').concat(['services', 'smb']));
    } else {
      // Determines the route path
      this.router.navigate(new Array('').concat(['services', service]));
    }
  }

  openNetdataPortal() {
    window.open('/netdata/');
  }
}
