import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// the internal development record: the CONSOLE law (D6). A console page is section.fc-page.fc-console: the h1 in
// the one title voice, then the #354 surface (bg2, hairline, 6px) holding <ix-terminal>, and the
// terminal fills the content hold to the footer through a min-height:0 flex column chain
// (hold > routed host > .fc-console > .fc-console-surface > ix-terminal > .terminal-wrapper). The
// stand-ins mirror the real DOM: the hold's direct children are the router outlet, the routed host
// element and the project footer (admin-layout.template.html), and the terminal stand-in carries the
// widget's own sheet (terminal.component.css through styleUrls, exactly as the widget) so its
// :host and .terminal-wrapper rules are the real ones. freecore-ui.css, egret_overrides.css and
// ix-blue.scss are Karma globals: the hold's inline position/top/height neutralise egret's absolute
// placement so the fixture measures a definite 600px box.
@Component({
  standalone: true,
  selector: 'ix-terminal-stand-in',
  template: `
    <div class="terminal-wrapper">
      <div class="terminal-surface"></div>
      <div class="terminal-overlay"><div class="terminal-overlay-box"><span>Connecting…</span></div></div>
    </div>
    <div class="terminal-toolbar"><span class="terminal-toolbar-label">Font size</span><div class="tooltip" id="help"><div class="tooltip-container"><div class="tooltiptext" id="help-hidden" style="position:absolute; top:-42px; width:400px; min-height:110px; visibility:hidden">help</div></div></div></div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./terminal.component.css'],
})
class TerminalStandIn {}

@Component({
  standalone: true,
  imports: [TerminalStandIn],
  template: `
    <div id="hold" class="rightside-content-hold" style="position:relative; top:auto; height:600px">
      <div id="outlet"></div>
      <div id="routed-host">
        <section id="shell-page" class="fc-page fc-console" aria-labelledby="shell-title">
          <h1 id="shell-title" class="fc-page-title">Shell: web</h1>
          <div class="fc-console-surface"><ix-terminal-stand-in></ix-terminal-stand-in></div>
        </section>
      </div>
      <footer class="fc-project-footer">x</footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
})
class ConsolePageStandIn {}

describe('Console page layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  async function mount(embedded = false): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [ConsolePageStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(ConsolePageStandIn);
    root = document.createElement('div');
    root.className = embedded ? 'embedding-active' : '';
    root.style.cssText = 'position:fixed; top:0; left:0; width:800px; z-index:1';
    const shell = document.createElement('div');
    shell.className = 'ix-blue fc-ui';
    root.appendChild(shell);
    document.body.appendChild(root);
    shell.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);
  const bottom = (el: Element): number => Math.round(el.getBoundingClientRect().bottom);
  const height = (el: Element): number => Math.round(el.getBoundingClientRect().height);

  it('titles the page in the one voice and draws the #354 surface', async () => {
    await mount();
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    const surface = getComputedStyle(q('.fc-console-surface'));
    expect(surface.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(surface.borderTopWidth).toBe('1px');
    expect(surface.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(surface.borderRadius).toBe('6px');
    expect(surface.overflow).toBe('visible'); // the toolbar's help pop-over is positioned inside the surface; the wrapper clips its own xterm
    expect(surface.minHeight).toBe('310px'); // the widget's floor: 260 wrapper + 48 toolbar + the border -- below it the hold scrolls instead of clipping
    expect(host.querySelector('mat-card, mat-card-title')).toBeNull();
  });

  it('fills the hold to the footer through the min-height:0 flex chain, with no page scroll', async () => {
    await mount();
    const hold = q('#hold');
    const routedHost = getComputedStyle(q('#routed-host'));
    expect(routedHost.display).toBe('flex'); // the :has() law fired for the routed host
    expect(routedHost.flexDirection).toBe('column');
    expect(routedHost.minHeight).toBe('0px');
    for (const sel of ['#shell-page', '.fc-console-surface', 'ix-terminal-stand-in']) {
      const s = getComputedStyle(q(sel));
      expect(s.display).withContext(sel).toBe('flex');
      expect(s.flexDirection).withContext(sel).toBe('column');
      expect(s.minHeight).withContext(sel).toBe(sel === '.fc-console-surface' ? '310px' : '0px'); // the surface keeps the widget's floor; every other link shrinks to 0
      expect(s.flexGrow).withContext(sel).toBe('1');
    }
    const footer = q('footer.fc-project-footer');
    // the hold keeps freecore-ui's `padding: 18px 32px 20px !important`; the footer sits on its bottom edge
    expect(bottom(footer)).toBe(bottom(hold) - 20);
    expect(Math.abs(bottom(q('.fc-console-surface')) - (bottom(hold) - 20 - height(footer)))).toBeLessThanOrEqual(1); // the footer's fractional line box rounds either way
    expect(hold.scrollHeight).toBeLessThanOrEqual(hold.clientHeight + 1);
    // the toolbar's hidden help pop-over (visibility:hidden, absolute, below the toolbar) must not push the hold into a scrollbar
    expect(getComputedStyle(q('#help-hidden')).display).toBe('none');
    q('#help-hidden').classList.add('show');
    expect(getComputedStyle(q('#help-hidden')).display).not.toBe('none');
    q('#help-hidden').classList.remove('show');
    const wrapper = q('.terminal-wrapper');
    expect(height(wrapper)).toBeGreaterThanOrEqual(260);
    expect(getComputedStyle(wrapper).paddingTop).toBe('8px');
    expect(getComputedStyle(wrapper).overflow).toBe('hidden');
    // the surface's inner box is the wrapper over the toolbar, nothing else
    expect(Math.abs(height(wrapper) + height(q('.terminal-toolbar')) - (height(q('.fc-console-surface')) - 2))).toBeLessThanOrEqual(1);
  });

  it('draws the widget chrome on the theme: the toolbar over a hairline, the overlay box on the #354 figure', async () => {
    await mount();
    const toolbar = getComputedStyle(q('.terminal-toolbar'));
    expect(toolbar.borderTopWidth).toBe('1px');
    expect(toolbar.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(toolbar.display).toBe('flex');
    const label = getComputedStyle(q('.terminal-toolbar-label'));
    expect(label.fontSize).toBe('12px');
    expect(label.color).toBe('rgb(151, 166, 174)');
    const box = getComputedStyle(q('.terminal-overlay-box'));
    expect(box.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(box.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(box.borderRadius).toBe('6px');
  });

  it('falls back to the viewport-minus-chrome basis when embedded (the hold is display:block)', async () => {
    await mount(true);
    expect(getComputedStyle(q('#hold')).display).toBe('block');
    // the wrapper measures its calc basis (or the surface's 310px floor minus the toolbar, whichever is taller)
    expect(height(q('.terminal-wrapper'))).toBeGreaterThanOrEqual(Math.max(260, window.innerHeight - 260));
    expect(height(q('.terminal-wrapper'))).toBeLessThanOrEqual(Math.max(310, window.innerHeight - 260));
  });
});
