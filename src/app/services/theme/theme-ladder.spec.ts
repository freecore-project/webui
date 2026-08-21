import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RestService, WebSocketService } from 'app/services';
import { CoreService } from 'app/core/services/core.service';
import { ApiService } from 'app/core/services/api.service';
import { DefaultTheme, ladderVars, Theme, ThemeService } from './theme.service';

// the internal development record: the surface ladder (bg0 canvas / bg1 panel / bg2 raised,
// line for hairlines) is emitted for every theme, literal for the FreeCORE
// default and derived for the inherited ones, and never leaks across a switch.
describe('ThemeService surface ladder (the internal development record)', () => {
  let service: ThemeService;
  const root = (): CSSStyleDeclaration => document.documentElement.style;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: RestService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: ApiService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: CoreService, useValue: { register: () => ({ subscribe: () => undefined }), emit: () => undefined } },
      ],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    // setCssVars writes the WHOLE ladder inline on <html>; remove every custom property it left
    // so later specs read the spartan fallbacks, not this theme (the internal development record caught the leak).
    Array.from(root()).filter((name) => name.startsWith('--')).forEach((name) => root().removeProperty(name));
    document.documentElement.classList.remove('dark');
  });

  // the internal development record: helm's `dark:` modifiers follow html.dark, set from the same
  // darkTest(bg2) that already decides the ladder's derivation.
  it('marks <html> dark for a dark theme and clears it for a light one', () => {
    service.setCssVars(DefaultTheme as Theme);
    expect(document.documentElement.classList.contains('dark')).toBeTrue();

    const light = service.freenasThemes.find((theme) => theme.name === 'ix-blue');
    expect(light.bg2).toBe('#ffffff');
    service.setCssVars(light);
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('carries the brand token ladder on the default theme, header on the panel step', () => {
    expect(DefaultTheme.bg0).toBe('#0B0F13');
    expect(DefaultTheme.line).toBe('#2A353D');
    expect(DefaultTheme.topbar).toBe(DefaultTheme.bg1);
    expect(ladderVars(DefaultTheme, true)).toEqual({ bg0: '#0B0F13', line: '#2A353D' });
  });

  it('derives bg0 and line for a theme that lacks them, darker for dark and barely for light', () => {
    const dark = { bg1: '#282a36', fg1: '#f8f8f2' };
    const light = { bg1: '#f2f3f4', fg1: '#1c2327' };
    expect(ladderVars(dark, true)).toEqual({
      bg0: 'color-mix(in srgb, #282a36 71%, black)',
      line: 'color-mix(in srgb, #f8f8f2 12%, #282a36)',
    });
    expect(ladderVars(light, false).bg0).toBe('color-mix(in srgb, #f2f3f4 96%, black)');
  });

  it('emits --bg0 and --line for every registered theme', () => {
    const missing = service.freenasThemes.filter((theme: Theme) => {
      service.setCssVars(theme);
      return !root().getPropertyValue('--bg0') || !root().getPropertyValue('--line');
    });
    expect(missing.map((theme) => theme.name)).toEqual([]);
    expect(service.freenasThemes.length).toBeGreaterThan(1);
  });

  it('does not leak the default ladder into a theme switched to afterwards', () => {
    service.setCssVars(DefaultTheme as Theme);
    expect(root().getPropertyValue('--bg0')).toBe('#0B0F13');

    const inherited = service.freenasThemes.find((theme: Theme) => theme.name === 'dracula');
    expect(inherited.bg0).toBeUndefined();
    service.setCssVars(inherited);
    expect(root().getPropertyValue('--bg0')).toContain('color-mix');
    expect(root().getPropertyValue('--bg0')).not.toBe('#0B0F13');
    expect(root().getPropertyValue('--line')).toContain(inherited.bg1);
  });

  it('accepts a literal accent on the default theme and still resolves meta accents elsewhere', () => {
    // the internal development record: the mono world's accent is the brand token, not a chart colour.
    expect(DefaultTheme.accent).toBe('#8FB4C7');
    service.setCssVars(DefaultTheme as Theme);
    expect(root().getPropertyValue('--accent')).toBe('#8FB4C7');
    expect(root().getPropertyValue('--accent-txt')).toMatch(/^#[0-9a-f]{6}$/i);

    const inherited = service.freenasThemes.find((theme: Theme) => theme.name === 'ix-dark');
    expect(inherited.accent).toMatch(/^var\(--/);
    service.setCssVars(inherited);
    expect(root().getPropertyValue('--accent')).toBe(inherited.accent);
  });

  it('leaves the FreeBSD heritage entry without literal ladder keys', () => {
    const heritage = service.freenasThemes.find((theme: Theme) => theme.name === 'truenas-15');
    expect(heritage.bg0).toBeUndefined();
    expect(heritage.line).toBeUndefined();
  });
});
