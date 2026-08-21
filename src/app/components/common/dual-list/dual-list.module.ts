import { NgModule } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { CommonModule } from '@angular/common';
import { DualListboxComponent } from './dual-list.component';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  declarations: [DualListboxComponent],
  imports: [CommonModule, ...HlmButtonImports, MatIconModule, DragDropModule], // the internal development record: no mat-list
  exports: [DualListboxComponent],
})
export class NgxDualListboxModule {}
