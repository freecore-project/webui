import { of } from 'rxjs';
import { UserService } from './user.service';

describe('UserService list queries', () => {
  it('sends query-filters before query-options, the shape user.query and group.query accept', () => {
    const ws = { call: jasmine.createSpy('call').and.returnValue(of([])) };
    const service = new UserService(null, ws as any);

    service.listUsers();
    service.listGroups();

    expect(ws.call.calls.allArgs()).toEqual([
      ['user.query', [[], { limit: 50 }]],
      ['group.query', [[], { limit: 50 }]],
    ]);
  });
});
