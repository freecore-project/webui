import { ITheme } from '@xterm/xterm';

/**
 * The terminal's colours, read from the shell's ladder at open time
 * (the internal development record). xterm paints its own canvas from a theme object, not
 * from CSS, so without one it draws its stock pure-black-and-white terminal
 * inside whatever surface the page put it on.
 *
 * `--bg0`, `--fg1` and `--fg2` are taken as the browser resolves them, not as
 * they were written (the internal development record): every theme but the FreeCORE
 * default derives its canvas (`color-mix(in srgb, <bg1> …, black)`, #348),
 * TrueNAS 13.3 writes `#fff` and an `rgba()` fg2 -- and a read that accepted
 * only six-digit hex left all of them on xterm's black canvas, which under a
 * light theme carried the theme's dark fg1: unreadable (codeberg
 * freecore/freecore#107). A slot the root cannot resolve is still xterm's.
 *
 * On the light side of the switch (`html.dark` absent, #391) the sixteen ANSI
 * colours are the light ink set: xterm's stock palette is drawn for a black
 * canvas, and white plus the bright six disappear on a light one. The light
 * set keeps each hue, bright is the same ink (bold weight is the emphasis),
 * and every entry reads at 3:1 or better on the lightest derived canvas
 * (Paper's #cccccc). Dark themes keep xterm's stock palette, as always.
 */
export const LIGHT_ANSI: Readonly<ITheme> = {
  black: '#1f1f1f',
  red: '#b3261e',
  green: '#1e7f3c',
  yellow: '#8a6d00',
  blue: '#1a5fb4',
  magenta: '#9a2fa8',
  cyan: '#0b7285',
  white: '#6b6b6b',
  brightBlack: '#5c5c5c',
  brightRed: '#b3261e',
  brightGreen: '#1e7f3c',
  brightYellow: '#8a6d00',
  brightBlue: '#1a5fb4',
  brightMagenta: '#9a2fa8',
  brightCyan: '#0b7285',
  brightWhite: '#333333',
};

export function terminalTheme(root: Element | null = globalThis.document?.documentElement ?? null): ITheme {
  if (!root) {
    return {};
  }
  const bg0 = resolvedHex(root, '--bg0');
  const fg1 = resolvedHex(root, '--fg1');
  const fg2 = resolvedHex(root, '--fg2');
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
  // Light ink only on a canvas of the theme's own: a root without a resolved
  // bg0 is on xterm's black, where the stock palette is the right one.
  if (bg0 && !root.classList.contains('dark')) {
    Object.assign(theme, LIGHT_ANSI);
  }
  return theme;
}

/**
 * The custom property's value as the browser computes it for a colour, as
 * `#rrggbb` (alpha dropped). A probe element painted with `var(name)` is what
 * makes `color-mix()`, short hex and `rgba()` come back as numbers; a value
 * the browser would not accept as a colour is left alone rather than probed,
 * since an invalid `color` computes to the inherited one.
 */
function resolvedHex(root: Element, name: string): string | undefined {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw || !globalThis.CSS?.supports?.('color', raw)) {
    return undefined;
  }
  const probe = root.ownerDocument.createElement('span');
  probe.style.setProperty('color', `var(${name})`);
  root.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return cssColorToHex(computed);
}

/** `rgb(r, g, b)`, `rgba(r, g, b, a)`, `rgb(r g b / a)` and `color(srgb r g b)` to `#rrggbb`. */
export function cssColorToHex(color: string): string | undefined {
  const match = /^(rgba?|color)\(\s*(srgb\s+)?([^)]*)\)$/.exec(color.trim());
  if (!match || (match[1] === 'color' && !match[2])) {
    return undefined;
  }
  const channels = match[3].split('/')[0].trim().split(/[\s,]+/).slice(0, 3).map(Number);
  if (channels.length < 3 || channels.some((channel) => Number.isNaN(channel))) {
    return undefined;
  }
  const scale = match[1] === 'color' ? 255 : 1;
  return `#${channels
    .map((channel) => Math.round(Math.min(255, Math.max(0, channel * scale))).toString(16).padStart(2, '0'))
    .join('')}`;
}
