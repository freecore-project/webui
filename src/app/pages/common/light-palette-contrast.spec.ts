import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// The two global sheets that carry the rules under test, loaded as production loads them (unscoped).
@Component({
  standalone: false,
  template: '',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/freecore-ui.css', '../../../assets/styles/material-reduction.css'],
  // the spartan ghost variant's colour utility, which the topbar buttons carry in production
  styles: ['.text-muted-foreground { color: var(--sp-muted-foreground); }'],
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
    </div>`,
})
class LightPaletteHostComponent {}

// Paper's palette: blue bar with computed white text, near-black page foregrounds, a bright yellow.
const PAPER = {
  '--topbar': '#0D5687', '--topbar-txt': '#ffffff', '--fg1': '#222222', '--sp-muted-foreground': '#333333', '--yellow': '#f0cb00',
};

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
});
