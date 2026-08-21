import { NgModule } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';

// the internal development record: checkbox, form-field, input, radio and select left with their last users (#469-#471);
// the internal development record: progress-spinner with the members page's.
// the internal development record: tabs with Applications, Rsync and iSCSI (#479, #480).
// the internal development record: slider with the terminal's font size.
// the internal development record: expansion with the Pools page's panels.
// the internal development record: sidenav, toolbar, divider and list with the shell (#484-#486); card and button had no user
// left (#459 / #396 waves). What stays is by design: the icon font and the dialog engine (#421).
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  imports: [
    MatIconModule,
    MatDialogModule,
  ],
  exports: [
    MatIconModule,
    MatDialogModule,
  ],
  providers: [
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
})
export class MaterialModule {}
