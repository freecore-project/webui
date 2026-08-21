import { NEVER, of } from 'rxjs';
import { AdminLayoutComponent } from 'app/components/common/layouts/admin-layout/admin-layout.component';
import { LocaleService } from './locale.service';

describe('copyright metadata during shell startup', () => {
  let previousBuildTime: string;
  let locale: LocaleService;
  const core = { emit: () => undefined, register: () => NEVER };
  const ws = { call: () => of({ timezone: 'UTC' }) };

  beforeEach(() => {
    previousBuildTime = localStorage.getItem('buildtime');
    localStorage.removeItem('buildtime');
    locale = new LocaleService({} as any, ws as any, core as any);
  });

  afterEach(() => {
    if (previousBuildTime === null) localStorage.removeItem('buildtime');
    else localStorage.setItem('buildtime', previousBuildTime);
  });

  const createShell = (): AdminLayoutComponent => new AdminLayoutComponent(
    { events: NEVER } as any, core as any, {} as any, {} as any,
    { asObservable: () => NEVER } as any, {} as any, ws as any,
    {} as any, {} as any, locale,
  );

  it('constructs the real shell without waiting for build-time metadata', () => {
    const shell = createShell();
    expect(shell.copyrightYear).toBe('');
  });

  it('reads valid delayed metadata after the shell has already opened', () => {
    const shell = createShell();
    expect(shell.copyrightYear).toBe('');
    localStorage.setItem('buildtime', String(Date.UTC(2025, 6, 1)));
    expect(shell.copyrightYear).toBe('2025');
  });

  it('omits missing, blank, malformed and out-of-range metadata', () => {
    expect(locale.getCopyrightYearFromBuildTime()).toBe('');
    ['', '  ', 'invalid', '123junk', 'Infinity', '1e99', '8640000000000001'].forEach((value) => {
      localStorage.setItem('buildtime', value);
      expect(locale.getCopyrightYearFromBuildTime()).withContext(value).toBe('');
    });
  });

  it('preserves the build year for valid millisecond timestamps with surrounding whitespace', () => {
    localStorage.setItem('buildtime', `  ${Date.UTC(2024, 6, 1)}  `);
    expect(locale.getCopyrightYearFromBuildTime()).toBe('2024');
  });
});
