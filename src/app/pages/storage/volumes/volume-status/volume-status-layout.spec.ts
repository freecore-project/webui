import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: Pool Status (volume-status.component.html) is section.fc-page on the page shell in
// the boot-pool status page's shape: the .fc-page-header row with the h1 and the one outline Refresh,
// the scan facts as the dl voice (the page's own #pool-status-page copy of the #boot-pool-status-page
// rules, through styleUrls exactly as the page), the tree table directly under the section. The
// table stand-in carries the .entity-tree-table class so the shared freecore-ui.css rules reach it;
// freecore-ui.css and the spartan sheet are Karma global styles, so the stand-in only needs the
// `.ix-blue.fc-ui` root <body> carries.
@Component({
  standalone: true,
  imports: [HlmButtonImports],
  template: `
    <section id="pool-status-page" class="fc-page">
      <header class="fc-page-header">
        <h1 class="fc-page-title">Pool Status</h1>
        <button hlmBtn variant="outline" type="button" id="pool-status-refresh">Refresh</button>
      </header>
      <dl class="fc-boot-scan">
        <div><dt>Operation</dt><dd>SCRUB</dd></div>
        <div><dt>Status</dt><dd>FINISHED</dd></div>
        <div><dt>Time Remaining</dt><dd><span class="time-remaining">1 hour, </span><span class="time-remaining">2 minutes</span></dd></div>
        <div><dt>Errors</dt><dd>0</dd></div>
        <div><dt>Date</dt><dd>2026-09-19 03:45:00</dd></div>
      </dl>
      <div class="entity-tree-table">
        <table>
          <thead><tr><th>Name</th><th>Read</th><th>Write</th><th>Checksum</th><th>Status</th></tr></thead>
          <tbody><tr><td id="first-cell">tank</td><td>0</td><td>0</td><td>0</td><td>ONLINE</td></tr></tbody>
        </table>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./volume-status.component.css'],
})
class PoolStatusStandIn {}

describe('Pool Status layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [PoolStatusStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(PoolStatusStandIn);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = 'position:fixed; top:0; left:0; width:1200px; z-index:1';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);
  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);

  it('is the full-width page under the one title voice, Refresh on the title row at the right edge', () => {
    const page = q('#pool-status-page');
    expect(getComputedStyle(page).maxWidth).toBe('none');
    expect(left(page)).toBe(0);
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(title.marginBottom).toBe('0px');
    const header = q('.fc-page-header');
    const s = getComputedStyle(header);
    expect(s.display).toBe('flex');
    expect(s.justifyContent).toBe('space-between');
    expect(s.marginBottom).toBe('24px');
    const refresh = q('#pool-status-refresh');
    expect(Math.round(page.getBoundingClientRect().right - refresh.getBoundingClientRect().right)).toBe(0);
    const mid = (el: Element): number => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
    expect(Math.abs(mid(refresh) - mid(q('h1.fc-page-title')))).toBeLessThan(12);
  });

  it('draws Refresh on the outline tier', () => {
    const refresh = q('#pool-status-refresh');
    const s = getComputedStyle(refresh);
    expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(s.borderTopWidth).toBe('1px');
    expect(Math.round(refresh.getBoundingClientRect().height)).toBe(32);
    expect(refresh.classList).not.toContain('bg-primary');
  });

  it('lays the scan facts out in the boot-pool dl voice', () => {
    const dl = getComputedStyle(q('dl.fc-boot-scan'));
    expect(dl.display).toBe('flex');
    expect(dl.flexWrap).toBe('wrap');
    expect(dl.rowGap).toBe('18px');
    expect(dl.columnGap).toBe('40px');
    expect(dl.marginBottom).toBe('28px');
    expect(dl.marginLeft).toBe('0px');
    const dt = getComputedStyle(q('dl.fc-boot-scan dt'));
    expect(dt.color).toBe('rgb(151, 166, 174)');
    expect(dt.fontSize).toBe('12px');
    const dd = getComputedStyle(q('dl.fc-boot-scan dd'));
    expect(dd.marginTop).toBe('8px');
    expect(dd.fontSize).toBe('14px'); // the fact value = the inherited body size, one voice on every dl page
    expect(dd.marginLeft).toBe('0px');
    // the first time-remaining span sits on the dd edge, the next ones 5px apart
    const spans = Array.from(host.querySelectorAll<HTMLElement>('.time-remaining'));
    expect(getComputedStyle(spans[0]).marginLeft).toBe('0px');
    expect(getComputedStyle(spans[1]).marginLeft).toBe('5px');
    expect(left(q('dl.fc-boot-scan'))).toBe(0);
  });

  it('sets the tree table directly under the section on the title edge, transparent', () => {
    const table = q('.entity-tree-table');
    expect(left(table)).toBe(left(q('h1.fc-page-title')));
    expect(left(q('#first-cell')) - left(table)).toBeLessThan(16); // the shared 12px cell padding (+ UA spacing), no .padding-16
    expect(getComputedStyle(table).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('.entity-tree-table th')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('.entity-tree-table td')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(host.querySelector('.mat-card, .mat-toolbar, mat-card, mat-list, mat-list-item, .padding-16')).toBeNull();
  });
});
