import { ErrorHandler, Inject, Injectable } from '@angular/core';
import { WINDOW } from 'app/helpers/window.helper';

/**
 * the internal development record: a tab left open across an update keeps the old bundle, and the first page it
 * has not visited yet asks for a lazy chunk the new install no longer ships. nginx answers that
 * request with index.html (200, text/html), the module load fails, and the page does nothing.
 *
 * 13.3 reloaded in this case through `router.errorHandler`. On Angular 22 the failure reaches the
 * global ErrorHandler instead (the internal development record's navigation error handler is never called for it), so
 * the reload lives here. It happens once: a second chunk failure inside the guard window means
 * the chunk is missing on the server too, and a reload loop would help nobody.
 */
export const CHUNK_RELOAD_MARKER = 'freecore.chunkReloadedAt';
export const CHUNK_RELOAD_GUARD_MS = 60_000;

const CHUNK_LOAD_MESSAGES = [
  /Loading chunk [\w-]+ failed/, // webpack ChunkLoadError
  /Failed to fetch dynamically imported module/, // Chromium, native import()
  /Importing a module script failed/, // WebKit, native import()
  /error loading dynamically imported module/, // Firefox, native import()
];

export function isChunkLoadError(error: unknown): boolean {
  // zone.js hands a rejected promise to the handler wrapped: the real error is `.rejection`
  const candidates = [error, (error as { rejection?: unknown } | null)?.rejection];
  return candidates.some((candidate) => {
    if (!candidate) {
      return false;
    }
    const { name, message } = candidate as { name?: string; message?: unknown };
    const text = message === undefined ? String(candidate) : String(message);
    return name === 'ChunkLoadError' || CHUNK_LOAD_MESSAGES.some((pattern) => pattern.test(text));
  });
}

@Injectable()
export class ChunkLoadErrorHandler extends ErrorHandler {
  constructor(@Inject(WINDOW) private window: Window) {
    super();
  }

  override handleError(error: unknown): void {
    if (isChunkLoadError(error) && this.reloadOnce()) {
      return;
    }
    super.handleError(error);
  }

  private reloadOnce(): boolean {
    const now = Date.now();
    let lastReload = 0;
    try {
      lastReload = Number(this.window.sessionStorage.getItem(CHUNK_RELOAD_MARKER)) || 0;
    } catch {
      // storage may be disabled; then every chunk failure reloads, which is still the 13.3 behaviour
    }
    if (now - lastReload < CHUNK_RELOAD_GUARD_MS) {
      return false;
    }
    try {
      this.window.sessionStorage.setItem(CHUNK_RELOAD_MARKER, String(now));
      // the bootstrap page (index.html) shows "Reloading … the updated web interface" for this flag
      this.window.sessionStorage.setItem('freecore.uiReloadPending', '1');
    } catch {
      // reloading must still succeed
    }
    this.window.location.reload();
    return true;
  }
}
