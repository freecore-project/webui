import { of } from 'rxjs';

import { WidgetControllerComponent } from './widgetcontroller.component';

describe('WidgetControllerComponent', () => {
  it('creates with an idle media observer', () => {
    const component = new WidgetControllerComponent(
      {} as any,
      {} as any,
      { asObservable: () => of([]) } as any,
    );

    expect(component).toBeTruthy();
    expect(component.screenType).toBe('Desktop');
  });
});
