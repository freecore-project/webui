import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { fakeAsync, flush } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { LayoutMediaObserver } from './layout-media-observer.service';

describe('LayoutMediaObserver', () => {
  const queries = [
    'screen and (min-width: 0px) and (max-width: 599.98px)',
    'screen and (min-width: 600px) and (max-width: 959.98px)',
    'screen and (min-width: 960px) and (max-width: 1279.98px)',
    'screen and (min-width: 1280px) and (max-width: 1919.98px)',
    'screen and (min-width: 1920px) and (max-width: 4999.98px)',
    'screen and (max-width: 599.98px)',
    'screen and (max-width: 959.98px)',
    'screen and (max-width: 1279.98px)',
    'screen and (max-width: 1919.98px)',
    'screen and (min-width: 600px)',
    'screen and (min-width: 960px)',
    'screen and (min-width: 1280px)',
    'screen and (min-width: 1920px)',
  ];

  let breakpointObserver: jasmine.SpyObj<BreakpointObserver>;
  let states: Subject<BreakpointState>;
  let observer: LayoutMediaObserver;

  beforeEach(() => {
    states = new Subject<BreakpointState>();
    breakpointObserver = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe', 'isMatched']);
    breakpointObserver.observe.and.returnValue(states);
    observer = new LayoutMediaObserver(breakpointObserver);
  });

  it('observes the exact legacy Flex Layout breakpoint queries', () => {
    expect(breakpointObserver.observe).toHaveBeenCalledOnceWith(queries);
  });

  it('emits the active changes in descending legacy priority', fakeAsync(() => {
    const emissions = [];
    observer.asObservable().subscribe((changes) => emissions.push(changes));

    states.next(stateFor(queries[0], queries[5], queries[6], queries[7], queries[8]));
    flush();

    expect(emissions.length).toBe(1);
    expect(emissions[0].map((change) => change.mqAlias)).toEqual([
      'xs', 'lt-sm', 'lt-md', 'lt-lg', 'lt-xl',
    ]);
    expect(emissions[0].map((change) => change.priority)).toEqual([1000, 950, 850, 750, 650]);
    expect(emissions[0][0]).toEqual(jasmine.objectContaining({
      matches: true,
      mediaQuery: queries[0],
      mqAlias: 'xs',
      suffix: 'Xs',
      priority: 1000,
      property: '',
      value: undefined,
    }));
  }));

  it('keeps each bounded alias first across the five legacy ranges', fakeAsync(() => {
    const firstAliases = [];
    observer.asObservable().subscribe((changes) => firstAliases.push(changes[0].mqAlias));

    states.next(stateFor(queries[0], queries[5], queries[6], queries[7], queries[8]));
    flush();
    states.next(stateFor(queries[1], queries[6], queries[7], queries[8], queries[9]));
    flush();
    states.next(stateFor(queries[2], queries[7], queries[8], queries[9], queries[10]));
    flush();
    states.next(stateFor(queries[3], queries[8], queries[9], queries[10], queries[11]));
    flush();
    states.next(stateFor(queries[4], queries[9], queries[10], queries[11], queries[12]));
    flush();

    expect(firstAliases).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
  }));

  it('coalesces same-turn changes and suppresses duplicate activation sets', fakeAsync(() => {
    const emissions = [];
    observer.asObservable().subscribe((changes) => emissions.push(changes));

    states.next(stateFor(queries[0], queries[5]));
    states.next(stateFor(queries[1], queries[6], queries[9]));
    flush();
    states.next(stateFor(queries[1], queries[6], queries[9]));
    flush();

    expect(emissions.length).toBe(1);
    expect(emissions[0].map((change) => change.mqAlias)).toEqual(['sm', 'lt-md', 'gt-xs']);
  }));

  it('resolves registered aliases and raw queries for isActive', () => {
    breakpointObserver.isMatched.and.callFake((query: string) => query === queries[0]);

    expect(observer.isActive('xs')).toBeTrue();
    expect(observer.isActive(queries[0])).toBeTrue();
    expect(observer.isActive(['sm', 'xs'])).toBeTrue();
    expect(observer.isActive('sm')).toBeFalse();
    expect(observer.isActive('unknown')).toBeFalse();
  });

  function stateFor(...activeQueries: string[]): BreakpointState {
    return {
      matches: activeQueries.length > 0,
      breakpoints: queries.reduce((breakpoints, query) => ({
        ...breakpoints,
        [query]: activeQueries.includes(query),
      }), {}),
    };
  }
});
