import { Observable, Subscription } from 'rxjs';
import { WebSocketService } from '../../services/ws.service';
import { T } from '../../translate-marker';

/** Track an Applications job, including RPC failures and jobs completed before their ID arrives. */
export function applicationsJob(ws: WebSocketService, method: string, args: any[]): Observable<any> {
  return new Observable((observer) => {
    const subscriptions = new Subscription();
    let jobId: number;
    const accept = (job: any) => {
      if (observer.closed) { return; }
      observer.next(job);
      if (['SUCCESS', 'FAILED', 'ABORTED'].includes(job.state)) { observer.complete(); }
    };
    const fail = (error: any) => observer.error(error);
    subscriptions.add(ws.onCloseSubject.subscribe((closed) => {
      if (closed) { fail({ reason: T('Connection lost. Check Jobs before retrying.') }); }
    }));
    if (!observer.closed) {
      const events = ws.subscribe('core.get_jobs').subscribe({
        next: (event: any) => {
          if (jobId !== undefined && event.id === jobId && event.fields) { accept({ ...event.fields, id: event.id }); }
        },
        error: fail,
        complete: () => {
          if (!observer.closed) { fail({ reason: T('Progress tracking ended. Check Jobs before retrying.') }); }
        },
      });
      subscriptions.add(events);
      // subscribe() retains its observer separately from RxJS. Remove it after
      // dispatch, because splicing during onmessage's forEach skips the next observer.
      subscriptions.add(() => queueMicrotask(() => ws.unsubscribe(events)));
    }
    if (!observer.closed) {
      subscriptions.add(ws.call(method, args).subscribe({
        next: (id: number) => {
          if (!Number.isInteger(id) || id < 0) { fail({ reason: T('The server returned an invalid job ID.') }); return; }
          jobId = id;
          subscriptions.add(ws.call('core.get_jobs', [[['id', '=', jobId]]]).subscribe({
            next: (jobs: any[]) => {
              if (jobs.length === 1) { accept(jobs[0]); } else { fail({ reason: T('The job is no longer available. Check Jobs before retrying.') }); }
            },
            error: fail,
          }));
        },
        error: fail,
      }));
    }
    // This only detaches tracking; it never aborts a server-side job.
    return subscriptions;
  });
}
