import { of } from 'rxjs';

import { MembersComponent } from './members.component';

describe('MembersComponent', () => {
  it('creates and loads an empty group membership', () => {
    const ws = {
      call: jasmine.createSpy('call').and.callFake((method: string) => {
        if (method === 'group.query') {
          return of([{ group: 'wheel', users: [] }]);
        }
        return of([]);
      }),
    };
    const component = new MembersComponent(
      {} as any,
      ws as any,
      { params: of({ pk: '42' }) } as any,
      {} as any,
      {} as any,
    );

    component.ngOnInit();

    expect(component).toBeTruthy();
    expect(component.group.id).toBe('42');
    expect(component.groupName).toBe('wheel');
    expect(component.showSpinner).toBeFalse();
  });
});
