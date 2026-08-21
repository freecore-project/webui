import { terminalTheme } from './terminal-theme';

describe('terminalTheme (the internal development record)', () => {
  const vars = { '--bg0': '#0B0F13', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };

  afterEach(() => Object.keys(vars).forEach((key) => document.documentElement.style.removeProperty(key)));

  it('reads the ladder from the root: bg0 canvas, fg1 text and cursor, a translucent fg2 selection', () => {
    Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    expect(terminalTheme()).toEqual({
      background: '#0B0F13',
      cursorAccent: '#0B0F13',
      foreground: '#DCE3E6',
      cursor: '#DCE3E6',
      selectionBackground: '#97A6AE4d',
    });
  });

  it('leaves a slot to xterm when the root has no usable value for it', () => {
    document.documentElement.style.setProperty('--bg0', '#0B0F13');
    document.documentElement.style.setProperty('--fg1', 'rgb(1, 2, 3)');
    expect(terminalTheme()).toEqual({ background: '#0B0F13', cursorAccent: '#0B0F13' });
    expect(terminalTheme(null)).toEqual({});
  });
});
