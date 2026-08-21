import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild,
} from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { Subscription } from 'rxjs';
import { CopyPasteMessageComponent } from 'app/pages/shell/copy-paste-message.component';
import { WebTerminalService, WebTerminalStatus, WebTerminalTarget } from '../../services/web-terminal.service';
import helptext from '../../helptext/shell/shell';

/**
 * The one terminal widget in the product — the root shell page, the jail
 * console, the VM serial console and System Processes all render this.
 *
 * Everything that used to be copy-pasted four ways (spin up an xterm, bolt a
 * socket to it, guess at a row count from `document.body.offsetHeight`) lives
 * here once, and the geometry is now measured rather than guessed: the fit
 * addon decides the size, `Terminal.onResize` reports what it decided, and
 * that is what the pty is told. The old pages never called `resize` at all,
 * so the pty and the terminal simply disagreed about how big the screen was.
 *
 * `@xterm/xterm` is pinned at **5.5.0, not 6.0.0**. The epic's phase-0 spike
 * cleared 6.0.0 on the strength of a clean `tsc` run, but type-checking is not
 * bundling: under this app's production configuration 6.0.0 dies inside its own
 * constructor with `super(...args) is not a constructor` — the terminal simply
 * never opens. It works in a development build, which is why only running the
 * shipped artifact on a canary caught it. Ruled out `buildOptimizer` (fails
 * with it off too), so it is the minifier against 6.0.0's ESM. 5.5.0 builds and
 * runs under the identical production config, and carries everything the design
 * relies on — `write(Uint8Array)`, the fit addon, `onData`/`onBinary`/`onResize`.
 * Do not bump this without loading a terminal page from a **production** build.
 */
@Component({
  selector: 'ix-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css'],
  providers: [WebTerminalService],
  })
export class TerminalComponent implements AfterViewInit, OnDestroy {
  /** What to attach to. `{}` is an interactive root shell. */
  @Input() target: WebTerminalTarget = {};
  /** Viewer mode: no keyboard wiring. The far end refuses input too. */
  @Input() readonly = false;
  @Input() tooltip: string = helptext.usage_tooltip;
  /** Fires when a session that had connected ends on its own. */
  @Output() ended = new EventEmitter<void>();

  @ViewChild('terminalContainer', { static: true }) container: ElementRef<HTMLDivElement>;

  status: WebTerminalStatus = { state: 'connecting' };
  fontSize = 14;

  private terminal: Terminal;
  private fitAddon: FitAddon;
  private resizeObserver: ResizeObserver;
  private subscriptions = new Subscription();

  constructor(
    public webTerminal: WebTerminalService,
    private zone: NgZone,
    private dialog: MatDialog,
  ) {}

  ngAfterViewInit(): void {
    this.subscriptions.add(this.webTerminal.status$.subscribe((status) => {
      const wasConnected = this.status?.state === 'connected';
      this.status = status;
      if (status.state === 'connected') {
        // The pty starts at whatever size openpty() defaulted to; tell it the
        // truth as soon as there is somewhere to send it.
        this.syncSize();
      }
      if (status.state === 'closed' && wasConnected) {
        this.ended.emit();
      }
    }));

    this.zone.runOutsideAngular(() => {
      this.terminal = new Terminal({
        cursorBlink: true,
        tabStopWidth: 8,
        fontFamily: 'IBM Plex Mono, Droid Sans Mono, monospace',
        fontSize: this.fontSize,
        disableStdin: this.readonly,
        scrollback: 5000,
      });

      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);
      this.terminal.loadAddon(new ClipboardAddon());
      this.terminal.loadAddon(new WebLinksAddon());

      this.terminal.open(this.container.nativeElement);

      if (!this.readonly) {
        // Keystrokes go straight out as bytes. No zone re-entry: a terminal
        // that ran change detection per keypress is what the epic calls out.
        this.terminal.onData((data) => this.webTerminal.send(data));
        this.terminal.onBinary((data) => this.webTerminal.send(
          Uint8Array.from(data, (char) => char.charCodeAt(0) & 0xff),
        ));
      }

      // Whatever geometry the fit addon settles on is what the pty is told.
      this.terminal.onResize(({ cols, rows }) => this.webTerminal.resize(cols, rows));

      // Pty bytes, undecoded — xterm owns the UTF-8 decoding, which is why a
      // multibyte character split across two reads is no longer a crash.
      this.subscriptions.add(this.webTerminal.output$.subscribe((bytes) => {
        this.terminal.write(bytes);
      }));

      this.resizeObserver = new ResizeObserver(() => this.fit());
      this.resizeObserver.observe(this.container.nativeElement);
      this.fit();
    });

    this.webTerminal.connect(this.target);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.resizeObserver?.disconnect();
    this.webTerminal.disconnect();
    this.terminal?.dispose();
  }

  reconnect(): void {
    this.terminal?.reset();
    this.webTerminal.connect(this.target);
  }

  onFontSizeChange(size: number): void {
    this.fontSize = size;
    if (this.terminal) {
      this.terminal.options.fontSize = size;
      this.fit();
    }
  }

  resetFontSize(): void {
    this.onFontSizeChange(14);
  }

  onRightClick(): false {
    this.dialog.open(CopyPasteMessageComponent);
    return false;
  }

  private fit(): void {
    // Racing a 0x0 container during route transitions throws inside the addon.
    try {
      this.fitAddon?.fit();
    } catch (e) {
      // Nothing to fit to yet; the ResizeObserver will call back when there is.
    }
  }

  private syncSize(): void {
    this.fit();
    if (this.terminal) {
      this.webTerminal.resize(this.terminal.cols, this.terminal.rows);
    }
  }
}
