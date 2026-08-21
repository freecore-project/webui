import { Subject } from 'rxjs';
import { WidgetControllerComponent } from './widgetcontroller.component';

describe('Widget controller responsive lifetime', () => {
  it('tracks the shared mobile breakpoint and releases its subscription on removal', () => {
    const changes = new Subject<any[]>();
    const controller = new WidgetControllerComponent(
      {} as any, {} as any, { asObservable: () => changes } as any,
    );
    changes.next([{ mqAlias: 'xs' }]);
    expect(controller.screenType).toBe('Mobile');
    changes.next([{ mqAlias: 'sm' }]);
    expect(controller.screenType).toBe('Desktop');
    expect(changes.observed).toBeTrue();
    controller.ngOnDestroy();
    expect(changes.observed).toBeFalse();
    changes.next([{ mqAlias: 'xs' }]);
    expect(controller.screenType).toBe('Desktop');
  });
});
