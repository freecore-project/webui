import { Inject, Injectable } from '@angular/core';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { WINDOW } from 'app/helpers/window.helper';
import { ApiTimestamp } from 'app/interfaces/api-date.interface';
import { WebSocketService } from 'app/services/ws.service';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private lastSeenBuiltTime: number;

  constructor(
    private ws: WebSocketService,
    @Inject(WINDOW) private window: Window,
  ) {}

  /**
   * Hard refresh is needed to load new html and js after the update.
   */
  hardRefreshIfNeeded(): Observable<unknown> {
    return this.ws.call('system.build_time').pipe(
      tap((buildTime: ApiTimestamp) => {
        if (!this.lastSeenBuiltTime) {
          // First boot.
          this.lastSeenBuiltTime = buildTime.$date;
          return;
        }

        if (this.lastSeenBuiltTime === buildTime.$date) {
          // No update.
          return;
        }

        try {
          this.window.sessionStorage.setItem('freecore.uiReloadPending', '1');
        } catch {
          // Storage may be disabled; refreshing must still succeed.
        }
        this.window.location.reload();
      }),
    );
  }

  /**
   * the internal development record: run the check after every connection to the middleware, not only when a
   * sign-in page is built. An update ends on the reboot screen, which sends the tab to sign-in while
   * the old middleware is still answering (ws.connected has not dropped yet), so a check made there
   * compares the old build with itself and the sign-in page never asks again. The first connection
   * records the build time; a connection to a box that came back on another build reloads. A call
   * that fails (the box is still settling) ends that attempt, not the watch.
   */
  watchConnections(): Subscription {
    return this.ws.onConnectedSubject.pipe(
      switchMap(() => this.hardRefreshIfNeeded().pipe(catchError(() => EMPTY))),
    ).subscribe();
  }
}
