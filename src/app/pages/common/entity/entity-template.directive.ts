import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({ standalone: false, selector: 'ng-template[type]' })
export class EntityTemplateDirective {
  @Input() type: string|null = null;

  constructor(public templateRef: TemplateRef<any>) {}
}
