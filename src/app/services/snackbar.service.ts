import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarConfig as MatSnackBarConfig } from '@angular/material/legacy-snack-bar';

import { EntitySnackbarComponent } from 'app/pages/common/entity/entity-snackbar/entity-snackbar.component';

@Injectable({
  providedIn: 'root',
  })

export class SnackbarService {
  constructor(private snackbar: MatSnackBar) { }

  open(message: string, action?: string, config?: MatSnackBarConfig) {
    EntitySnackbarComponent.message = message;
    EntitySnackbarComponent.action = action;

    this.snackbar.openFromComponent(EntitySnackbarComponent, config);
  }
}
