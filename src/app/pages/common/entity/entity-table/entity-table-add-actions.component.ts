import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { RestService } from '../../../../services/rest.service';

import { EntityTableComponent } from './entity-table.component';
import { EntityTableService } from 'app/pages/common/entity/entity-table/entity-table.service';

@Component({
  standalone: false,
  selector: 'app-entity-table-add-actions',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './entity-table-add-actions.component.html',
})
export class EntityTableAddActionsComponent implements OnInit {
  @Input('entity') entity: any;

  actions: any[];
  menuTriggerMessage = 'Click for options';
  /** the internal development record: the #353 tier -- outline in a list toolbar, default (the page's one
   * primary) when a page hosts the control on its own. the internal development record: Storage > Pools, the one
   * page that took `default`, hosts it in the shell's .fc-page-header on `outline` -- a status page's
   * Add is a header action, not the page's primary; no caller passes `default` today. */
  @Input() variant: 'outline' | 'default' = 'outline';

  spin = true;
  direction = 'left';
  animationMode = 'fling';
  get totalActions() {
    const addAction = this.entity.conf.route_add ? 1 : 0;
    return this.actions.length + addAction;
  }

  constructor(protected translate: TranslateService, private entityTableService: EntityTableService) { }

  ngOnInit() {
    this.actions = this.entity.getAddActions();

    this.entityTableService.addActionsUpdater$.subscribe((actions: any) => {
      this.actions = actions;
    });
  }
}
