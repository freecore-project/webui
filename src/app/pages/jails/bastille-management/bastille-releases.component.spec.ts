import { TranslateDefaultParser } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { BastilleRelease, BastilleReleasesComponent, bastilleSize } from './bastille-releases.component';

const ready = { installed: true, configured: true, configuration_valid: true, enabled: true, pool: 'tank' };
const free: BastilleRelease = {
  name: '15.1-RELEASE', consumers: [], used_bytes: 390070272, cache_bytes: 164626432,
  deletable: false, reason: 'This release was not created here; remove it with bastille destroy.',
};
const held: BastilleRelease = {
  name: '15.0-RELEASE', consumers: ['db', 'web'], used_bytes: 390070272, cache_bytes: 164626432,
  deletable: false, reason: 'In use by db, web.',
};

function setup(releases: BastilleRelease[] = [free, held]) {
  const ws = {
    call: jasmine.createSpy('call').and.callFake((method) => of({
      'bastille.config': ready,
      'bastille.releases': releases,
    }[method])),
  };
  const router = { navigate: jasmine.createSpy('navigate') };
  const translate = { parser: new TranslateDefaultParser(), instant: jasmine.createSpy('instant').and.callFake((key) => key) };
  const component = new BastilleReleasesComponent(ws as any, router as any, translate as any);
  const entity: any = {
    getData: jasmine.createSpy('getData'),
    callGetFunction: () => entity.getFunction.subscribe((rows) => { entity.rows = rows; }),
  };
  component.entityList = entity;
  component.ready = true;
  return { component, ws, router, entity, translate };
}

describe('Bastille releases (read-only)', () => {
  it('lists releases after checking the configuration', () => {
    const { component, entity, ws } = setup();
    component.callGetFunction(entity);
    expect(entity.rows.map((row) => row.name)).toEqual(['15.1-RELEASE', '15.0-RELEASE']);
    expect(ws.call.calls.allArgs()).toEqual([['bastille.config'], ['bastille.releases']]);
    expect(component.ready).toBeTrue();
  });

  it('explains an unconfigured pool without asking for releases', () => {
    const { component, entity, ws } = setup();
    ws.call.and.returnValue(of({ ...ready, configured: false }));
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([]);
    expect(component.error).toContain('Select a data pool');
    expect(component.ready).toBeFalse();
    expect(ws.call).toHaveBeenCalledTimes(1);
  });

  it('renders sizes and the jails on each release, and never a management reason', () => {
    const { component } = setup();
    const rows = component.resourceTransformIncomingRestData([free, held]);
    expect(rows.map((row) => row.used_label)).toEqual(['372 MiB', '372 MiB']);
    expect(rows.map((row) => row.cache_label)).toEqual(['157 MiB', '157 MiB']);
    expect(rows.map((row) => row.jails_label)).toEqual(['—', 'db, web']);
  });

  it('formats byte counts, and reports an unknown size rather than a number', () => {
    expect(bastilleSize(0)).toBe('0 B');
    expect(bastilleSize(1536)).toBe('1.5 KiB');
    expect(bastilleSize(390070272)).toBe('372 MiB');
    expect(bastilleSize(null)).toBe('—');
    expect(bastilleSize(undefined)).toBe('—');
  });

  it('offers no row action and no Add, only Refresh and the way back to the jail list', () => {
    const { component, entity, router } = setup();
    // the internal development record: the entity table's contract for a table without row actions.
    expect(component.noActions).toBeTrue();
    expect((component as any).getActions).toBeUndefined();
    expect((component as any).route_add).toBeUndefined();
    expect((component as any).getAddActions).toBeUndefined();
    expect(component.custActions.map((action) => action.id)).toEqual(['refresh', 'jails']);
    component.custActions[0].function();
    expect(entity.getData).toHaveBeenCalledTimes(1);
    component.custActions[1].function();
    expect(router.navigate).toHaveBeenCalledWith(['/jails', 'bastille']); // the internal development record: the crumb chain is Jails › Releases, so the page keeps its own way back
  });

  it('reports a query failure and marks the page not ready', () => {
    const { component, entity, ws } = setup();
    ws.call.and.callFake((method) => method === 'bastille.config' ? of(ready) : throwError(() => ({ reason: 'Pool locked' })));
    component.callGetFunction(entity);
    expect(entity.rows).toEqual([]);
    expect(component.error).toBe('Pool locked');
    expect(component.ready).toBeFalse();
  });
});
