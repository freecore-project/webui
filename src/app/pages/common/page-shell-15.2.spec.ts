import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';

// the internal development record: the page shell -- one title voice (.fc-page-title / .fc-settings-title), the
// header-with-action row (.fc-page-header), the notice box (.fc-page-notice, --warn) and the tabbed
// host (.fc-tabbed: a pane under the tab bar carries no title). freecore-ui.css is a Karma global
// style, so the stand-ins only need an `.ix-blue.fc-ui` root like <body>.

@Component({
  standalone: true,
  imports: [MatCardModule],
  template: `
    <section id="shell-page" class="fc-page fc-page--capped">
      <header class="fc-page-header"><h1 class="fc-page-title">Security Keys</h1><button id="header-action" type="button">Add</button></header>
      <p id="notice-p" class="fc-page-notice fc-page-notice--warn">Security keys need a TOTP secret.</p>
      <section id="notice-card" class="fc-page-notice fc-page-notice--warn">
        <p>There are pending network changes.</p>
        <div class="fc-notice-actions buttons"><button id="notice-save" type="button">Save</button><button type="button">Revert</button></div>
      </section>
      <div id="notice-plain" class="fc-page-notice"><p><strong>Available Memory:</strong> 5 GiB</p></div>
      <h2 id="services-title" class="fc-services-title fc-page-title">Services</h2>
    </section>
    <section id="tabbed" class="fc-page fc-tabbed">
      <nav class="fc-tab-bar"><a class="fc-tab">Portals</a></nav>
      <div class="material mat-card mat-card-table fc-records"><div class="entity-table-toolbar-layout"><h2 class="entity-table-title-layout">Portals</h2><div class="entity-table-controls-layout"><div id="filter" class="fc-table-search">filter</div></div></div></div>
      <entity-form><div class="form-card fc-settings-form"><h1 class="fc-settings-title">Target Global Configuration</h1><div class="mat-content"><div class="fieldset-container"><section class="fc-settings-section" id="first-section"><h2>Global</h2></section><section class="fc-settings-section" id="second-section"><h2>More</h2></section></div></div></div></entity-form>
    </section>
  `,
})
class ShellStandIn {}

describe('page shell (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--yellow': '#E0B94F', '--primary': '#4E93C4' };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [ShellStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(ShellStandIn);
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

  it('speaks one title voice on the h1, the services h2 and the list title', () => {
    for (const sel of ['h1.fc-page-title', '#services-title']) {
      const s = getComputedStyle(q(sel));
      expect(s.fontSize).withContext(sel).toBe('27px');
      expect(s.fontWeight).withContext(sel).toBe('400');
      expect(s.letterSpacing).withContext(sel).toBe('-0.55px');
      expect(s.color).withContext(sel).toBe('rgb(220, 227, 230)');
    }
    expect(getComputedStyle(q('#services-title')).marginBottom).toBe('16px'); // the list pitch
    const page = q('#shell-page');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(getComputedStyle(page).minWidth).toBe('0px');
    expect(left(page)).toBe(0);
  });

  it('puts the header action on the title row, at the right', () => {
    const header = q('.fc-page-header');
    const title = q('.fc-page-header .fc-page-title');
    const action = q('#header-action');
    const s = getComputedStyle(header);
    expect(s.display).toBe('flex');
    expect(s.justifyContent).toBe('space-between');
    expect(s.marginBottom).toBe('24px');
    expect(getComputedStyle(title).marginBottom).toBe('0px');
    const mid = (el: Element): number => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
    expect(Math.abs(mid(action) - mid(title))).toBeLessThan(12);
    expect(Math.round(header.getBoundingClientRect().right - action.getBoundingClientRect().right)).toBe(0);
  });

  it('draws every notice as the same hairline box, the warn edge only where asked, the actions on the text edge', () => {
    for (const sel of ['#notice-p', '#notice-card', '#notice-plain']) {
      const el = q(sel);
      const s = getComputedStyle(el);
      expect(s.display).withContext(sel).toBe('block');
      expect(s.borderTopWidth).withContext(sel).toBe('1px');
      expect(s.borderTopColor).withContext(sel).toBe('rgb(42, 53, 61)');
      expect(s.borderTopLeftRadius).withContext(sel).toBe('6px');
      expect(s.paddingLeft).withContext(sel).toBe('16px');
      expect(s.paddingTop).withContext(sel).toBe('14px');
      expect(s.fontSize).withContext(sel).toBe('13px');
      expect(s.backgroundColor).withContext(sel).toBe('rgba(0, 0, 0, 0)');
      expect(s.boxShadow === 'none' || s.boxShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?/g, '') === '').withContext(sel).toBeTrue();
      expect(s.textAlign).withContext(sel).not.toBe('center');
      expect(left(el)).withContext(sel).toBe(0);
    }
    expect(getComputedStyle(q('#notice-p')).borderLeftWidth).toBe('2px');
    expect(getComputedStyle(q('#notice-card')).borderLeftWidth).toBe('2px');
    expect(getComputedStyle(q('#notice-plain')).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(q('#notice-plain')).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(q('#notice-p')).color).toBe('rgb(220, 227, 230)');
    const actions = q('#notice-card .fc-notice-actions');
    expect(getComputedStyle(actions).paddingLeft).toBe('0px');
    expect(getComputedStyle(actions).minHeight).toBe('0px');
    expect(Math.round(q('#notice-save').getBoundingClientRect().left - q('#notice-card p').getBoundingClientRect().left)).toBeLessThanOrEqual(1);
  });

  it('suppresses a pane title under the tab bar and starts the pane 26px under it without a second rule', () => {
    expect(getComputedStyle(q('#tabbed .entity-table-title-layout')).display).toBe('none');
    expect(getComputedStyle(q('#tabbed .fc-settings-title')).display).toBe('none');
    expect(getComputedStyle(q('#tabbed .fc-tab-bar')).marginBottom).toBe('26px'); // the internal development record: the bar off Material
    expect(getComputedStyle(q('#first-section')).borderTopWidth).toBe('0px');
    expect(getComputedStyle(q('#first-section')).paddingTop).toBe('0px');
    // the second section keeps the engine's own hairline (entity-form.component.scss, pinned by the settings spec)
  });
});
