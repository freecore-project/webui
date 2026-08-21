import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { EntityAction, EntityRowDetails } from './entity-row-details.interface';

@Component({
  standalone: false,
  selector: 'app-entity-row-details',
  styles: [
    `
      p,
      h4,
      mat-icon {
        color: var(--fg2) !important;
      }

      .button-delete span,
      .button-delete mat-icon {
        color: var(--red) !important;
      }
    `,
  ],
  templateUrl: './entity-row-details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-row-details.component.css'],
})
export class EntityRowDetailsComponent {
  @Input() conf: EntityRowDetails;

  isActionVisible(action: EntityAction): boolean {
    return this.conf.isActionVisible ? this.conf.isActionVisible(action.id, this.conf.config) : true;
  }
}
