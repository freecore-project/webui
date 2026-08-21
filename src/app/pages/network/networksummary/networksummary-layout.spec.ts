import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// the internal development record: Network Summary (networksummary.component.html) is the boot-status shape --
// the capped page, the h1, the facts dl (default routes, nameservers) and the interfaces table bare
// under the section in the Security Keys voice -- drawn by networksummary.component.css through
// styleUrls, exactly as the page, over the shell layer freecore-ui.css (a Karma global style, so the
// stand-in only needs the `.ix-blue.fc-ui` root <body> carries). The stand-in mirrors the page's
// markup with two routes, one nameserver and two interfaces; `empty` flips the table to its empty row.
@Component({
  standalone: true,
  template: `
    <section id="network-summary-page" class="fc-page fc-page--capped" aria-labelledby="network-summary-title">
      <h1 id="network-summary-title" class="fc-page-title">Network Summary</h1>
      <dl class="fc-network-facts">
        <div id="routes">
          <dt>Default Routes</dt>
          <dd>192.0.2.1</dd>
          <dd>2001:db8::1</dd>
        </div>
        <div id="nameservers">
          <dt>Nameservers</dt>
          <dd>192.0.2.53</dd>
        </div>
      </dl>
      <h2 id="network-summary-interfaces-title">Interfaces</h2>
      <div class="fc-network-table" tabindex="0" role="region" aria-labelledby="network-summary-interfaces-title">
        <table>
          <caption class="cdk-visually-hidden">Interfaces</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">IPv4 Address</th>
              <th scope="col">IPv6 Address</th>
            </tr>
          </thead>
          <tbody>
            @if (!empty) {
              <tr id="row-0">
                <td>em0</td>
                <td><div>192.0.2.10/24</div><div>192.0.2.11/24</div></td>
                <td><div>2001:db8::10/64</div></td>
              </tr>
              <tr id="row-1">
                <td>bridge0</td>
                <td><div>192.0.2.1/24</div></td>
                <td></td>
              </tr>
            } @else {
              <tr class="fc-network-empty" id="row-empty">
                <td colspan="3">None</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./networksummary.component.css'],
})
class NetworkSummaryStandIn {
  empty = false;
}

describe('Network Summary layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  async function mount(width: number, empty = false): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [NetworkSummaryStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(NetworkSummaryStandIn);
    fixture.componentInstance.empty = empty;
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
  const all = (sel: string): HTMLElement[] => Array.from(host.querySelectorAll<HTMLElement>(sel));
  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);
  const width = (el: Element): number => Math.round(el.getBoundingClientRect().width);

  it('is the capped page under the one title voice, no card, no list', async () => {
    await mount(1200);
    const page = q('#network-summary-page');
    const s = getComputedStyle(page);
    expect(s.maxWidth).toBe('1120px');
    expect(s.marginLeft).toBe('0px');
    expect(left(page)).toBe(0);
    expect(width(page)).toBe(1120);
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(title.marginBottom).toBe('30px');
    expect(host.querySelector('mat-card, mat-list, mat-list-item, mat-divider, mat-icon')).toBeNull();
  });

  it('lists the routes and nameservers as the boot-status facts dl', async () => {
    await mount(1200);
    const dl = getComputedStyle(q('dl.fc-network-facts'));
    expect(dl.display).toBe('flex');
    expect(dl.flexWrap).toBe('wrap');
    expect(dl.rowGap).toBe('18px');
    expect(dl.columnGap).toBe('40px');
    expect(dl.marginBottom).toBe('28px');
    for (const dt of all('dt')) {
      const t = getComputedStyle(dt);
      expect(t.fontSize).withContext(dt.textContent).toBe('12px');
      expect(t.color).withContext(dt.textContent).toBe('rgb(151, 166, 174)');
    }
    const dds = all('#routes dd');
    expect(dds.length).toBe(2);
    for (const dd of dds) {
      expect(getComputedStyle(dd).marginTop).withContext(dd.textContent).toBe('8px');
      expect(getComputedStyle(dd).marginLeft).withContext(dd.textContent).toBe('0px');
    }
    expect(getComputedStyle(q('#nameservers dd')).marginTop).toBe('8px');
    expect(getComputedStyle(q('#nameservers dd')).fontSize).toBe('14px'); // the fact value = the inherited body size, one voice on every dl page
    // the two groups sit side by side, 40px apart
    expect(left(q('#nameservers'))).toBe(left(q('#routes')) + width(q('#routes')) + 40);
  });

  it('heads the interfaces in the 15/400 fg1 section voice', async () => {
    await mount(1200);
    const h2 = getComputedStyle(q('#network-summary-interfaces-title'));
    expect(h2.fontSize).toBe('15px');
    expect(h2.fontWeight).toBe('400');
    expect(h2.color).toBe('rgb(220, 227, 230)');
    expect(h2.marginTop).toBe('0px');
    expect(h2.marginBottom).toBe('12px');
    expect(q('.fc-network-table').getAttribute('aria-labelledby')).toBe('network-summary-interfaces-title');
  });

  it('draws the interfaces as the Security Keys table: full width, hairline rows, 20 / 40 / 40, no zebra', async () => {
    await mount(1200);
    const table = q('table');
    const t = getComputedStyle(table);
    expect(t.borderCollapse).toBe('collapse');
    expect(t.minWidth).toBe('620px');
    expect(width(table)).toBe(1120);
    expect(getComputedStyle(q('.fc-network-table')).overflowX).toBe('auto');
    const ths = all('th');
    expect(ths.length).toBe(3);
    for (const th of ths) {
      const s = getComputedStyle(th);
      expect(s.fontSize).withContext(th.textContent).toBe('12px');
      expect(s.fontWeight).withContext(th.textContent).toBe('400');
      expect(s.color).withContext(th.textContent).toBe('rgb(151, 166, 174)');
      expect(s.textAlign).withContext(th.textContent).toBe('left');
      expect(s.paddingLeft).withContext(th.textContent).toBe('14px');
      expect(s.borderBottomWidth).withContext(th.textContent).toBe('1px');
      expect(s.borderBottomColor).withContext(th.textContent).toBe('rgb(42, 53, 61)');
      const thHeight = Math.round(th.getBoundingClientRect().height); // border-collapse can add the half border
      expect(thHeight).withContext(th.textContent).toBeGreaterThanOrEqual(40);
      expect(thHeight).withContext(th.textContent).toBeLessThanOrEqual(41);
    }
    expect(left(ths[0])).toBe(left(q('#network-summary-page')));
    expect(width(ths[0])).toBe(224); // 20% of 1120
    expect(width(ths[1])).toBe(448);
    expect(width(ths[2])).toBe(448);
    for (const td of all('#row-0 td, #row-1 td')) {
      const s = getComputedStyle(td);
      expect(s.fontSize).withContext(td.textContent).toBe('13px');
      expect(s.color).withContext(td.textContent).toBe('rgb(220, 227, 230)');
      expect(s.borderBottomWidth).withContext(td.textContent).toBe('1px');
      expect(s.borderBottomColor).withContext(td.textContent).toBe('rgb(42, 53, 61)');
      expect(Math.round(td.getBoundingClientRect().height)).withContext(td.textContent).toBeGreaterThanOrEqual(50);
    }
    // the name cell wraps, the address cells do not
    expect(getComputedStyle(q('#row-0 td:first-child')).overflowWrap).toBe('anywhere');
    expect(getComputedStyle(q('#row-0 td:nth-child(2)')).whiteSpace).toBe('nowrap');
    // two addresses stack as blocks inside one cell
    const addresses = all('#row-0 td:nth-child(2) div');
    expect(addresses.length).toBe(2);
    expect(addresses[1].getBoundingClientRect().top).toBeGreaterThan(addresses[0].getBoundingClientRect().top);
    // no zebra: every row is transparent at rest, the hover is the theme's --fc-hover
    for (const tr of all('tbody tr')) {
      expect(getComputedStyle(tr).backgroundColor).withContext(tr.id).toBe('rgba(0, 0, 0, 0)');
    }
    const hoverRules = Array.from(document.styleSheets)
      .flatMap((sheet) => { try { return Array.from(sheet.cssRules); } catch { return []; } })
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      // emulated encapsulation rewrites `tr:hover` to `tr[_ngcontent-x]:hover`, so match the attribute in between
      .filter((rule) => rule.selectorText.includes('#network-summary-page') && /\btr(\[[^\]]*\])?:hover\b/.test(rule.selectorText));
    expect(hoverRules.some((rule) => rule.cssText.includes('var(--fc-hover)'))).toBeTrue();
  });

  it('shows one muted empty row across the table when there are no interfaces', async () => {
    await mount(1200, true);
    expect(host.querySelector('#row-0')).toBeNull();
    const cell = q('#row-empty td');
    expect(cell.getAttribute('colspan')).toBe('3');
    expect(width(cell)).toBe(1120);
    expect(getComputedStyle(cell).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(cell).fontSize).toBe('13px');
  });
});
