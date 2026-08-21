import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

// the internal development record: no primary paint in the shell. The Alerts drawer head carries the theme's
// .mat-bg-primary; under .fc-ui it reads as a dialog title on the surface over one hairline.
// The theme's own rule is in the cascade (host is ix-blue). the internal development record: the console
// card title that shared this pin is gone -- the consoles are section.fc-page.fc-console pages
// (src/app/pages/shell/console-layout.spec.ts is their pin).
@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue" style="width: 720px;">
      <div class="notification-sidenav">
        <div class="text-center mat-bg-primary pt-1 pb-1"><h6 class="m-0">Alerts</h6></div>
      </div>
    </div>
  `,
})
class CardTitleHostComponent {}

describe('15.2 Alerts head (the internal development record)', () => {
  let fixture: ComponentFixture<CardTitleHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4', '--primary-txt': '#ffffff' };
  const q = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ declarations: [CardTitleHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(CardTitleHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key)));

  it('draws the Alerts head as 16px fg1 on a transparent 48px row, not a primary slab', () => {
    const head = q('.notification-sidenav .mat-bg-primary');
    expect(getComputedStyle(head).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(head.querySelector('h6')).color).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(head.querySelector('h6')).fontSize).toBe('16px');
    expect(head.getBoundingClientRect().height).toBe(48);
  });
});
