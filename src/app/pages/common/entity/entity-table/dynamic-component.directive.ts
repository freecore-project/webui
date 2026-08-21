import {
  Directive,
  Input,
  OnInit,
  ViewContainerRef,
} from '@angular/core';

@Directive({ standalone: false, selector: '[dynamicComponent]' })
export class DynamicComponentDirective implements OnInit {
  @Input() component;
  @Input() config;
  @Input() parent;

  constructor(private container: ViewContainerRef) {}

  ngOnInit() {
    this.component = this.container.createComponent(this.component);
    this.component.instance.config = this.config;
    this.component.instance.parent = this.parent;
  }
}
