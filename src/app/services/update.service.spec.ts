import { of } from 'rxjs';
import { UpdateService } from './update.service';

describe('15.2 updated WebUI reload presentation', () => {
  it('marks only a changed build for the next bootstrap and preserves reload if storage is unavailable', () => {
    let date = 1;
    const ws: any = { call: () => of({ $date: date }) };
    const browser: any = { sessionStorage: { setItem: jasmine.createSpy('setItem') }, location: { reload: jasmine.createSpy('reload') } };
    const service = new UpdateService(ws, browser);
    service.hardRefreshIfNeeded().subscribe();
    service.hardRefreshIfNeeded().subscribe();
    expect(browser.location.reload).not.toHaveBeenCalled();
    date = 2;
    service.hardRefreshIfNeeded().subscribe();
    expect(browser.sessionStorage.setItem).toHaveBeenCalledWith('freecore.uiReloadPending', '1');
    expect(browser.location.reload).toHaveBeenCalledTimes(1);
    browser.sessionStorage.setItem.and.throwError('disabled');
    date = 3;
    service.hardRefreshIfNeeded().subscribe();
    expect(browser.location.reload).toHaveBeenCalledTimes(2);
  });
});
