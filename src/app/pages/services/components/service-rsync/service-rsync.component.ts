import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import * as _ from 'lodash';

@Component({
  standalone: false,
  selector: 'app-rsync',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './service-rsync.component.html',
})
export class ServiceRSYNCComponent implements OnInit {
  @ViewChild('tabGroup', { static: true }) tabGroup;

  activedTab = 'configure';
  navLinks: any[] = [{
    label: 'Configure',
    path: '/services/rsync/configure',
  },
  {
    label: 'Rsync Module',
    path: '/services/rsync/rsync-module',
  },
  ];
  constructor(protected router: Router, protected aroute: ActivatedRoute) {}

  ngOnInit() {
    this.aroute.params.subscribe((params) => {
      this.activedTab = params['pk'];
    });
  }
}
