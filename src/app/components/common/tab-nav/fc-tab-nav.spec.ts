import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FC_TAB_NAV } from './fc-tab-nav.component';

// the internal development record: the route tab bars off Material. What mat-tab-nav-bar drew under the #375 vocabulary is
// restated -- 42px tabs over the 1px hairline, 13px/400 labels fg2 -> fg1, 16px sides, the stretched halves
// (Rsync) or content-width tabs (iSCSI), the 1px fg2 underline where it showed -- and what it did: one tab stop
// moved by the arrow keys, tablist/tab/tabpanel wiring with a pane (Space opens), aria-current without one, and
// the paginator arrows when the tabs overflow. freecore-ui.css is a Karma global; the root is the <body> stand-in.
@Component({
  standalone: true,
  imports: [...FC_TAB_NAV],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <nav id="plain" fcTabNav stretch>
      @for (link of plain; track link) {
        <a fcTabLink href="#" [active]="plainActive === link" (click)="plainActive = link; $event.preventDefault()">{{ link }}</a>
      }
    </nav>
    <nav id="paned" fcTabNav [panel]="pane" [underline]="false" aria-label="iSCSI" [style.width.px]="panedWidth">
      @for (link of tabs; track link) {
        <a fcTabLink href="#" [active]="tabActive === link" (click)="tabActive = link; $event.preventDefault()">{{ link }}</a>
      }
    </nav>
    <div id="pane" fcTabNavPanel #pane="fcTabNavPanel">pane</div>
  `,
})
class TabNavHostComponent {
  plain = ['Configure', 'Rsync Module'];
  plainActive = 'Configure';
  tabs = ['Target Global Configuration', 'Portals', 'Initiators Groups', 'Authorized Access', 'Targets', 'Extents', 'Associated Targets'];
  tabActive = 'Target Global Configuration';
  panedWidth = 1000;
}

describe('tab nav bar (the internal development record)', () => {
  let fixture: ComponentFixture<TabNavHostComponent>;
  let root: HTMLElement;
  const ladder = { '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };
  const FG1 = 'rgb(220, 227, 230)';
  const FG2 = 'rgb(151, 166, 174)';
  const q = (sel: string): HTMLElement => root.querySelector<HTMLElement>(sel);
  const links = (bar: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(`${bar} a`));
  const textWidth = (el: HTMLElement): number => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().width;
  };
  const frames = (n = 2): Promise<void> => new Promise((resolve) => {
    const step = (left: number): void => { if (left) requestAnimationFrame(() => step(left - 1)); else resolve(); };
    step(n);
  });
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await frames();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const key = (el: HTMLElement, name: string, keyCode: number): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { get: () => keyCode });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    await TestBed.configureTestingModule({ imports: [TabNavHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabNavHostComponent);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = 'position:fixed; top:0; left:0; width:1000px; z-index:1';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    root.remove();
    Object.keys(ladder).forEach((name) => document.documentElement.style.removeProperty(name));
  });

  it('draws the plain bar as mat-tab-nav-bar did: stretched halves over the hairline, fg1 active, the fg2 underline, aria-current', () => {
    const bar = q('#plain');
    expect(root.querySelector('.mat-mdc-tab-nav-bar, .mat-mdc-tab-link')).toBeNull();
    expect(Math.round(bar.getBoundingClientRect().height)).toBe(43);
    expect([getComputedStyle(bar).borderBottomWidth, getComputedStyle(bar).borderBottomColor]).toEqual(['1px', 'rgb(42, 53, 61)']);
    expect(bar.getAttribute('role')).toBeNull();

    const [active, other] = links('#plain');
    for (const link of [active, other]) {
      const s = getComputedStyle(link);
      expect(Math.round(link.getBoundingClientRect().height)).toBe(42);
      expect([s.fontSize, s.fontWeight, s.paddingLeft, s.paddingRight, s.backgroundColor, s.textTransform, s.whiteSpace])
        .toEqual(['13px', '400', '16px', '16px', 'rgba(0, 0, 0, 0)', 'none', 'nowrap']);
    }
    // stretched: the halves fill the bar and share the free width equally over their own widths
    expect(Math.round(active.getBoundingClientRect().width + other.getBoundingClientRect().width)).toBe(1000);
    expect(Math.abs((active.getBoundingClientRect().width - textWidth(active)) - (other.getBoundingClientRect().width - textWidth(other)))).toBeLessThan(1);
    expect(getComputedStyle(active).color).toBe(FG1);
    expect(getComputedStyle(other).color).toBe(FG2);

    const line = getComputedStyle(active, '::after');
    expect([line.position, line.bottom, line.left, line.right, line.borderTopWidth, line.borderTopStyle, line.borderTopColor])
      .toEqual(['absolute', '0px', '0px', '0px', '1px', 'solid', FG2]);
    expect(getComputedStyle(other, '::after').content).toBe('none');

    expect([active.getAttribute('aria-current'), other.getAttribute('aria-current')]).toEqual(['page', null]);
    expect([active.getAttribute('role'), active.getAttribute('aria-selected')]).toEqual([null, null]);
    expect([active.tabIndex, other.tabIndex]).toEqual([0, -1]);
  });

  it('wires the paned bar as a tablist of content-width tabs that controls the pane, with no underline', () => {
    const bar = q('#paned');
    const pane = q('#pane');
    const tabs = links('#paned');
    expect([bar.getAttribute('role'), bar.getAttribute('aria-label')]).toEqual(['tablist', 'iSCSI']);
    expect(pane.getAttribute('role')).toBe('tabpanel');
    expect(pane.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(tabs.map((t) => t.getAttribute('role'))).toEqual(tabs.map(() => 'tab'));
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false']);
    expect(tabs.every((t) => t.getAttribute('aria-controls') === pane.id)).toBeTrue();
    expect(tabs[0].getAttribute('aria-current')).toBeNull();
    expect(Math.round(tabs[0].getBoundingClientRect().left - bar.getBoundingClientRect().left)).toBe(0);
    for (const tab of tabs) {
      expect(Math.round(tab.getBoundingClientRect().width - textWidth(tab))).toBe(32);
      expect(getComputedStyle(tab, '::after').content).toBe('none');
    }

    tabs[1].click();
    fixture.detectChanges();
    expect(tabs.map((t) => t.getAttribute('aria-selected')).slice(0, 2)).toEqual(['false', 'true']);
    expect(pane.getAttribute('aria-labelledby')).toBe(tabs[1].id);
    expect(tabs.map((t) => t.tabIndex).slice(0, 3)).toEqual([-1, 0, -1]);
  });

  it('moves one tab stop along the bar with the arrow keys, Home and End, wrapping at the ends', async () => {
    const tabs = links('#paned');
    tabs[0].focus();
    key(tabs[0], 'ArrowRight', 39);
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs.map((t) => t.tabIndex).slice(0, 2)).toEqual([-1, 0]);
    await new Promise((resolve) => setTimeout(resolve, 250)); // the 150ms label fade
    expect(getComputedStyle(tabs[1]).color).toBe(FG1); // a focused tab reads fg1
    key(tabs[1], 'End', 35);
    expect(document.activeElement).toBe(tabs[6]);
    key(tabs[6], 'ArrowRight', 39);
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], 'ArrowLeft', 37);
    expect(document.activeElement).toBe(tabs[6]);
    key(tabs[6], 'Home', 36);
    expect(document.activeElement).toBe(tabs[0]);
    expect(fixture.componentInstance.tabActive).toBe('Target Global Configuration'); // moving focus opens nothing
  });

  it('opens a paned tab on Space and leaves a plain nav link to the browser', () => {
    const tabs = links('#paned');
    tabs[3].focus();
    const space = key(tabs[3], ' ', 32);
    expect(space.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.tabActive).toBe('Authorized Access');

    const plain = links('#plain');
    plain[1].focus();
    const plainSpace = key(plain[1], ' ', 32);
    expect(plainSpace.defaultPrevented).toBeFalse();
    expect(fixture.componentInstance.plainActive).toBe('Configure');
  });

  it('pages an overflowing bar with the paginator arrows and drops them when the tabs fit again', async () => {
    const bar = q('#paned');
    const before = bar.querySelector<HTMLElement>('.fc-tab-nav-pagination--before');
    const after = bar.querySelector<HTMLElement>('.fc-tab-nav-pagination--after');
    const viewport = bar.querySelector<HTMLElement>('.fc-tab-nav-viewport');
    expect(getComputedStyle(before).display).toBe('none');

    fixture.componentInstance.panedWidth = 358;
    await settle();
    expect(bar.classList).toContain('fc-tab-nav--paginated');
    expect([Math.round(before.getBoundingClientRect().width), Math.round(before.getBoundingClientRect().height)]).toEqual([36, 42]);
    expect(Math.round(viewport.getBoundingClientRect().width)).toBe(358 - 72);
    const chevron = (arrow: HTMLElement): CSSStyleDeclaration => getComputedStyle(arrow.querySelector('.fc-tab-nav-chevron'));
    expect([chevron(before).opacity, chevron(after).opacity]).toEqual(['0.4', '1']); // at the start
    expect([chevron(after).borderTopWidth, chevron(after).borderRightWidth, chevron(after).borderBottomWidth, chevron(after).borderTopColor])
      .toEqual(['2px', '2px', '0px', FG2]);

    after.click();
    await new Promise((resolve) => setTimeout(resolve, 900)); // the smooth scroll
    await settle();
    expect(Math.abs(viewport.scrollLeft - 286 / 3)).toBeLessThan(2); // a third of the view
    expect(chevron(before).opacity).toBe('1');

    fixture.componentInstance.panedWidth = 1000;
    await settle();
    await frames();
    fixture.detectChanges();
    expect(bar.classList).not.toContain('fc-tab-nav--paginated');
    expect(getComputedStyle(after).display).toBe('none');
    expect(viewport.scrollLeft).toBe(0);
  });

  it('scrolls the active tab into view on an overflowing bar', async () => {
    fixture.componentInstance.panedWidth = 358;
    await settle();
    fixture.componentInstance.tabActive = 'Targets';
    await settle();
    const viewport = q('#paned .fc-tab-nav-viewport').getBoundingClientRect();
    const target = links('#paned')[4].getBoundingClientRect();
    expect(target.left).toBeGreaterThanOrEqual(viewport.left - 0.5);
    expect(target.right).toBeLessThanOrEqual(viewport.right + 0.5);
  });
});
