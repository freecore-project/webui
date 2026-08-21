import { NEVER } from 'rxjs';

import { BreadcrumbComponent } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  it('creates and initializes with empty route parts', () => {
    const component = new BreadcrumbComponent(
      { events: NEVER } as any,
      { generateRouteParts: () => [] } as any,
      { snapshot: {} } as any,
      { register: () => NEVER } as any,
      { getCopyrightYearFromBuildTime: () => '2026' } as any,
    );

    component.ngOnInit();

    expect(component).toBeTruthy();
    expect(component.routeParts).toEqual([]);
  });
});
