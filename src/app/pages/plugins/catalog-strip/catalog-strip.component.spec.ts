import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { MaterialModule } from '../../../appMaterial.module';
import { CatalogStripComponent } from './catalog-strip.component';

const entries = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `e${i}`, title: `Application ${i}`, name: `app${i}`, description: '', category: 'X', status: 'UNRESOLVED', catalog_app: true, reason: null, icon: null,
} as any));
// the ladder the strip sheet reads (no theme service in karma); removed after each case -- an inline
// value left on documentElement leaks into the specs that pin the sheets' fallback palette
const themeVars = { '--fg1': 'rgb(238, 238, 238)', '--fg2': 'rgb(150, 160, 170)', '--bg2': 'rgb(23, 30, 36)', '--accent': 'rgb(143, 180, 199)' };

/** the internal development record: the 15.1 strip kept for the 15.0 plugin index. the internal development record: the strip is the 13.3 Plugins strip -- tiles, arrows, a listbox to the keyboard. */
describe('CatalogStripComponent on the Plugins page (the internal development record, #425)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CatalogStripComponent],
      imports: [CommonModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmSpinnerImports],
    }).compileComponents();
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  });
  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  // The component is OnPush: inputs set by hand need the hook the binding would run and a marked check.
  const refresh = (f: ComponentFixture<CatalogStripComponent>) => { f.componentRef.injector.get(ChangeDetectorRef).markForCheck(); f.detectChanges(); };
  function strip(inputs: Partial<CatalogStripComponent>): ComponentFixture<CatalogStripComponent> {
    const fixture = TestBed.createComponent(CatalogStripComponent);
    Object.assign(fixture.componentInstance, { entries: entries(3), ...inputs });
    fixture.componentInstance.ngOnChanges({ entries: {} as any, selectedId: {} as any });
    fixture.nativeElement.classList.add('fc-ui');
    refresh(fixture);
    return fixture;
  }
  const tiles = (f: ComponentFixture<CatalogStripComponent>) => Array.from(f.nativeElement.querySelectorAll('button.strip-tile')) as HTMLButtonElement[];
  const key = (f: ComponentFixture<CatalogStripComponent>, k: string) => f.nativeElement.querySelector('.strip-scroller').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('renders one tile per entry, the selected one marked, in the tab order and on the selected surface', () => {
    const f = strip({ selectedId: 'e1' });
    expect(tiles(f).length).toBe(3);
    expect(tiles(f)[1].getAttribute('aria-selected')).toBe('true');
    expect(tiles(f).map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    expect(tiles(f)[1].getBoundingClientRect().width).toBe(132);
    expect(tiles(f)[1].getBoundingClientRect().height).toBe(124);
    expect(getComputedStyle(tiles(f)[1]).backgroundColor).toBe('rgb(23, 30, 36)');
    expect(getComputedStyle(tiles(f)[1]).borderTopColor).toBe('rgb(238, 238, 238)');
    expect(f.nativeElement.querySelector('.strip-scroller').getAttribute('role')).toBe('listbox');
    expect(tiles(f)[1].getAttribute('role')).toBe('option');
  });

  it('emits the entry on click and not while disabled', () => {
    const f = strip({});
    const got: string[] = [];
    f.componentInstance.selected.subscribe((e) => got.push(e.id));
    tiles(f)[2].click();
    f.componentInstance.disabled = true;
    refresh(f);
    tiles(f)[2].click();
    expect(got).toEqual(['e2']);
    expect(tiles(f)[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('moves focus with ArrowRight/Left, Home and End and selects on Enter and Space', () => {
    const f = strip({});
    const got: string[] = [];
    f.componentInstance.selected.subscribe((e) => got.push(e.id));
    tiles(f)[0].focus();
    key(f, 'ArrowRight'); f.detectChanges();
    expect(document.activeElement).toBe(tiles(f)[1]);
    expect(tiles(f)[1].tabIndex).toBe(0);
    key(f, 'End'); expect(document.activeElement).toBe(tiles(f)[2]);
    key(f, 'Home'); expect(document.activeElement).toBe(tiles(f)[0]);
    key(f, 'ArrowLeft'); expect(document.activeElement).toBe(tiles(f)[0]);
    key(f, 'Enter'); key(f, ' ');
    expect(got).toEqual(['e0', 'e0']);
  });

  it('shows the engine spinner at the strip height while loading', () => {
    const f = strip({ loading: true });
    expect(f.nativeElement.querySelector('#catalog-strip-spinner')).not.toBeNull();
    expect(tiles(f).length).toBe(0);
    expect(f.nativeElement.querySelector('.strip-scroller').getBoundingClientRect().height).toBeGreaterThanOrEqual(134);
  });

  it('shows the empty line when nothing matches', () => {
    const f = strip({ entries: [], emptyText: 'No matching applications' });
    expect(f.nativeElement.querySelector('.strip-empty').textContent).toContain('No matching applications');
  });

  it('keeps the arrows idle when every tile fits', fakeAsync(() => {
    const f = strip({});
    tick(); refresh(f);
    const arrows = f.nativeElement.querySelectorAll('.strip-arrow');
    expect(arrows.length).toBe(2);
    expect(arrows[0].classList).toContain('is-idle');
    expect(getComputedStyle(arrows[0]).visibility).toBe('hidden');
  }));

  it('shows the arrows when the tiles overflow, pages by the visible width and disables the edge', fakeAsync(() => {
    const f = strip({ entries: entries(12) }); // 12 x 132 + 11 x 8 = 1672 > the ~784px host in Karma's 800px window
    tick(); refresh(f);
    const [prev, next] = Array.from(f.nativeElement.querySelectorAll('.strip-arrow')) as HTMLButtonElement[];
    const scroller = f.nativeElement.querySelector('.strip-scroller') as HTMLElement;
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(prev.classList).not.toContain('is-idle');
    expect(prev.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();
    const by = spyOn(scroller, 'scrollBy');
    next.click();
    expect(by).toHaveBeenCalledTimes(1);
    expect(by.calls.mostRecent().args[0] as unknown).toEqual({ left: scroller.clientWidth, behavior: 'smooth' });
    scroller.scrollLeft = scroller.scrollWidth;
    scroller.dispatchEvent(new Event('scroll'));
    refresh(f);
    expect(next.disabled).toBeTrue();
    expect(prev.disabled).toBeFalse();
  }));

  it('focusTile focuses the tile by id', () => {
    const f = strip({});
    f.componentInstance.focusTile('e2');
    expect(document.activeElement).toBe(tiles(f)[2]);
  });

  it('writes the tier tell under the title', () => {
    const list = entries(3);
    list[0].catalog_app = false;
    list[1].reason = 'no amd64 image';
    list[2].status = 'UNAVAILABLE'; list[2].reason = 'archived';
    const f = strip({ entries: list });
    const tells = Array.from(f.nativeElement.querySelectorAll('.tile-tell')).map((t: HTMLElement) => t.textContent.trim());
    expect(tells).toEqual(['Unreviewed', 'no amd64 image', 'Unavailable']);
    expect(f.nativeElement.querySelectorAll('.tile-tell')[2].getAttribute('title')).toBe('archived');
  });

  // the internal development record: a provider logo drawn for light backgrounds gets a traced edge on a dark theme only
  it('outlines provider icons on a dark theme, never the placeholder glyph or a light theme', () => {
    const list = entries(2);
    list[0].icon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      root.classList.add('dark');
      const f = strip({ entries: list });
      const img = f.nativeElement.querySelector('.tile-icon img') as HTMLElement;
      expect(getComputedStyle(img).filter.match(/drop-shadow/g)?.length).toBe(4);
      expect(getComputedStyle(f.nativeElement.querySelector('.tile-icon .mat-icon')).filter).toBe('none');
      root.classList.remove('dark');
      expect(getComputedStyle(img).filter).toBe('none');
    } finally {
      root.classList.toggle('dark', wasDark);
    }
  });
});
