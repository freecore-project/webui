import { Directive, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { CoreEvent } from 'app/core/services/core.service';
import { View } from 'app/core/classes/view';
import { Action } from 'app/core/classes/viewcontrol';

export interface ViewControllerOptions {
  // data: any[];
  events: Subject<CoreEvent>;
  // actions?: Action[];
}

// Angular 10 requires a base class that uses Angular features — here the ngOnDestroy
// lifecycle hook — to carry a decorator (NG2007). A selectorless @Directive() is the
// documented annotation for an abstract base that is never itself instantiated.
@Directive()
export abstract class ViewController implements OnDestroy {
  name = 'ViewController';
  protected controlEvents: Subject<CoreEvent>;

  constructor(options?: ViewControllerOptions) {
    if (options) {
      this.setControlEvents(options.events);
    } else {
      this.setControlEvents();
    }
  }

  setControlEvents(subj?: Subject<CoreEvent>) {
    if (subj) {
      this.controlEvents = subj;
    } else {
      this.controlEvents = new Subject();
    }
  }

  ngOnDestroy() {}
}
