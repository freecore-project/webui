import { whenTerminalFontReady } from './terminal-font';

describe('whenTerminalFontReady (the internal development record)', () => {
  const fakeFonts = (load: (descriptor: string) => Promise<unknown>): FontFaceSet => ({ load } as unknown as FontFaceSet);

  it('asks the Font Loading API for the terminal face at the given size', async () => {
    const load = jasmine.createSpy('load').and.returnValue(Promise.resolve([]));

    await whenTerminalFontReady(13, 1000, fakeFonts(load));

    expect(load).toHaveBeenCalledOnceWith('13px "IBM Plex Mono"');
  });

  it('resolves once the face has loaded, before the timeout', async () => {
    let resolveLoad: (value: unknown) => void;
    const load = (): Promise<unknown> => new Promise((resolve) => { resolveLoad = resolve; });
    let ready = false;
    const wait = whenTerminalFontReady(14, 60_000, fakeFonts(load)).then(() => { ready = true; });

    await Promise.resolve();
    expect(ready).toBeFalse();

    resolveLoad([]);
    await wait;
    expect(ready).toBeTrue();
  });

  it('resolves at the timeout when the face never settles', async () => {
    const load = (): Promise<unknown> => new Promise(() => {});
    const started = Date.now();

    await whenTerminalFontReady(14, 20, fakeFonts(load));

    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
  });

  it('resolves when the load rejects', async () => {
    const load = (): Promise<unknown> => Promise.reject(new Error('no such face'));

    await expectAsync(whenTerminalFontReady(14, 60_000, fakeFonts(load))).toBeResolved();
  });

  it('resolves when the load throws synchronously', async () => {
    const load = (): Promise<unknown> => { throw new Error('bad descriptor'); };

    await expectAsync(whenTerminalFontReady(14, 60_000, fakeFonts(load))).toBeResolved();
  });

  it('resolves immediately without a Font Loading API', async () => {
    await expectAsync(whenTerminalFontReady(14, 60_000, undefined)).toBeResolved();
    await expectAsync(whenTerminalFontReady(14, 60_000, {} as FontFaceSet)).toBeResolved();
  });
});
