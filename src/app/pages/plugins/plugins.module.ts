import { NgModule } from '@angular/core';

import { routing } from './plugins.routing';
import { PluginsRetiredComponent } from './plugins-retired.component';

@NgModule({
  imports: [routing],
  declarations: [PluginsRetiredComponent],
})
export class PluginsModule {
}
