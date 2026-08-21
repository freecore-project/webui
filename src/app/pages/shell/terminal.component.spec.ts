import { ElementRef, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { WebTerminalService, WebTerminalStatus } from '../../services/web-terminal.service';
import { TerminalComponent } from './terminal.component';

describe('TerminalComponent opens only once the font is in (the internal development record)', () => {
  let component: TerminalComponent;
  let webTerminal: jasmine.SpyObj<WebTerminalService>;
  let host: HTMLDivElement;
  let resolveLoad: (value: unknown) => void;

  const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    webTerminal = jasmine.createSpyObj<WebTerminalService>(
      'WebTerminalService',
      ['connect', 'disconnect', 'send', 'resize'],
      { status$: new Subject<WebTerminalStatus>(), output$: new Subject<Uint8Array>() },
    );
    component = new TerminalComponent(webTerminal, new NgZone({ enableLongStackTrace: false }), {} as any);

    host = document.createElement('div');
    host.style.width = '640px';
    host.style.height = '320px';
    document.body.appendChild(host);
    component.container = new ElementRef(host);

    spyOn(document.fonts, 'load').and.returnValue(new Promise((resolve) => { resolveLoad = resolve; }));
  });

  afterEach(async () => {
    // xterm schedules a viewport sync on a timer right after open(); let it
    // run before dispose() or it throws on the torn-down renderer.
    await flush();
    component.ngOnDestroy();
    host.remove();
  });

  it('holds the terminal and the pty until the font has loaded', async () => {
    component.ngAfterViewInit();
    await flush();

    expect(document.fonts.load).toHaveBeenCalledOnceWith('14px "IBM Plex Mono"');
    expect(host.querySelector('.xterm')).toBeNull();
    expect(webTerminal.connect).not.toHaveBeenCalled();

    resolveLoad([]);
    await flush();

    expect(host.querySelector('.xterm')).not.toBeNull();
    expect(webTerminal.connect).toHaveBeenCalledOnceWith({});
  });

  it('does not open or connect when destroyed while waiting', async () => {
    component.ngAfterViewInit();
    await flush();
    component.ngOnDestroy();

    resolveLoad([]);
    await flush();

    expect(host.querySelector('.xterm')).toBeNull();
    expect(webTerminal.connect).not.toHaveBeenCalled();
  });
});
