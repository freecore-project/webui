import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: Security Keys (webauthn.component.html) is a status page on the shell law --
// the capped page, the .fc-page-header with its ONE action, the boot-status facts dl, the shell-styled
// native table and the closing toggle row -- every rule keyed on #security-keys-page in freecore-ui.css
// (a Karma global style, so the stand-in only needs the `.ix-blue.fc-ui` root <body> carries). The
// three buttons are hlmBtn tiers (outline Add / ghost icon Delete / outline toggle); the flat
// `#security-keys-page button` repaint that beat every layered tier (the #396 trap) is gone, and this
// stand-in pins the tiers in position so it cannot come back unnoticed.
@Component({
  standalone: true,
  imports: [HlmButtonImports, MatIconModule],
  template: `
    <section id="security-keys-page" class="fc-page fc-page--capped" aria-labelledby="security-keys-title">
      <header class="fc-page-header">
        <h1 id="security-keys-title" class="fc-page-title">Security Keys</h1>
        <button hlmBtn variant="outline" type="button" id="add-key">Add Security Key</button>
      </header>
      <div class="fc-security-intro">
        <p>Security keys are a second factor.</p>
        <p>Either a key or a code is required.</p>
      </div>
      <p class="fc-page-notice fc-page-notice--warn" role="status" id="totp-notice">Two-factor authentication must be enabled first.</p>
      <dl class="fc-security-status">
        <div><dt>Status:</dt><dd id="status-value">Disabled</dd></div>
      </dl>
      <div class="fc-security-table" tabindex="0" role="region" aria-label="Security Keys">
        <table>
          <caption class="cdk-visually-hidden">Security Keys</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Created</th>
              <th scope="col">Last Used</th>
              <th scope="col"><span class="cdk-visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Review key</td>
              <td>Sep 19, 2026, 10:00:00 AM</td>
              <td>Never</td>
              <td class="fc-security-row-action">
                <button hlmBtn variant="ghost" size="icon" type="button" id="delete-key" aria-label="Delete Review key">
                  <mat-icon aria-hidden="true">delete</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="fc-security-actions">
        <button hlmBtn variant="outline" type="button" id="toggle-key">Enable WebAuthn</button>
      </div>
      <p class="fc-security-recovery">Keep a recovery method.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
})
class SecurityKeysStandIn {}

describe('Security Keys layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4', '--yellow': '#D6AD4C',
  };

  async function mount(width: number): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [SecurityKeysStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(SecurityKeysStandIn);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = `position:fixed; top:0; left:0; width:${width}px; z-index:1`;
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);
  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);
  const right = (el: Element): number => Math.round(el.getBoundingClientRect().right - root.getBoundingClientRect().left);

  it('is the capped page with the one title voice and the outline Add at the header\'s right edge', async () => {
    await mount(1200);
    const page = q('#security-keys-page');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    expect(page.getBoundingClientRect().width).toBe(1120);
    const header = q('header.fc-page-header');
    const headerStyle = getComputedStyle(header);
    expect(headerStyle.display).toBe('flex');
    expect(headerStyle.justifyContent).toBe('space-between');
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(title.marginBottom).toBe('0px'); // the header owns the spacing
    expect(left(q('h1.fc-page-title'))).toBe(0);
    // the ONE action: the outline tier, 32px, transparent on the --line hairline, at the header's right edge
    const add = q('#add-key');
    expect(add.getAttribute('type')).toBe('button');
    expect(add.classList.contains('border-border')).toBeTrue(); // the outline tier (hlm-button.ts)
    const addStyle = getComputedStyle(add);
    expect(Math.round(add.getBoundingClientRect().height)).toBe(32);
    expect(addStyle.borderTopWidth).toBe('1px');
    expect(addStyle.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(addStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(right(add)).toBe(right(header));
    expect(right(add)).toBe(1120);
    expect(host.querySelector('mat-card, .mat-mdc-button, [mat-button], [mat-icon-button]')).toBeNull();
  });

  it('states the status as the boot-status facts dl and the notice as the shared warn notice', async () => {
    await mount(1200);
    const dl = getComputedStyle(q('dl.fc-security-status'));
    expect(dl.display).toBe('flex');
    expect(dl.flexWrap).toBe('wrap');
    expect(dl.columnGap).toBe('40px');
    expect(dl.rowGap).toBe('18px');
    const dt = getComputedStyle(q('.fc-security-status dt'));
    expect(dt.fontSize).toBe('12px');
    expect(dt.color).toBe('rgb(151, 166, 174)'); // fg2, the label voice
    const dd = getComputedStyle(q('#status-value'));
    expect(dd.marginTop).toBe('8px');
    expect(dd.fontSize).toBe('14px'); // the fact value = the inherited body size, one voice on every dl page
    expect(dd.marginLeft).toBe('0px'); // the UA's 40px indent is gone
    expect(left(q('.fc-security-status dt'))).toBe(0);
    const intro = getComputedStyle(q('.fc-security-intro'));
    expect(intro.fontSize).toBe('13px');
    expect(intro.color).toBe('rgb(151, 166, 174)');
    expect(intro.maxWidth).toBe('800px');
    const notice = getComputedStyle(q('#totp-notice'));
    expect(notice.display).toBe('block');
    expect(notice.borderLeftWidth).toBe('2px');
    expect(notice.borderTopWidth).toBe('1px');
    expect(notice.paddingLeft).toBe('16px');
    expect(notice.marginTop).toBe('18px');
    expect(notice.color).toBe('rgb(220, 227, 230)'); // the warn notice voice is fg1
  });

  it('draws the shell-styled table on hairlines with the ghost icon Delete, 32px square, its glyph 20px', async () => {
    await mount(1200);
    const table = getComputedStyle(q('table'));
    expect(table.borderCollapse).toBe('collapse');
    expect(table.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const th = getComputedStyle(q('th'));
    expect(th.fontSize).toBe('12px');
    expect(th.fontWeight).toBe('400');
    expect(th.color).toBe('rgb(151, 166, 174)');
    expect(th.borderBottomWidth).toBe('1px');
    expect(th.borderBottomColor).toBe('rgb(42, 53, 61)');
    expect(th.textAlign).toBe('left');
    expect(Math.round(q('th').getBoundingClientRect().height)).toBeGreaterThanOrEqual(40); // the 40px header row (collapsed borders may add a half-line)
    expect(Math.round(q('th').getBoundingClientRect().height)).toBeLessThanOrEqual(41);
    const td = getComputedStyle(q('tbody td'));
    expect(td.fontSize).toBe('13px');
    expect(td.color).toBe('rgb(220, 227, 230)');
    expect(td.borderBottomWidth).toBe('1px');
    expect(td.borderBottomColor).toBe('rgb(42, 53, 61)');
    expect(Math.round(q('tbody td').getBoundingClientRect().height)).toBeGreaterThanOrEqual(50); // the 50px row
    expect(Math.round(q('tbody td').getBoundingClientRect().height)).toBeLessThanOrEqual(51);
    // the row action: the ghost icon tier, no hairline of its own, the mat-icon glyph sized by the page rule
    const cell = q('.fc-security-row-action');
    expect(getComputedStyle(cell).textAlign).toBe('right');
    const remove = q('#delete-key');
    expect(remove.getAttribute('type')).toBe('button');
    expect(remove.getAttribute('aria-label')).toBe('Delete Review key');
    expect(remove.classList.contains('text-muted-foreground')).toBeTrue(); // the ghost tier (hlm-button.ts)
    expect(remove.classList.contains('border-border')).toBeFalse();
    expect(Math.round(remove.getBoundingClientRect().height)).toBe(32);
    expect(Math.round(remove.getBoundingClientRect().width)).toBe(32);
    const removeStyle = getComputedStyle(remove);
    expect(removeStyle.borderTopColor).toBe('rgba(0, 0, 0, 0)');
    expect(removeStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(removeStyle.color).toBe('rgb(151, 166, 174)'); // fg2 at rest
    expect(right(cell) - right(remove)).toBeGreaterThanOrEqual(13); // on the cell's right padding edge (14px)
    expect(right(cell) - right(remove)).toBeLessThanOrEqual(15);
    const glyph = getComputedStyle(remove.querySelector('.mat-icon'));
    expect(glyph.width).toBe('20px');
    expect(glyph.height).toBe('20px');
    expect(glyph.fontSize).toBe('20px');
    expect(glyph.lineHeight).toBe('20px');
  });

  it('closes with the outline toggle on the actions row and the recovery note in the fg2 voice', async () => {
    await mount(1200);
    const actions = getComputedStyle(q('.fc-security-actions'));
    expect(actions.display).toBe('flex');
    expect(actions.columnGap).toBe('8px');
    expect(actions.marginTop).toBe('24px');
    const toggle = q('#toggle-key');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.classList.contains('border-border')).toBeTrue(); // the outline tier
    const toggleStyle = getComputedStyle(toggle);
    expect(Math.round(toggle.getBoundingClientRect().height)).toBe(32);
    expect(toggleStyle.borderTopWidth).toBe('1px');
    expect(toggleStyle.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(toggleStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(left(toggle)).toBe(0);
    const recovery = getComputedStyle(q('.fc-security-recovery'));
    expect(recovery.fontSize).toBe('12px');
    expect(recovery.color).toBe('rgb(151, 166, 174)');
    expect(recovery.maxWidth).toBe('800px');
  });

  it('keeps the table region scrollable inside a narrow page', async () => {
    await mount(320);
    const region = q('.fc-security-table');
    expect(getComputedStyle(region).overflowX).toBe('auto');
    expect(region.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    expect(Math.round(q('table').getBoundingClientRect().width)).toBe(620); // the min-width the region scrolls
  });
});
