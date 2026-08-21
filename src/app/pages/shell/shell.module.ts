import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
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
    ...HlmButtonImports, ...HlmSpinnerImports, // the internal development record: Enable Shell + the loading glyph
  ],
  declarations: [ShellComponent],
})
export class ShellModule {}
