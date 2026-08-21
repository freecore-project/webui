import {
  CHUNK_RELOAD_GUARD_MS, CHUNK_RELOAD_MARKER, ChunkLoadErrorHandler, isChunkLoadError,
} from './chunk-load-error.handler';

function chunkLoadError(chunk = 273): Error {
  const error = new Error(`Loading chunk ${chunk} failed.\n(error: http://box/ui/${chunk}.19c27177e5dea000.js)`);
  error.name = 'ChunkLoadError';
  return error;
}

function fakeWindow(stored: Record<string, string> = {}): any {
  return {
    sessionStorage: {
      getItem: (key: string) => (key in stored ? stored[key] : null),
      setItem: jasmine.createSpy('setItem').and.callFake((key: string, value: string) => { stored[key] = value; }),
    },
    location: { reload: jasmine.createSpy('reload') },
  };
}

describe('the internal development record chunk load error handler', () => {
  beforeEach(() => {
    spyOn(console, 'error');
  });

  it('recognises a failed lazy chunk in every shape the browsers report it', () => {
    expect(isChunkLoadError(chunkLoadError())).toBeTrue();
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBeTrue();
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: http://box/ui/273.js'))).toBeTrue();
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBeTrue();
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: http://box/ui/273.js'))).toBeTrue();
    // zone.js: an unhandled promise rejection arrives wrapped
    expect(isChunkLoadError({ message: 'Uncaught (in promise): ChunkLoadError', rejection: chunkLoadError() })).toBeTrue();
    expect(isChunkLoadError(new Error('Guard rejected navigation'))).toBeFalse();
    expect(isChunkLoadError(null)).toBeFalse();
    expect(isChunkLoadError('string error')).toBeFalse();
  });

  it('reloads once for a failed chunk and announces the reload to the bootstrap page', () => {
    const browser = fakeWindow();
    const handler = new ChunkLoadErrorHandler(browser);

    handler.handleError(chunkLoadError());

    expect(browser.location.reload).toHaveBeenCalledTimes(1);
    expect(browser.sessionStorage.setItem).toHaveBeenCalledWith('freecore.uiReloadPending', '1');
    expect(browser.sessionStorage.setItem).toHaveBeenCalledWith(CHUNK_RELOAD_MARKER, jasmine.any(String));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not reload again inside the guard window and logs the failure instead', () => {
    const browser = fakeWindow({ [CHUNK_RELOAD_MARKER]: String(Date.now() - CHUNK_RELOAD_GUARD_MS / 2) });
    const handler = new ChunkLoadErrorHandler(browser);

    handler.handleError(chunkLoadError());

    expect(browser.location.reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('reloads again once the guard window has passed', () => {
    const browser = fakeWindow({ [CHUNK_RELOAD_MARKER]: String(Date.now() - CHUNK_RELOAD_GUARD_MS - 1) });
    const handler = new ChunkLoadErrorHandler(browser);

    handler.handleError(chunkLoadError());

    expect(browser.location.reload).toHaveBeenCalledTimes(1);
  });

  it('leaves every other error to the default handler', () => {
    const browser = fakeWindow();
    const handler = new ChunkLoadErrorHandler(browser);
    const error = new Error('Guard rejected navigation');

    handler.handleError(error);

    expect(browser.location.reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('still reloads when storage is unavailable', () => {
    const browser = fakeWindow();
    browser.sessionStorage.getItem = () => { throw new Error('disabled'); };
    browser.sessionStorage.setItem.and.throwError('disabled');
    const handler = new ChunkLoadErrorHandler(browser);

    handler.handleError(chunkLoadError());

    expect(browser.location.reload).toHaveBeenCalledTimes(1);
  });
});
