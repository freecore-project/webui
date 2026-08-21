import { of, Subject, throwError } from 'rxjs';
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

  it('the internal development record: checks after every connection to the middleware and reloads once the build changed', () => {
    let date = 1;
    let refused = false;
    const connected = new Subject<boolean>();
    const ws: any = {
      onConnectedSubject: connected,
      call: () => (refused ? throwError(() => new Error('refused')) : of({ $date: date })),
    };
    const browser: any = { sessionStorage: { setItem: jasmine.createSpy('setItem') }, location: { reload: jasmine.createSpy('reload') } };
    const service = new UpdateService(ws, browser);
    const watch = service.watchConnections();

    connected.next(true); // the first connection records the build time
    connected.next(true); // a reconnection to the same build
    expect(browser.location.reload).not.toHaveBeenCalled();

    refused = true;
    connected.next(true); // the box is still settling: this attempt fails, the watch does not
    refused = false;
    date = 2;
    connected.next(true); // the box came back on another build
    expect(browser.sessionStorage.setItem).toHaveBeenCalledWith('freecore.uiReloadPending', '1');
    expect(browser.location.reload).toHaveBeenCalledTimes(1);

    watch.unsubscribe();
    date = 3;
    connected.next(true);
    expect(browser.location.reload).toHaveBeenCalledTimes(1);
  });
});
