import { of, throwError } from 'rxjs';
import { BastilleAdoptionPlan, BastilleSettings, openBastilleSettings } from './bastille-settings';

// the internal development record: Bastille Settings previews a pool's existing Bastille tree
// (the internal development record) and asks before adopting one another system made.
describe('Bastille Settings adoption of an existing tree', () => {
  const pools = [{ name: 'tank', status: 'ONLINE', healthy: true, is_decrypted: true }];
  const unconfigured = { installed: true, configured: false, pool: null as string, startup_delay: 0, parallel_limit: 1 };
  const adoptable: BastilleAdoptionPlan = {
    pool: 'tank',
    dataset: 'tank/bastille',
    state: 'ADOPTABLE',
    jails: [
      { name: 'web', operable: true, reason: null },
      { name: 'old', operable: false, reason: 'Bastille jail \'old\' is not configured with a root <inside> its own storage.' },
    ],
    releases: ['14.3-RELEASE'],
    create: ['tank/bastille/config'],
    convert: ['tank/bastille/backups'],
    mark: ['tank/bastille', 'tank/bastille/jails'],
    blockers: [],
  };

  function run(config: any, plan: Partial<BastilleAdoptionPlan>, confirmed = true): {
    ws: any; dialog: any; emitted: BastilleSettings[]; error: any; completed: boolean;
  } {
    const ws = {
      call: jasmine.createSpy('call').and.callFake((method: string) => of({
        'bastille.config': config,
        'pool.query': pools,
        'bastille.adoption_preview': { ...adoptable, ...plan },
      }[method])),
    };
    const dialog = {
      dialogForm: (conf: any) => {
        conf.customSubmit({ formValue: { pool: 'tank', startup_delay: 0, parallel_limit: 1 }, dialogRef: { close: () => {} } });
        return of(true);
      },
      confirm: jasmine.createSpy('confirm').and.returnValue(of(confirmed)),
    };
    const result = { ws, dialog, emitted: [] as BastilleSettings[], error: undefined as any, completed: false };
    openBastilleSettings(ws as any, dialog as any, {} as any).subscribe({
      next: (settings) => result.emitted.push(settings),
      error: (error) => { result.error = error; },
      complete: () => { result.completed = true; },
    });
    return result;
  }

  it('asks once and adopts only on Adopt', () => {
    const { dialog, emitted } = run(unconfigured, {});

    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    const options = dialog.confirm.calls.mostRecent().args[0];
    expect(options.title).toBe('Adopt Existing Bastille Data');
    expect(options.buttonMsg).toBe('Adopt');
    expect(options.hideCheckBox).toBeTrue();
    expect(options.message).toBe(
      '<p><code>tank/bastille</code> already holds Bastille data that FreeCORE did not create.</p>'
      + '<p>Jails: web, old<br>Releases: 14.3-RELEASE</p>'
      + '<p>Listed, but FreeCORE cannot start them as they are:'
      + '<br>old: Bastille jail &#39;old&#39; is not configured with a root &lt;inside&gt; its own storage.</p>'
      + '<p>Adopting it takes a snapshot first, then creates config, turns the folder backups into a dataset with '
      + 'its contents and marks the datasets as Bastille storage. Jails, releases and their settings are not changed.</p>',
    );
    expect(emitted).toEqual([{ pool: 'tank', startup_delay: 0, parallel_limit: 1, adopt: true }]);
  });

  it('names a jail FreeCORE cannot start, escaped', () => {
    const { dialog } = run(unconfigured, {});

    const message: string = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('<br>old: Bastille jail &#39;old&#39; is not configured with a root &lt;inside&gt; its own storage.');
    expect(message).not.toContain('<inside>');
  });

  it('says only what this tree needs', () => {
    const { dialog } = run(unconfigured, {
      jails: [], releases: [], create: [], convert: ['tank/bastille/backups', 'tank/bastille/logs'], mark: [],
    });

    const message: string = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('<p>No jails</p>');
    expect(message).toContain('then turns the folders backups, logs into datasets with their contents. Jails,');
  });

  it('starts nothing when adoption is cancelled', () => {
    const { emitted, completed } = run(unconfigured, {}, false);

    expect(emitted).toEqual([]);
    expect(completed).toBeTrue();
  });

  it('reports blockers instead of asking', () => {
    const { dialog, emitted, error } = run(unconfigured, {
      state: 'BLOCKED', blockers: ['Stop these jails first: web.'],
    });

    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
    expect(error.message).toBe('Bastille cannot use the data already in tank/bastille: Stop these jails first: web.');
    expect(error.reason).toBe(error.message);
  });

  for (const state of ['ABSENT', 'MANAGED'] as const) {
    it(`configures a ${state} pool without asking`, () => {
      const { dialog, emitted } = run(unconfigured, { state });

      expect(dialog.confirm).not.toHaveBeenCalled();
      expect(emitted).toEqual([{ pool: 'tank', startup_delay: 0, parallel_limit: 1 }]);
    });
  }

  // the internal development record: jails made under another Bastille prefix (the internal development record).
  const configured = { ...unconfigured, configured: true, pool: 'tank' };
  const moves = [
    { jail: 'web', from: '/tank/bastille', to: '/mnt/tank/bastille' },
    { jail: 'db', from: '/tank/bastille', to: '/mnt/tank/bastille' },
  ];

  it('says which jail paths adopting moves', () => {
    const { dialog } = run(unconfigured, { rewrite: moves });

    const message: string = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('<p><code>tank/bastille</code> already holds Bastille data that FreeCORE did not create.</p>');
    expect(message).toContain(
      'creates config, turns the folder backups into a dataset with its contents, marks the datasets as Bastille storage '
      + 'and moves the paths in the settings of web, db from <code>/tank/bastille</code> to <code>/mnt/tank/bastille</code>. '
      + 'Nothing inside the jails or releases is changed.</p>',
    );
    expect(message).not.toContain('their settings are not changed');
  });

  it('names each prefix once, escaped', () => {
    const { dialog } = run(unconfigured, {
      rewrite: [...moves, { jail: 'x<y', from: '/a&b', to: '/mnt/tank/bastille' }],
    });

    const message: string = dialog.confirm.calls.mostRecent().args[0].message;
    expect(message).toContain('of web, db from <code>/tank/bastille</code>');
    expect(message).toContain('of x&lt;y from <code>/a&amp;b</code> to <code>/mnt/tank/bastille</code>');
  });

  it('asks to move the jails of the pool Bastille already uses', () => {
    const { ws, dialog, emitted } = run(configured, {
      jails: [{ name: 'web', operable: true, reason: null }], create: [], convert: [], mark: [], rewrite: moves.slice(0, 1),
    });

    expect(ws.call).toHaveBeenCalledWith('bastille.adoption_preview', ['tank']);
    expect(dialog.confirm.calls.mostRecent().args[0].message).toBe(
      '<p>Jails in <code>tank/bastille</code> were made under another path.</p>'
      + '<p>Jails: web<br>Releases: 14.3-RELEASE</p>'
      + '<p>Adopting it takes a snapshot first, then moves the paths in the settings of web from '
      + '<code>/tank/bastille</code> to <code>/mnt/tank/bastille</code>. Nothing inside the jails or releases is changed.</p>',
    );
    expect(emitted).toEqual([{ pool: 'tank', startup_delay: 0, parallel_limit: 1, adopt: true }]);
  });

  it('says why the jails of the pool Bastille already uses cannot be moved yet', () => {
    const { dialog, emitted, error } = run(configured, {
      state: 'BLOCKED', blockers: ['Stop these jails first: db.'], rewrite: moves.slice(0, 1),
    });

    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
    expect(error.message).toBe('Bastille cannot move the jail paths in tank/bastille: Stop these jails first: db.');
  });

  for (const plan of [
    { state: 'MANAGED' as const, create: [], convert: [], mark: [] },
    { state: 'BLOCKED' as const, blockers: ['Stop these jails first: web.'] },
    { state: 'ADOPTABLE' as const },
  ]) {
    it(`saves the pool Bastille already uses as before when nothing needs moving (${plan.state})`, () => {
      const { dialog, emitted, error } = run(configured, plan);

      expect(dialog.confirm).not.toHaveBeenCalled();
      expect(error).toBeUndefined();
      expect(emitted).toEqual([{ pool: 'tank', startup_delay: 0, parallel_limit: 1 }]);
    });
  }

  it('saves the pool Bastille already uses as before when its preview fails', () => {
    const { ws, dialog, emitted, error } = run(configured, {});
    ws.call.and.callFake((method: string) => (method === 'bastille.adoption_preview'
      ? throwError(() => ({ reason: 'pool is locked' }))
      : of({ 'bastille.config': configured, 'pool.query': pools }[method])));
    const result: BastilleSettings[] = [];
    let failure: any;
    openBastilleSettings(ws as any, dialog as any, {} as any).subscribe({
      next: (settings) => result.push(settings), error: (e) => { failure = e; },
    });

    expect(emitted.length).toBe(1);
    expect(failure).toBeUndefined();
    expect(result).toEqual([{ pool: 'tank', startup_delay: 0, parallel_limit: 1 }]);
  });
});
