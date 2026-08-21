import { Component, ViewEncapsulation } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

// the internal development record: the sidebar vocabulary on the shell geometry tokens.
// The host reproduces the rendered navigation DOM and loads the production
// stylesheets in bundle order, so the 15.2 layer has to beat the inherited
// 48px rows the same way it does in the application. The theme (ix-blue.scss,
// a global test style) scopes on .ix-blue, which the host carries like <body>
// does -- the internal development record was passed by a fixture the theme never reached.
@Component({
  standalone: false,
  selector: 'navigation-15-2-test-host',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../assets/styles/fn-styles.css',
    '../../../../assets/styles/material-reduction.css',
    '../../../../assets/styles/freecore-ui.css',
  ],
  template: `
    <div class="ix-blue fc-ui fc-sidenav-container">
      <div class="sidebar-panel fc-sidenav">
        <img class="fc-brand-mark fc-fork-mark" id="brand-mark" src="" alt="">
        <div class="navigation-hold" id="scroll-area">
          <div class="fc-nav-list">
            <div>
              <div class="fc-nav-item sidebar-list-item" id="link-active">
                <div class="fc-nav-item__content"><div class="fc-nav-item__text">
                  <a class="selected"><mat-icon class="mat-icon material-icons">dashboard</mat-icon><span>Dashboard</span></a>
                </div></div>
              </div>
            </div>
            <div>
              <div class="fc-nav-item sidebar-list-item has-submenu" id="group-closed">
                <div class="fc-nav-item__content"><div class="fc-nav-item__text">
                  <a><mat-icon class="mat-icon material-icons">people</mat-icon><span>Accounts</span><span class="navigation-menu-spacer"></span><mat-icon class="mat-icon material-icons menu-caret">chevron_right</mat-icon></a>
                </div></div>
                <div class="fc-nav-list sub-menu">
                  <div class="fc-nav-item"><a>Users</a></div>
                </div>
              </div>
            </div>
            <div>
              <div class="fc-nav-item sidebar-list-item has-submenu open" id="group-open">
                <div class="fc-nav-item__content"><div class="fc-nav-item__text">
                  <a><mat-icon class="mat-icon material-icons">folder_shared</mat-icon><span>Sharing</span><span class="navigation-menu-spacer"></span><mat-icon class="mat-icon material-icons menu-caret">chevron_right</mat-icon></a>
                </div></div>
                <div class="fc-nav-list sub-menu">
                  <div class="fc-nav-item" id="sub-plain"><a>Apple Shares (AFP)</a></div>
                  <div class="fc-nav-item selected" id="sub-selected"><a>Windows Shares (SMB)</a></div>
                  <div class="fc-nav-item" id="sub-disabled"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
class Navigation152HostComponent {}

describe('15.2 navigation vocabulary (the internal development record)', () => {
  let fixture: ComponentFixture<Navigation152HostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };

  const q = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
  const height = (el: Element): number => el.getBoundingClientRect().height;

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    await TestBed.configureTestingModule({ declarations: [Navigation152HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(Navigation152HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((name) => document.documentElement.style.removeProperty(name));
    document.body.classList.remove('collapsed-menu');
  });

  it('sizes top-level rows at 34px and sub-items at 30px, beating the inherited 48px', () => {
    expect(height(q('#link-active a'))).toBe(34);
    expect(height(q('#group-closed'))).toBe(34);
    expect(height(q('#sub-plain a'))).toBe(30);
    expect(height(q('#sub-selected'))).toBe(30);
    expect(getComputedStyle(q('#link-active a')).fontSize).toBe('13px');
    expect(getComputedStyle(q('#sub-plain a')).fontSize).toBe('12.5px');
  });

  it('draws 18px icons at .7 and lifts them to full strength on the open group and the active link', () => {
    const closedIcon = q('#group-closed a mat-icon:not(.menu-caret)');
    expect(closedIcon.getBoundingClientRect().width).toBe(18);
    expect(getComputedStyle(closedIcon).fontSize).toBe('18px');
    expect(getComputedStyle(closedIcon).opacity).toBe('0.7');
    expect(getComputedStyle(q('#group-open a mat-icon:not(.menu-caret)')).opacity).toBe('1');
    expect(getComputedStyle(q('#link-active a mat-icon')).opacity).toBe('1');
  });

  it('aligns sub-item text with the top-level label column', () => {
    const label = q('#group-open a span');
    const subText = q('#sub-plain a');
    expect(Math.abs(label.getBoundingClientRect().left - (subText.getBoundingClientRect().left + parseFloat(getComputedStyle(subText).paddingLeft)))).toBeLessThan(1);
  });

  it('marks the active link and the selected sub-item with a 2px accent bar, and hangs the group on a 1px rail', () => {
    const bar = getComputedStyle(q('#link-active a'), '::before');
    expect(bar.width).toBe('2px');
    expect(bar.backgroundColor).toBe('rgb(143, 180, 199)');
    const subBar = getComputedStyle(q('#sub-selected'), '::after');
    expect(subBar.width).toBe('2px');
    expect(subBar.backgroundColor).toBe('rgb(143, 180, 199)');
    expect(getComputedStyle(q('#sub-selected')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#sub-selected a')).color).toBe('rgb(220, 227, 230)');
    const rail = getComputedStyle(q('#group-open .sub-menu'), '::before');
    expect(rail.width).toBe('1px');
    expect(rail.backgroundColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(q('#sub-plain'), '::after').content).toBe('none');
    expect(getComputedStyle(q('#sub-plain a')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps the rail on the canvas and paints only an expanded group on the panel step', () => {
    // the internal development record
    expect(getComputedStyle(q('#scroll-area')).backgroundColor).toBe('rgb(11, 15, 19)');
    expect(getComputedStyle(q('#group-open')).backgroundColor).toBe('rgb(16, 21, 26)');
    expect(getComputedStyle(q('#group-closed')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#link-active')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#group-open > .fc-nav-item__content')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    // The theme's `.ix-blue .fc-nav-list a { background: bg2 }` (was .mat-mdc-nav-list, #485) must not reach the rows.
    expect(getComputedStyle(q('#group-closed a')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#group-open a')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#link-active a')).backgroundColor).not.toBe('rgb(23, 30, 36)');
  });

  it('leaves the brand mark its colours -- no grayscale, no dimming (the internal development record)', () => {
    expect(getComputedStyle(q('#brand-mark')).filter).toBe('none');
    expect(getComputedStyle(q('#brand-mark')).opacity).toBe('1');
  });

  it('gives a disabled sub-item, rendered without its anchor, no row at all', () => {
    expect(getComputedStyle(q('#sub-disabled')).display).toBe('none');
    expect(height(q('#sub-disabled'))).toBe(0);
    expect(height(q('#group-open .sub-menu'))).toBe(60);
  });

  it('gives an open group no backdrop on the collapsed rail, whose flyout has its own', () => {
    document.body.classList.add('collapsed-menu');
    expect(getComputedStyle(q('#group-open')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('#group-open .sub-menu')).backgroundColor).toBe('rgb(23, 30, 36)');
  });

  it('turns the 14px chevron 90 degrees when the group is open', () => {
    const closed = q('#group-closed .menu-caret');
    const open = q('#group-open .menu-caret');
    expect(getComputedStyle(closed).fontSize).toBe('14px');
    expect(getComputedStyle(closed).transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
    expect(getComputedStyle(open).transform).toBe('matrix(0, 1, -1, 0, 0, 0)');
  });

  it('centres the icon in the collapsed 48px rail', () => {
    document.body.classList.add('collapsed-menu');
    const icon = q('#group-closed a mat-icon:not(.menu-caret)');
    const styles = getComputedStyle(icon);
    expect(styles.marginLeft).toBe('15px');
    expect(styles.marginRight).toBe('15px');
    expect(height(q('#group-closed'))).toBe(34);
  });
});
