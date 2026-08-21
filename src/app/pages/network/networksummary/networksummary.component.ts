import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { WebSocketService, DialogService } from '../../../services';
import { TranslateService } from '@ngx-translate/core';
import { EntityUtils } from '../../common/entity/utils';

@Component({
  standalone: false,
  selector: 'app-networksummary',
  templateUrl: './networksummary.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./networksummary.component.css'],
})
export class NetworkSummaryComponent implements OnInit {
  ips: any = {};
  ipSize = 0;
  default_routes: any[] = [];
  nameservers: any[] = [];
  queryCall = 'network.general.summary';

  constructor(private ws: WebSocketService, public translate: TranslateService, protected dialogService: DialogService) {}

  ngOnInit() {
    this.ws.call(this.queryCall, []).subscribe(
      (res) => {
        this.ips = res.ips || {};
        this.ipSize = Object.keys(this.ips).length;
        this.default_routes = res.default_routes || [];
        this.nameservers = res.nameservers || [];
      },
      (err) => {
        new EntityUtils().handleWSError(this, err, this.dialogService);
      },
    );
  }
}
