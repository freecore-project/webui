/**
 * The terminal's font stack, and a bounded wait for its webfont.
 *
 * `@xterm/xterm` measures its cell once at `open()` and re-measures only when
 * `fontFamily` or `fontSize` change. IBM Plex Mono is an `@font-face` the
 * browser fetches lazily on first use, so a terminal opened before the face
 * has arrived is sized for the fallback monospace and then drawn in Plex Mono:
 * descenders lose their bottom, the underscore sits on the clip edge, and it
 * only heals when someone touches the font-size slider (the internal development record).
 *
 * Waiting for the face — briefly — before opening keeps measure and render
 * on the same font. The wait is bounded so a slow or missing font still gives
 * a terminal, just a consistent one in the fallback face.
 */
export const TERMINAL_FONT_FAMILY = 'IBM Plex Mono, Droid Sans Mono, monospace';
export const TERMINAL_FONT_WAIT_MS = 1500;

export function whenTerminalFontReady(
  fontSize: number,
  timeoutMs: number = TERMINAL_FONT_WAIT_MS,
  fonts: FontFaceSet | undefined = globalThis.document?.fonts,
): Promise<void> {
  if (!fonts || typeof fonts.load !== 'function') {
    return Promise.resolve();
  }

  let load: Promise<unknown>;
  try {
    load = fonts.load(`${fontSize}px "IBM Plex Mono"`);
  } catch {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    load.then(done, done);
  });
}
