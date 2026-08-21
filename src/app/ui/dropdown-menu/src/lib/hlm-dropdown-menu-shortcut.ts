import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmDropdownMenuShortcut],hlm-dropdown-menu-shortcut',
  host: { 'data-slot': 'dropdown-menu-shortcut' },
})
export class HlmDropdownMenuShortcut {
  constructor() {
    classes(() => 'ms-auto text-xs tracking-widest text-muted-foreground');
  }
}
