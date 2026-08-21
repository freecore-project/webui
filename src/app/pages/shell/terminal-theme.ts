import { ITheme } from '@xterm/xterm';

/**
 * The terminal's colours, read from the shell's ladder at open time
 * (the internal development record). xterm paints its own canvas from a theme object, not
 * from CSS, so without one it draws its stock pure-black-and-white terminal
 * inside whatever surface the page put it on. Reading `--bg0`, `--fg1` and
 * `--fg2` from the root keeps every theme's terminal on that theme's ladder;
 * a root without the variables (or a non-hex value) falls back to xterm's
 * defaults for that slot.
 */
export function terminalTheme(root: Element | null = globalThis.document?.documentElement ?? null): ITheme {
  if (!root) {
    return {};
  }
  const styles = getComputedStyle(root);
  const read = (name: string): string | undefined => {
    const value = styles.getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
  };
  const bg0 = read('--bg0');
  const fg1 = read('--fg1');
  const fg2 = read('--fg2');
  const theme: ITheme = {};
  if (bg0) {
    theme.background = bg0;
    theme.cursorAccent = bg0;
  }
  if (fg1) {
    theme.foreground = fg1;
    theme.cursor = fg1;
  }
  if (fg2) {
    theme.selectionBackground = `${fg2}4d`;
  }
  return theme;
}
