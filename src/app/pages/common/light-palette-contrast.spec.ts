import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// The two global sheets that carry the rules under test, loaded as production loads them (unscoped).
@Component({
  standalone: false,
  template: '',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../assets/styles/freecore-ui.css', '../../../assets/styles/material-reduction.css',
    // the alerts drawer's own sheet (scoped in production: its accent title rule then weighs (0,3,1), still under the
    // light-palette rule's (0,4,1))
    '../../components/common/notifications/notifications.component.css',
  ],
  // the spartan ghost variant's colour utility, which the topbar buttons carry in production, and Material's accent
  // icon colour (the static amber the bell is painted with)
  styles: ['.text-muted-foreground { color: var(--sp-muted-foreground); }', '.mat-icon.mat-accent { color: #ffc107; }'],
})
class LightPaletteSheetsComponent {}

@Component({
  standalone: false,
  selector: 'light-palette-host',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="fc-ui">
      <div class="branding topbar fc-branding"><a class="fc-brand-link"><span class="fc-brand-name">FreeCORE</span></a></div>
      <topbar><div class="topbar"><button hlmBtn class="text-muted-foreground" type="button">menu</button></div></topbar>
      <div class="warning-text"><p>ZFS Deduplication is an advanced option meant for experts only.</p></div>
      <ul class="notification-list" style="background: #f5f5f5"><li class="notific-item"><div class="notific-item-content">
        <mat-icon class="mat-icon notific-icon mat-accent">notification_important</mat-icon>
        <div class="mat-list-text"><h3 class="notific-title accent">WARNING</h3></div>
      </div></li></ul>
    </div>`,
})
class LightPaletteHostComponent {}

// Paper's palette: blue bar with computed white text, near-black page foregrounds, a bright yellow.
const PAPER = {
  '--topbar': '#0D5687', '--topbar-txt': '#ffffff', '--fg1': '#222222', '--sp-muted-foreground': '#333333', '--yellow': '#f0cb00',
  '--accent': '#f0cb00',
};

/** WCAG 2 contrast ratio of two 0-255 rgb triples. */
function contrast(a: number[], b: number[]): number {
  const lum = (c: number[]) => c.slice(0, 3).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function rgb(color: string): number[] {
  const probe = document.createElement('div');
  probe.style.color = color;
  document.body.appendChild(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  // rgb()/rgba() report 0-255 channels; color-mix() results report color(srgb r g b / a) with 0-1 channels
  const n = css.match(/[\d.]+/g).map(Number);
  return css.startsWith('color(') ? [...n.slice(0, 3).map((v) => Math.round(v * 255)), ...n.slice(3)] : n;
}

describe('light palette contrast on the bar and in warning copy', () => {
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [LightPaletteSheetsComponent, LightPaletteHostComponent] });
    TestBed.createComponent(LightPaletteSheetsComponent).detectChanges();
    const fixture = TestBed.createComponent(LightPaletteHostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement;
    document.body.appendChild(host);
    Object.entries(PAPER).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  });

  afterEach(() => {
    host.remove();
    Object.keys(PAPER).forEach((k) => document.documentElement.style.removeProperty(k));
    document.documentElement.classList.remove('dark');
  });

  const color = (sel: string) => getComputedStyle(host.querySelector(sel)).color;

  it('gives a light palette\'s bar controls and brand the bar\'s own text colour', () => {
    document.documentElement.classList.remove('dark');
    // white at 80% over the bar, not the page's near-black muted foreground
    expect(rgb(color('topbar [hlmBtn]')).slice(0, 3)).toEqual([255, 255, 255]);
    expect(rgb(color('topbar [hlmBtn]'))[3]).toBeCloseTo(0.8, 2);
    expect(rgb(color('.fc-brand-link'))).toEqual([255, 255, 255]);
  });

  it('mixes the warning yellow into the text colour on a light palette only', () => {
    document.documentElement.classList.remove('dark');
    const [r, g, b] = rgb(color('.warning-text p'));
    // 30% #f0cb00 + 70% #222222
    expect(Math.abs(r - 96) + Math.abs(g - 85) + Math.abs(b - 24)).toBeLessThanOrEqual(3);

    document.documentElement.classList.add('dark');
    expect(rgb(color('.warning-text p'))).toEqual([240, 203, 0]);
  });

  it('leaves a dark palette\'s bar on its muted foreground', () => {
    document.documentElement.classList.add('dark');
    expect(rgb(color('topbar [hlmBtn]'))).toEqual([51, 51, 51]);
    expect(rgb(color('.fc-brand-link'))).toEqual([34, 34, 34]);
  });

  // the internal development record: the drawer is #f5f5f5 on Paper. Unmixed, the WARNING title (#f0cb00) is 1.45:1 and the
  // bell (#ffc107) 1.50:1; mixed 30% into --fg1 both read at 6.85:1, over the 4.5:1 text and 3:1 non-text minimums.
  it('mixes the accent into the text colour for the alerts drawer\'s WARNING title and bell on a light palette only', () => {
    document.documentElement.classList.remove('dark');
    const drawer = [245, 245, 245];
    for (const sel of ['.notific-title.accent', '.notific-icon.mat-accent']) {
      const [r, g, b] = rgb(color(sel));
      expect(Math.abs(r - 96) + Math.abs(g - 85) + Math.abs(b - 24)).withContext(sel).toBeLessThanOrEqual(3);
      expect(contrast([r, g, b], drawer)).withContext(sel).toBeGreaterThanOrEqual(4.5);
    }

    document.documentElement.classList.add('dark');
    expect(rgb(color('.notific-title.accent'))).toEqual([240, 203, 0]);
    expect(rgb(color('.notific-icon.mat-accent'))).toEqual([255, 193, 7]);
  });
});
