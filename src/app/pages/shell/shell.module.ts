import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '../../appMaterial.module';
import { EntityModule } from '../common/entity/entity.module';
import { ShellComponent } from './shell.component';
import { routing } from './shell.routing';
import { TerminalModule } from './terminal.module';

@NgModule({
  imports: [
  CommonModule, FormsModule, EntityModule, MaterialModule, TranslateModule, TerminalModule, routing,
  ],
  declarations: [ShellComponent],
  })
export class ShellModule {}
