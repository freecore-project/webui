import {
  Component, Input, OnChanges, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { EntityTableComponent } from 'app/pages/common/entity/entity-table';
import { TaskService } from 'app/services';

@Component({
  standalone: false,
  selector: 'app-task-schedule-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  // the internal development record: the widget menu's content on the M1 vocabulary -- the heading in the
  // menu-label voice on a hairline, the runs as plain 32px rows (not menu items: nothing to act on).
  template: `
    <hlm-dropdown-menu-label>{{ 'Upcoming tasks' | translate }}</hlm-dropdown-menu-label>
    <hlm-dropdown-menu-separator />
    @for (run of futureRuns; track run) {
      <div class="task-run">{{ run }}</div>
    }
    `,
  styles: [`
    .task-run {
      font-size: 13px;
      line-height: 32px;
      height: 32px;
      padding: 0 12px;
      white-space: nowrap;
    }
  `],
})
export class TaskScheduleListComponent implements OnInit, OnChanges {
  private static readonly LIST_LENGTH = 5;
  @Input() value: string;
  @Input() config: { schedule?: string; cron_schedule?: string; cron?: string; scrub_schedule?: string };
  @Input() parent: EntityTableComponent & { conf: any };

  futureRuns: string[];

  constructor(private _taskService: TaskService) {}

  ngOnInit(): void {
    this._buildFutureRuns();
  }

  ngOnChanges(): void {
    this._buildFutureRuns();
  }

  private _buildFutureRuns(): void {
    const scheduleExpression = this.config.cron_schedule || this.config.cron || this.config.scrub_schedule || this.config.schedule;

    if (scheduleExpression != 'Disabled') {
      this.futureRuns = this._taskService
        .getTaskNextRuns(scheduleExpression, TaskScheduleListComponent.LIST_LENGTH)
        .map((run) => run.toLocaleString());
    }
  }
}
