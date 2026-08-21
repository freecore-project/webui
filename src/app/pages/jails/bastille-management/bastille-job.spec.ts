import { Observable, of, Subject, throwError } from 'rxjs';
import { bastilleJob } from './bastille-job';
import { WebSocketService } from '../../../services/ws.service';

function fixture() {
  const events = new Subject<any>();
  const id = new Subject<number>();
  const closed = new Subject<boolean>();
  const eventsDetached = jasmine.createSpy('eventsDetached');
  const ws: any = {
    onCloseSubject: closed,
    unsubscribe: jasmine.createSpy('unsubscribe'),
    subscribe: jasmine.createSpy('subscribe').and.returnValue(new Observable((observer) => {
      const subscription = events.subscribe(observer);
      return () => { subscription.unsubscribe(); eventsDetached(); };
    })),
    call: jasmine.createSpy('call').and.callFake((method) => method === 'core.get_jobs'
      ? of([{ id: 42, state: 'RUNNING' }]) : id),
  };
  const next = jasmine.createSpy('next');
  const error = jasmine.createSpy('error');
  const complete = jasmine.createSpy('complete');
  const subscription = bastilleJob(ws, 'bastille.configure', ['web']).subscribe({ next, error, complete });
  return { ws, events, id, closed, next, error, complete, subscription, eventsDetached };
}

describe('Bastille job transport', () => {
  it('reports RPC validation errors and detaches event tracking', () => {
    const test = fixture();
    test.id.error({ reason: 'Invalid jail name' });
    expect(test.error).toHaveBeenCalledWith({ reason: 'Invalid jail name' });
    expect(test.eventsDetached).toHaveBeenCalled();
  });

  it('recovers a completed job whose event preceded the RPC response', () => {
    const test = fixture();
    test.events.next({ id: 42, fields: { state: 'SUCCESS' } });
    test.ws.call.and.returnValue(of([{ id: 42, state: 'SUCCESS', result: 'web' }]));
    test.id.next(42);
    expect(test.next).toHaveBeenCalledOnceWith({ id: 42, state: 'SUCCESS', result: 'web' });
    expect(test.complete).toHaveBeenCalled();
    expect(test.eventsDetached).toHaveBeenCalled();
  });

  it('ignores other jobs and completes on the selected job', () => {
    const test = fixture();
    test.id.next(42);
    test.next.calls.reset();
    test.events.next({ id: 43, fields: { state: 'FAILED' } });
    expect(test.next).not.toHaveBeenCalled();
    test.events.next({ id: 42, fields: { state: 'SUCCESS', result: true } });
    expect(test.next).toHaveBeenCalledOnceWith({ id: 42, state: 'SUCCESS', result: true });
    expect(test.complete).toHaveBeenCalled();
  });

  for (const state of ['FAILED', 'ABORTED']) {
    it(`completes and cleans up a ${state} job`, () => {
      const test = fixture();
      test.id.next(42);
      test.events.next({ id: 42, fields: { state } });
      expect(test.complete).toHaveBeenCalled();
      expect(test.eventsDetached).toHaveBeenCalled();
    });
  }

  it('reports websocket loss after job dispatch', () => {
    const test = fixture();
    test.id.next(42);
    test.closed.next(true);
    expect(test.error.calls.mostRecent().args[0].reason).toContain('Connection lost');
    expect(test.eventsDetached).toHaveBeenCalled();
  });

  it('reports a missing current job', () => {
    const test = fixture();
    test.ws.call.and.returnValue(of([]));
    test.id.next(42);
    expect(test.error.calls.mostRecent().args[0].reason).toContain('no longer available');
  });

  it('reports reconciliation query errors', () => {
    const test = fixture();
    test.ws.call.and.returnValue(throwError(() => ({ reason: 'Query failed' })));
    test.id.next(42);
    expect(test.error).toHaveBeenCalledWith({ reason: 'Query failed' });
  });

  it('rejects an invalid job identifier', () => {
    const test = fixture();
    test.id.next(-1);
    expect(test.error.calls.mostRecent().args[0].reason).toContain('invalid job ID');
  });

  it('unsubscribes without issuing an abort or retry', () => {
    const test = fixture();
    test.id.next(42);
    test.subscription.unsubscribe();
    expect(test.eventsDetached).toHaveBeenCalled();
    expect(test.ws.call.calls.allArgs()).toEqual([
      ['bastille.configure', ['web']], ['core.get_jobs', [[['id', '=', 42]]]],
    ]);
  });
});

describe('Bastille job cleanup with the real WebSocketService observer registry', () => {
  for (const outcome of ['SUCCESS', 'FAILED', 'ABORTED', 'RPC_ERROR', 'NAVIGATION']) {
    it(`removes its retained observer after ${outcome} and preserves other consumers`, async () => {
      const ws: any = Object.create(WebSocketService.prototype);
      ws.subscriptions = new Map();
      ws.onCloseSubject = new Subject<boolean>();
      const id = new Subject<number>();
      ws.call = jasmine.createSpy('call').and.callFake((method) => method === 'core.get_jobs'
        ? of([{ id: 42, state: 'RUNNING' }]) : id);
      const subscription = bastilleJob(ws, 'bastille.configure', ['web']).subscribe({ error: () => {} });
      const peerNext = jasmine.createSpy('peerNext');
      const peer = ws.subscribe('core.get_jobs').subscribe(peerNext);
      expect(ws.subscriptions.get('core.get_jobs').length).toBe(2);
      if (outcome === 'RPC_ERROR') {
        id.error({ reason: 'Invalid jail' });
      } else if (outcome === 'NAVIGATION') {
        subscription.unsubscribe();
      } else {
        id.next(42);
        const event = { msg: 'changed', collection: 'core.get_jobs', id: 42, fields: { state: outcome } };
        ws.onmessage({ data: JSON.stringify(event) });
        expect(peerNext).toHaveBeenCalledWith(event);
      }
      await Promise.resolve();
      expect(ws.subscriptions.get('core.get_jobs')).toEqual([peer]);
      ws.unsubscribe(peer);
      peer.unsubscribe();
    });
  }
});
