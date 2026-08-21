import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FC_DRAWER, FcDrawerComponent } from './fc-drawer';

// the internal development record: the shell's drawers off Material (mat-sidenav-container / mat-sidenav / mat-sidenav-content).
// What MatDrawer did for the shell: a side drawer sits in the flow with no backdrop and keeps focus where it is; an
// over drawer opens above a shown backdrop, takes focus to its first tabbable element, closes on Escape or a backdrop
// click and gives focus back; a closed drawer is hidden with its inner container display:none; the API the topbar
// and the layout read (opened, mode, toggle, close) is plain properties. freecore-ui.css is a Karma global.
@Component({
  standalone: true,
  imports: [...FC_DRAWER],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <fc-drawer-container style="display:block; position:relative; width:800px; height:400px">
      <fc-drawer #nav [opened]="navOpen" [mode]="navMode" id="nav" style="width:200px">
        <a href="#one" id="nav-first">One</a><a href="#two">Two</a>
      </fc-drawer>
      <fc-drawer-content id="content"><button type="button" id="toggle">Toggle</button></fc-drawer-content>
      <fc-drawer #alerts mode="over" position="end" id="alerts" style="width:300px">
        <a href="#alert" id="alerts-first">An alert</a>
      </fc-drawer>
    </fc-drawer-container>
  `,
})
class DrawerHostComponent {
  @ViewChild('nav') nav: FcDrawerComponent;
  @ViewChild('alerts') alerts: FcDrawerComponent;
  navOpen = true;
  navMode = 'side';
}

describe('shell drawers (the internal development record)', () => {
  let fixture: ComponentFixture<DrawerHostComponent>;
  const q = (sel: string): HTMLElement => fixture.nativeElement.querySelector(sel);
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const settle = async (ms = 600): Promise<void> => { fixture.detectChanges(); await wait(ms); fixture.detectChanges(); };
  const backdrop = (): HTMLElement => q('.fc-drawer-backdrop');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DrawerHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(DrawerHostComponent);
    document.body.appendChild(fixture.nativeElement);
    await settle(300); // the container's transitions switch on 200ms after start-up
  });

  afterEach(() => fixture.destroy());

  it('keeps the API the shell reads and lays a side drawer in the flow with no backdrop', () => {
    const nav = fixture.componentInstance.nav;
    expect([nav.opened, nav.mode]).toEqual([true, 'side']);
    expect(Array.from(q('#nav').classList)).toEqual(jasmine.arrayContaining(['fc-drawer', 'fc-sidenav', 'fc-drawer-side', 'fc-drawer-opened']));
    expect(q('#nav').hasAttribute('tabindex')).toBeFalse();
    expect(getComputedStyle(q('#nav')).visibility).toBe('visible');
    expect(getComputedStyle(backdrop()).visibility).toBe('hidden'); // the alerts drawer (over) makes one, not shown
    expect(q('#alerts').getAttribute('tabindex')).toBe('-1');
    expect(getComputedStyle(q('#alerts')).visibility).toBe('hidden');
    expect(getComputedStyle(q('#alerts .fc-drawer-inner-container')).display).toBe('none');
    expect(q('fc-drawer-container').classList).toContain('fc-drawer-transition');
  });

  it('opens an over drawer above the backdrop, takes focus inside, and gives it back on Escape', async () => {
    const toggle = q('#toggle');
    toggle.focus();
    fixture.componentInstance.alerts.toggle();
    await settle();
    expect(fixture.componentInstance.alerts.opened).toBeTrue();
    expect(q('#alerts').classList).toContain('fc-drawer-opened');
    expect(backdrop().classList).toContain('fc-drawer-shown');
    expect(getComputedStyle(backdrop()).visibility).toBe('visible');
    expect(document.activeElement).toBe(q('#alerts-first'));
    // keyCode is what the drawer reads (as MatDrawer did)
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(escape, 'keyCode', { get: () => 27 });
    q('#alerts-first').dispatchEvent(escape);
    await settle();
    expect(fixture.componentInstance.alerts.opened).toBeFalse();
    expect(backdrop().classList).not.toContain('fc-drawer-shown');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes the over drawers on a backdrop click and gives focus back', async () => {
    fixture.componentInstance.navMode = 'over';
    fixture.componentInstance.navOpen = false;
    await settle();
    const toggle = q('#toggle');
    toggle.focus();
    fixture.componentInstance.nav.toggle();
    await settle();
    expect(document.activeElement).toBe(q('#nav-first'));
    expect(backdrop().classList).toContain('fc-drawer-shown');
    backdrop().click();
    await settle();
    expect(fixture.componentInstance.nav.opened).toBeFalse();
    expect(getComputedStyle(q('#nav')).visibility).toBe('hidden');
    expect(document.activeElement).toBe(toggle);
  });

  it('opens and closes a side drawer without moving focus', async () => {
    const toggle = q('#toggle');
    toggle.focus();
    fixture.componentInstance.nav.toggle();
    await settle();
    expect(fixture.componentInstance.nav.opened).toBeFalse();
    expect(document.activeElement).toBe(toggle);
    fixture.componentInstance.nav.toggle();
    await settle();
    expect(fixture.componentInstance.nav.opened).toBeTrue();
    expect(document.activeElement).toBe(toggle);
    expect(backdrop().classList).not.toContain('fc-drawer-shown');
  });
});
