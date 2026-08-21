import {
  Component, ComponentRef, AfterViewInit, ViewChild, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { Display } from 'app/core/components/display/display.component';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { ViewController } from 'app/core/classes/viewcontroller';
import { LayoutContainer, LayoutChild } from 'app/core/classes/layouts';
import { Subject } from 'rxjs';

export const ViewControllerMetadata = {
  template: `
  <div class="view-controller-layout">
    <display style="display:none;" #display></display>
  </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .view-controller-layout {
      align-content: center;
      align-items: center;
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: space-around;
    }
  `],
};

export interface ViewConfig {
  componentName: any;
  componentData: any;
  controller?: Subject<any>;
}

@Component({
  standalone: false,
  selector: 'viewcontroller',
  template: ViewControllerMetadata.template,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ViewControllerMetadata.styles,
})
export class ViewControllerComponent extends ViewController implements AfterViewInit, OnDestroy {
  readonly componentName = ViewControllerComponent;
  @ViewChild('display', { static: true }) display;
  // public displayList: ComponentRef[] = [];
  protected core: CoreService;
  controlEvents: Subject<CoreEvent> = new Subject();

  layoutContainer: LayoutContainer = { layout: 'row', align: 'space-between center', gap: '' };
  layoutChild?: LayoutChild;

  constructor() {
    super();
    this.core = CoreServiceInjector.get(CoreService);
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.core.unregister({ observerClass: this });
  }

  create(component: any, container?: string) {
    if (!container) { container = 'display'; }
    const instance = this[container].create(component);
    return instance;
  }

  addChild(instance, container?: string) {
    if (!container) { container = 'display'; }
    this[container].addChild(instance);
  }

  removeChild(instance, container?: string) {
    if (!container) { container = 'display'; }
    this[container].removeChild(instance);
  }
}
