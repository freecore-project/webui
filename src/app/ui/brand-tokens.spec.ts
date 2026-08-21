import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the `--sp-*` bridge in freecore-spartan.css is proven end to end --
// ladder written inline on <html> the way ThemeService.setCssVars() does it, a helm button
// rendered under it, computed style read back through Tailwind's utilities in the karma
// bundle. Not a CSS-text check: if the mapping, the preset's @theme inline re-pointing, the
// text scale or the base layer break, these numbers move.
@Component({
  imports: [HlmButtonImports],
  template: `
    <button hlmBtn id="tier1">Save</button>
    <button hlmBtn variant="outline" id="tier2">Cancel</button>
  `,
})
class HostComponent {}

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// The FreeCORE default ladder (theme.service.ts DefaultTheme), as setCssVars() emits it.
const LADDER = {
  '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D',
  '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--alt-bg1': '#212A31', '--accent': '#8FB4C7', '--red': '#E3625A',
};

describe('spartan brand tokens (the internal development record)', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = document.documentElement;
  const style = (id: string): CSSStyleDeclaration => getComputedStyle(fixture.nativeElement.querySelector(`#${id}`));

  beforeEach(async () => {
    Object.entries(LADDER).forEach(([name, value]) => root.style.setProperty(name, value));
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    // The app's body carries the theme's text colour and the Plex face; outline/ghost
    // variants carry no colour of their own and must inherit it (base layer, #391).
    fixture.nativeElement.style.color = 'var(--fg1)';
    fixture.nativeElement.style.fontFamily = '"IBM Plex Sans", sans-serif';
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.keys(LADDER).forEach((name) => root.style.removeProperty(name));
  });

  it('paints the default variant as the mono tier 1: fg1 ground, bg0 text, 32px / 13px / 500 / 6px', () => {
    const tier1 = style('tier1');
    expect(tier1.backgroundColor).toBe(rgb(LADDER['--fg1']));
    expect(tier1.color).toBe(rgb(LADDER['--bg0']));
    expect(tier1.height).toBe('32px');
    expect(tier1.fontSize).toBe('13px');
    expect(tier1.fontWeight).toBe('500');
    expect(tier1.borderTopLeftRadius).toBe('6px');
    expect(tier1.fontFamily).toContain('IBM Plex Sans');
  });

  it('paints the outline variant as tier 2: transparent on a --line hairline, fg1 text', () => {
    const tier2 = style('tier2');
    expect(tier2.borderTopColor).toBe(rgb(LADDER['--line']));
    expect(tier2.borderTopWidth).toBe('1px');
    expect(tier2.color).toBe(rgb(LADDER['--fg1']));
  });

  it('follows the ladder live: rewriting --fg1 repaints tier 1 without a rebuild', () => {
    root.style.setProperty('--fg1', '#FFFFFF');
    expect(style('tier1').backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('falls back to the FreeCORE default palette when no theme service has run', () => {
    Object.keys(LADDER).forEach((name) => root.style.removeProperty(name));
    expect(style('tier1').backgroundColor).toBe(rgb(LADDER['--fg1']));
    expect(style('tier2').borderTopColor).toBe(rgb(LADDER['--line']));
  });
});
