// Common Modules
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '../../appMaterial.module';
import { EntityModule } from '../common/entity/entity.module';
// Component Modules
import { SystemProcessesComponent } from './system-processes.component';
import { routing } from './system-processes.routing';
import { TerminalModule } from '../shell/terminal.module';

@NgModule({
  imports: [CommonModule, FormsModule, EntityModule, routing, MaterialModule, TranslateModule, TerminalModule],
  declarations: [
  SystemProcessesComponent,
  ],
  providers: [],
  })
export class SystemProcessesModule {}
