import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { WebTerminalService, WebTerminalStatus } from '../../services/web-terminal.service';
import { TerminalComponent } from './terminal.component';
import { TerminalModule } from './terminal.module';
import { DocsService } from '../../services/docs.service';

// the internal development record: the widget's chrome on the tiers. A viewer (readonly) has no keyboard, so it
// gets no font row and no Ctrl+C tooltip; an interactive console keeps the slider, 'Restore
// default' on the ghost sm tier and the tooltip. The overlay's Reconnect is the outline tier and
// its connecting glyph is hlm-spinner. The font gate's early path never resolves here and its 1.5 s
// fallback timer outlives every synchronous test (fixture.destroy() runs first), so xterm never
// opens and the pty is never asked for -- the template is what is under test.
describe('TerminalComponent toolbar visibility (the internal development record)', () => {
  let fixture: ComponentFixture<TerminalComponent>;
  let webTerminal: jasmine.SpyObj<WebTerminalService>;

  beforeEach(async () => {
    spyOn(document.fonts, 'load').and.returnValue(new Promise(() => {}));
    webTerminal = jasmine.createSpyObj<WebTerminalService>(
      'WebTerminalService',
      ['connect', 'disconnect', 'send', 'resize'],
      { status$: new Subject<WebTerminalStatus>(), output$: new Subject<Uint8Array>() },
    );
    await TestBed.configureTestingModule({
      imports: [TerminalModule, TranslateModule.forRoot(), NoopAnimationsModule],
      // the tooltip's help pipe pulls DocsService -> WebSocketService (entity-table-toolbar.spec.ts precedent)
      providers: [{ provide: DocsService, useValue: { getDocs: () => of(''), docReplace: (m: string) => m } }],
    })
      // the service is a component-level provider, so a module-level override is never seen
      .overrideComponent(TerminalComponent, { set: { providers: [{ provide: WebTerminalService, useValue: webTerminal }] } })
      .compileComponents();
    fixture = TestBed.createComponent(TerminalComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  const q = (sel: string): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(sel);

  it('hides the font row and the tooltip for a read-only viewer', () => {
    fixture.componentInstance.readonly = true;
    fixture.detectChanges();
    expect(q('.terminal-toolbar')).toBeNull();
    expect(q('tooltip')).toBeNull();
    expect(q('hlm-slider, mat-slider')).toBeNull();
    expect(q('.terminal-wrapper')).not.toBeNull();
    expect(webTerminal.connect).not.toHaveBeenCalled();
  });

  it('shows the font row on an interactive console: the slider, Restore default on the ghost sm tier, the tooltip', () => {
    fixture.detectChanges();
    expect(q('.terminal-toolbar')).not.toBeNull();
    expect(q('.terminal-toolbar hlm-slider[ix-auto-identifier="Set font size"]')).not.toBeNull(); // the internal development record
    expect(q('mat-slider')).toBeNull();
    const restore = q('.terminal-toolbar button[hlmBtn]');
    expect(restore.textContent.trim()).toBe('Restore default');
    expect(restore.getAttribute('type')).toBe('button');
    expect(restore.getAttribute('ix-auto-identifier')).toBe('RESTORE DEFAULT');
    expect(restore.getAttribute('variant')).toBe('ghost');
    expect(restore.getAttribute('size')).toBe('sm');
    expect(q('.terminal-toolbar tooltip[ix-auto-identifier="terminal-tooltip"]')).not.toBeNull();
    expect(q('.terminal-toolbar button[mat-button]')).toBeNull();
  });

  // the internal development record: the kit slider drives the font size as the mat-slider did -- named by the visible label,
  // 14 to start, a step per arrow key, back to 14 on Restore default.
  it('drives the font size from the kit slider', () => {
    fixture.detectChanges();
    const thumb = q('.terminal-toolbar hlm-slider [role=slider]');
    expect([thumb.getAttribute('aria-label'), thumb.getAttribute('aria-valuemin'), thumb.getAttribute('aria-valuemax')])
      .toEqual(['Font size', '10', '20']);
    expect(thumb.getAttribute('aria-valuenow')).toBe('14');
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.fontSize).toBe(15);
    expect(thumb.getAttribute('aria-valuenow')).toBe('15');
    q('.terminal-toolbar button[ix-auto-identifier="RESTORE DEFAULT"]').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.fontSize).toBe(14);
    expect(thumb.getAttribute('aria-valuenow')).toBe('14');
  });

  it('draws the connecting overlay with hlm-spinner and the ended overlay with Reconnect on the outline tier', () => {
    fixture.detectChanges();
    expect(q('.terminal-overlay hlm-spinner')).not.toBeNull();
    expect(q('.terminal-overlay mat-spinner')).toBeNull();
    expect(q('.terminal-overlay button')).toBeNull();

    fixture.componentInstance.status = { state: 'closed' };
    fixture.detectChanges();
    expect(q('.terminal-overlay hlm-spinner')).toBeNull();
    const reconnect = q('.terminal-overlay button[hlmBtn]');
    expect(reconnect.textContent.trim()).toBe('Reconnect');
    expect(reconnect.getAttribute('type')).toBe('button');
    expect(reconnect.getAttribute('variant')).toBe('outline');
    expect(reconnect.getAttribute('ix-auto-identifier')).toBe('RECONNECT');
    expect(q('.terminal-overlay-reason').textContent.trim()).toBe('The session has ended.');
  });
});
