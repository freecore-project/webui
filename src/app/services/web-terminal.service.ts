import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { WebSocketService } from './ws.service';

/**
 * Client for the redesigned `/_webterminal` endpoint (the internal development record).
 *
 * Deliberately not a drop-in for `ShellService`, which welded authorization,
 * framing and transport together:
 *
 *   - **Ticket, not a token.** A single-use, ~15s ticket is minted over the
 *     already-authenticated main websocket and spent on connect. Nothing
 *     long-lived is ever handed to this socket, and `auth.get_token` is not
 *     involved (guard 5 of the epic).
 *   - **Binary frames.** Pty bytes travel undecoded and reach `Terminal.write`
 *     as a `Uint8Array`; xterm does the UTF-8 decoding itself. That deletes
 *     the split-multibyte crash class rather than patching it.
 *   - **Resize is an in-band control frame**, not an RPC keyed by session id,
 *     so there is nothing to get the ownership check wrong on.
 *
 * The socket is created inside `runOutsideAngular`, so pty output — which for
 * something like `top` arrives several times a second forever — does not drag
 * the whole application through change detection. Only state transitions
 * re-enter the zone.
 */

export interface WebTerminalTarget {
  jail?: string;
  vm_id?: number;
  processes?: boolean;
}

export type WebTerminalState = 'connecting' | 'connected' | 'closed' | 'failed';

export interface WebTerminalStatus {
  state: WebTerminalState;
  /** Present on 'failed', and on 'closed' when the far end gave a reason. */
  reason?: string;
}

@Injectable()
export class WebTerminalService {
  private socket: WebSocket;
  private outputSubject = new Subject<Uint8Array>();
  private statusSubject = new Subject<WebTerminalStatus>();

  /** Raw pty bytes, in arrival order. Never decoded here. */
  readonly output$: Observable<Uint8Array> = this.outputSubject.asObservable();
  readonly status$: Observable<WebTerminalStatus> = this.statusSubject.asObservable();

  private connected = false;

  constructor(private ws: WebSocketService, private zone: NgZone) {}

  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Mint a ticket for `target` and open the terminal socket with it. Any
   * previous session on this instance is closed first.
   */
  connect(target: WebTerminalTarget = {}): void {
    this.disconnect();
    this.emitStatus({ state: 'connecting' });

    this.ws.call('system.webterminal.get_ticket', [target]).subscribe(
      (ticket: string) => this.open(ticket),
      (error) => this.emitStatus({ state: 'failed', reason: this.describe(error) }),
    );
  }

  private open(ticket: string): void {
    // Outside the zone on purpose — see the class comment.
    this.zone.runOutsideAngular(() => {
      const scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      const socket = new WebSocket(`${scheme}${environment.remote}/websocket/webterminal`);
      socket.binaryType = 'arraybuffer';
      this.socket = socket;

      socket.onopen = () => socket.send(ticket);

      socket.onmessage = (event: MessageEvent) => {
        // Binary is pty output; text is always a control/status message.
        // The two can never be confused, which is the point of the split.
        if (event.data instanceof ArrayBuffer) {
          this.outputSubject.next(new Uint8Array(event.data));
          return;
        }
        this.handleControl(event.data);
      };

      socket.onerror = () => {
        // A transport error always arrives with (or just before) a close
        // event; let onclose own the state transition so it happens once.
      };

      socket.onclose = () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.socket = undefined;
        // A socket that closes before it ever connected failed to start;
        // one that closes after is just a session that ended.
        this.emitStatus(wasConnected
          ? { state: 'closed' }
          : { state: 'failed', reason: 'The terminal connection was closed before it was established.' });
      };
    });
  }

  private handleControl(raw: string): void {
    let message: any;
    try {
      message = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (message?.msg === 'connected') {
      this.connected = true;
      this.emitStatus({ state: 'connected' });
      return;
    }

    if (message?.msg === 'failed') {
      // The far end closes the socket straight after this; record the reason
      // now so onclose does not overwrite it with a generic one.
      this.connected = false;
      this.emitStatus({ state: 'failed', reason: message?.error?.reason || 'The terminal connection was refused.' });
    }
  }

  /** Send keystrokes/input to the pty. */
  send(data: string | Uint8Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.connected) {
      return;
    }
    this.socket.send(typeof data === 'string' ? new TextEncoder().encode(data) : data);
  }

  /** Tell the pty its new geometry. Control frame, not an RPC. */
  resize(cols: number, rows: number): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.connected) {
      return;
    }
    this.socket.send(JSON.stringify({ resize: { cols, rows } }));
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    const socket = this.socket;
    this.socket = undefined;
    this.connected = false;
    // Drop the handlers first: this is a deliberate teardown, not a session
    // ending on its own, so it should not surface as a status change.
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    socket.close();
  }

  private emitStatus(status: WebTerminalStatus): void {
    // Status drives the template, so it has to land back inside the zone.
    this.zone.run(() => this.statusSubject.next(status));
  }

  private describe(error: any): string {
    return error?.reason || error?.error?.reason || error?.message
      || 'The terminal could not be started.';
  }
}
