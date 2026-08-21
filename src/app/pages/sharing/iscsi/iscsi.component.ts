import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { IscsiService } from 'app/services';
import { T } from 'app/translate-marker';

@Component({
  standalone: false,
  selector: 'iscsi',
  templateUrl: './iscsi.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [IscsiService],
})
export class ISCSI implements OnInit {
  activedTab = 'configuration';
  navLinks: any[] = [{
    label: T('Target Global Configuration'),
    path: '/sharing/iscsi/configuration',
  },
  {
    label: T('Portals'),
    path: '/sharing/iscsi/portals',
  },
  {
    label: T('Initiators Groups'),
    path: '/sharing/iscsi/initiator',
  },
  {
    label: T('Authorized Access'),
    path: '/sharing/iscsi/auth',
  },
  {
    label: T('Targets'),
    path: '/sharing/iscsi/target',
  },
  {
    label: T('Extents'),
    path: '/sharing/iscsi/extent',
  },
  {
    label: T('Associated Targets'),
    path: '/sharing/iscsi/associatedtarget',
  },
  ];
  protected route_wizard = ['sharing', 'iscsi', 'wizard'];
  // Fibre Channel is licence-gated and its pages were removed with the backend stub
  // (the internal development record); it can never be enabled here.  Kept because <app-iscsi-target-list>
  // takes it as an @Input to decide whether to show the Mode column.
  fcEnabled = false;
  constructor(protected router: Router, protected aroute: ActivatedRoute) {}

  ngOnInit() {
    this.aroute.params.subscribe((params) => {
      this.activedTab = params['pk'];
    });
  }

  gotoWizard() {
    this.router.navigate(new Array('/').concat(this.route_wizard));
  }
}
