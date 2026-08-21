import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '../../appMaterial.module';
import { EntityModule } from '../common/entity/entity.module';
import { TerminalComponent } from './terminal.component';

/**
 * Exports the one terminal widget. Imported by the Shell page and by the
 * three pages that used to each carry their own copy of this logic (jail
 * console, VM serial console, System Processes).
 */
@NgModule({
  imports: [CommonModule, FormsModule, EntityModule, MaterialModule, TranslateModule],
  declarations: [TerminalComponent],
  exports: [TerminalComponent],
  })
export class TerminalModule {}
