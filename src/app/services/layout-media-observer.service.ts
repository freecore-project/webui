import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { asapScheduler, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

interface LayoutBreakpoint {
  alias: string;
  mediaQuery: string;
  priority: number;
  suffix: string;
}

const layoutBreakpoints: LayoutBreakpoint[] = [
  {
    alias: 'xs',
    mediaQuery: 'screen and (min-width: 0px) and (max-width: 599.98px)',
    priority: 1000,
    suffix: 'Xs',
  },
  {
    alias: 'sm',
    mediaQuery: 'screen and (min-width: 600px) and (max-width: 959.98px)',
    priority: 900,
    suffix: 'Sm',
  },
  {
    alias: 'md',
    mediaQuery: 'screen and (min-width: 960px) and (max-width: 1279.98px)',
    priority: 800,
    suffix: 'Md',
  },
  {
    alias: 'lg',
    mediaQuery: 'screen and (min-width: 1280px) and (max-width: 1919.98px)',
    priority: 700,
    suffix: 'Lg',
  },
  {
    alias: 'xl',
    mediaQuery: 'screen and (min-width: 1920px) and (max-width: 4999.98px)',
    priority: 600,
    suffix: 'Xl',
  },
  {
    alias: 'lt-sm',
    mediaQuery: 'screen and (max-width: 599.98px)',
    priority: 950,
    suffix: 'LtSm',
  },
  {
    alias: 'lt-md',
    mediaQuery: 'screen and (max-width: 959.98px)',
    priority: 850,
    suffix: 'LtMd',
  },
  {
    alias: 'lt-lg',
    mediaQuery: 'screen and (max-width: 1279.98px)',
    priority: 750,
    suffix: 'LtLg',
  },
  {
    alias: 'lt-xl',
    mediaQuery: 'screen and (max-width: 1919.98px)',
    priority: 650,
    suffix: 'LtXl',
  },
  {
    alias: 'gt-xs',
    mediaQuery: 'screen and (min-width: 600px)',
    priority: -950,
    suffix: 'GtXs',
  },
  {
    alias: 'gt-sm',
    mediaQuery: 'screen and (min-width: 960px)',
    priority: -850,
    suffix: 'GtSm',
  },
  {
    alias: 'gt-md',
    mediaQuery: 'screen and (min-width: 1280px)',
    priority: -750,
    suffix: 'GtMd',
  },
  {
    alias: 'gt-lg',
    mediaQuery: 'screen and (min-width: 1920px)',
    priority: -650,
    suffix: 'GtLg',
  },
];

export class LayoutMediaChange {
  property = '';
  value: any = undefined;

  constructor(
    public matches = false,
    public mediaQuery = 'all',
    public mqAlias = '',
    public suffix = '',
    public priority = 0,
  ) {}

  clone(): LayoutMediaChange {
    return new LayoutMediaChange(
      this.matches,
      this.mediaQuery,
      this.mqAlias,
      this.suffix,
      this.priority,
    );
  }
}

@Injectable({ providedIn: 'root' })
export class LayoutMediaObserver {
  private readonly queries = layoutBreakpoints.map((breakpoint) => breakpoint.mediaQuery);
  private readonly changes$ = this.breakpointObserver.observe(this.queries).pipe(
    debounceTime(0, asapScheduler),
    map((state) => this.activeChanges(state)),
    filter((changes) => changes.length > 0),
    distinctUntilChanged((previous, current) => this.sameQueries(previous, current)),
  );

  constructor(private breakpointObserver: BreakpointObserver) {}

  asObservable(): Observable<LayoutMediaChange[]> {
    return this.changes$;
  }

  isActive(value: string | string[]): boolean {
    const aliases = (Array.isArray(value) ? value : [value])
      .reduce((queries, query) => queries.concat(query.split(',')), [] as string[])
      .map((query) => query.trim());

    return aliases.some((alias) => {
      const breakpoint = layoutBreakpoints.find((candidate) => (
        candidate.alias === alias || candidate.mediaQuery === alias
      ));

      return breakpoint ? this.breakpointObserver.isMatched(breakpoint.mediaQuery) : false;
    });
  }

  private activeChanges(state: BreakpointState): LayoutMediaChange[] {
    return layoutBreakpoints
      .filter((breakpoint) => state.breakpoints[breakpoint.mediaQuery])
      .map((breakpoint) => new LayoutMediaChange(
        true,
        breakpoint.mediaQuery,
        breakpoint.alias,
        breakpoint.suffix,
        breakpoint.priority,
      ))
      .sort((first, second) => second.priority - first.priority);
  }

  private sameQueries(previous: LayoutMediaChange[], current: LayoutMediaChange[]): boolean {
    return previous.length === current.length && previous.every((change, index) => (
      change.mediaQuery === current[index].mediaQuery
    ));
  }
}
