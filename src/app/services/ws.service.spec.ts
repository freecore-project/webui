import { Subject } from 'rxjs';

import { WebSocketService } from './ws.service';

describe('WebSocketService event subscriptions', () => {
  const eventSource = 'guest.stats:{"interval":5}';
  const bucket = 'guest_stats:{"interval":5}';

  let service: WebSocketService;
  let send: jasmine.Spy;

  beforeEach(() => {
    service = Object.create(WebSocketService.prototype);
    service.pendingSubs = {};
    send = spyOn(service, 'send');
  });

  it('sends an exact protocol unsubscribe on RxJS teardown', () => {
    const subscription = service.sub(eventSource).subscribe();
    const subscribePayload = send.calls.first().args[0];

    expect(subscribePayload).toEqual({
      id: jasmine.any(String),
      name: eventSource,
      msg: 'sub',
    });
    expect(Object.keys(service.pendingSubs[bucket].observers)).toEqual([subscribePayload.id]);

    subscription.unsubscribe();

    expect(send.calls.mostRecent().args[0]).toEqual({
      id: subscribePayload.id,
      msg: 'unsub',
    });
    expect(service.pendingSubs[bucket]).toBeUndefined();
  });

  it('keeps same-name subscribers independent until each tears down', () => {
    const source = service.sub(eventSource);
    const first = source.subscribe();
    const second = source.subscribe();
    const firstId = send.calls.argsFor(0)[0].id;
    const secondId = send.calls.argsFor(1)[0].id;

    expect(firstId).not.toBe(secondId);
    expect(Object.keys(service.pendingSubs[bucket].observers).sort()).toEqual([
      firstId,
      secondId,
    ].sort());

    first.unsubscribe();

    expect(service.pendingSubs[bucket].observers[firstId]).toBeUndefined();
    expect(service.pendingSubs[bucket].observers[secondId]).toBeDefined();

    second.unsubscribe();

    expect(service.pendingSubs[bucket]).toBeUndefined();
    expect(send.calls.allArgs().slice(2).map((args) => args[0])).toEqual([
      { id: firstId, msg: 'unsub' },
      { id: secondId, msg: 'unsub' },
    ]);
  });

  it('tears a subscription down only once', () => {
    const subscription = service.sub(eventSource).subscribe();

    subscription.unsubscribe();
    subscription.unsubscribe();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.calls.argsFor(1)[0].msg).toBe('unsub');
  });
});

describe('WebSocketService sign-in token renewal', () => {
  let service: WebSocketService;
  let call: jasmine.Spy;
  let replies: Subject<string>[];

  const signIn = () => service.loginCallback(true, { next: () => {}, complete: () => {} });
  const generateCalls = () => call.calls.allArgs().filter(([method]) => method === 'auth.generate_token');

  beforeEach(() => {
    jasmine.clock().install();
    service = Object.create(WebSocketService.prototype);
    // an own data property shadows the @LocalStorage accessor, which needs the storage module
    Object.defineProperty(service, 'token', { value: 'minted-at-sign-in', writable: true });
    (service as any)._authStatus = new Subject();
    service.loggedIn = false;
    service.connected = true;
    spyOn(service, 'send');
    replies = [];
    call = spyOn(service, 'call').and.callFake(() => {
      const reply = new Subject<string>();
      replies.push(reply);
      return reply;
    });
  });

  afterEach(() => {
    service.clearCredentials();
    jasmine.clock().uninstall();
  });

  it('re-mints the 300 s token every 3 minutes while signed in, so a reload can sign back in', () => {
    signIn();

    jasmine.clock().tick(180 * 1000 - 1);
    expect(generateCalls()).toEqual([]);

    jasmine.clock().tick(1);
    expect(generateCalls()).toEqual([['auth.generate_token', [300]]]);
    replies[0].next('renewed-1');
    expect(service.token).toBe('renewed-1');

    jasmine.clock().tick(180 * 1000);
    expect(generateCalls().length).toBe(2);
    replies[1].next('renewed-2');
    expect(service.token).toBe('renewed-2');
  });

  it('keeps one timer across re-sign-ins (a reconnect signs in again)', () => {
    signIn();
    signIn();

    jasmine.clock().tick(180 * 1000);
    expect(generateCalls().length).toBe(1);
  });

  it('skips a renewal while the socket is down', () => {
    signIn();
    service.connected = false;

    jasmine.clock().tick(180 * 1000);
    expect(generateCalls()).toEqual([]);
  });

  it('stops on sign-out and drops a reply that lands after it', () => {
    signIn();
    jasmine.clock().tick(180 * 1000);
    expect(generateCalls().length).toBe(1);

    service.clearCredentials();
    replies[0].next('late');
    expect(service.token).toBeNull();

    jasmine.clock().tick(10 * 180 * 1000);
    expect(generateCalls().length).toBe(1);
  });
});
