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
