import { LIGHT_ANSI, cssColorToHex, terminalTheme } from './terminal-theme';

describe('terminalTheme (the internal development record, #537)', () => {
  const root = document.documentElement;
  const set = (vars: Record<string, string>): void => {
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  };

  afterEach(() => {
    ['--bg0', '--fg1', '--fg2'].forEach((key) => root.style.removeProperty(key));
    root.classList.remove('dark');
  });

  it('reads the ladder from the root: bg0 canvas, fg1 text and cursor, a translucent fg2 selection', () => {
    root.classList.add('dark');
    set({ '--bg0': '#0B0F13', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' });
    expect(terminalTheme()).toEqual({
      background: '#0b0f13',
      cursorAccent: '#0b0f13',
      foreground: '#dce3e6',
      cursor: '#dce3e6',
      selectionBackground: '#97a6ae4d',
    });
  });

  it('takes the values as the browser resolves them: a derived color-mix canvas, short hex, rgba (#537)', () => {
    root.classList.add('dark');
    set({ '--bg0': 'color-mix(in srgb, #1e1e1e 71%, black)', '--fg1': '#fff', '--fg2': 'rgba(255,255,255,0.85)' });
    expect(terminalTheme()).toEqual({
      background: '#151515',
      cursorAccent: '#151515',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selectionBackground: '#ffffff4d',
    });
  });

  it('paints the light ink palette on the light side of the switch, and only there', () => {
    set({ '--bg0': 'color-mix(in srgb, #dddddd 96%, black)', '--fg1': '#222222', '--fg2': '#666666' });
    const light = terminalTheme();
    expect(light.background).toBe('#d4d4d4');
    expect(light.foreground).toBe('#222222');
    expect(light).toEqual(jasmine.objectContaining(LIGHT_ANSI));

    root.classList.add('dark');
    expect(terminalTheme().black).toBeUndefined();
  });

  it('leaves a slot to xterm when the root has no usable value for it, and the light ink with the canvas', () => {
    root.classList.add('dark');
    set({ '--bg0': '#0B0F13', '--fg1': 'nonsense' });
    expect(terminalTheme()).toEqual({ background: '#0b0f13', cursorAccent: '#0b0f13' });

    root.classList.remove('dark');
    root.style.removeProperty('--bg0');
    expect(terminalTheme().black).toBeUndefined();
    expect(terminalTheme(null)).toEqual({});
  });

  it('cssColorToHex reads the computed notations and nothing else', () => {
    expect(cssColorToHex('rgb(34, 34, 34)')).toBe('#222222');
    expect(cssColorToHex('rgba(255, 255, 255, 0.85)')).toBe('#ffffff');
    expect(cssColorToHex('rgb(1 2 3 / 0.5)')).toBe('#010203');
    expect(cssColorToHex('color(srgb 0.832 0.832 0.832)')).toBe('#d4d4d4');
    expect(cssColorToHex('color(srgb-linear 1 0 0)')).toBeUndefined();
    expect(cssColorToHex('transparent')).toBeUndefined();
  });
});
