import { NEVER, of } from 'rxjs';
import { LocaleService } from './locale.service';

// the internal development record (15.0 leg): the copyright year must never throw while
// build-time metadata is absent or malformed — it used to call .trim() on null
// during component construction.
describe('LocaleService copyright year from build time', () => {
  let previousBuildTime: string;
  let locale: LocaleService;
  const core = { emit: () => undefined, register: () => NEVER };
  const ws = { call: () => of({ timezone: 'UTC' }) };

  beforeEach(() => {
    previousBuildTime = localStorage.getItem('buildtime');
    locale = new LocaleService({} as any, ws as any, core as any);
  });

  afterEach(() => {
    if (previousBuildTime === null) localStorage.removeItem('buildtime');
    else localStorage.setItem('buildtime', previousBuildTime);
  });

  it('returns an empty year when build-time metadata is missing', () => {
    localStorage.removeItem('buildtime');
    expect(locale.getCopyrightYearFromBuildTime()).toBe('');
  });

  it('returns an empty year for malformed metadata', () => {
    localStorage.setItem('buildtime', 'not-a-time');
    expect(locale.getCopyrightYearFromBuildTime()).toBe('');
  });

  it('returns the build year for valid metadata', () => {
    localStorage.setItem('buildtime', ` ${Date.UTC(2026, 9, 1)} `);
    expect(locale.getCopyrightYearFromBuildTime()).toBe('2026');
  });
});
