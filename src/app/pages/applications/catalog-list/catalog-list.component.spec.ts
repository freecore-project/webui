import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { MaterialModule } from '../../../appMaterial.module';
import { CatalogListComponent } from './catalog-list.component';

const entries = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `e${i}`, title: `Application ${i}`, name: `app${i}`, description: '', category: 'Utilities', status: 'UNRESOLVED', catalog_app: true, reason: null, icon: null,
} as any));
// the ladder the list sheet reads (no theme service in karma); removed after each case -- an inline
// value left on documentElement leaks into the specs that pin the sheets' fallback palette
const themeVars = { '--fg1': 'rgb(238, 238, 238)', '--fg2': 'rgb(150, 160, 170)', '--bg2': 'rgb(23, 30, 36)', '--accent': 'rgb(143, 180, 199)' };

/** the internal development record: the catalog is a list beside its detail panel -- rows, a listbox to the keyboard. */
describe('CatalogListComponent (the internal development record)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CatalogListComponent],
      imports: [CommonModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmSpinnerImports],
    }).compileComponents();
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  });
  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  // The component is OnPush: inputs set by hand need the hook the binding would run and a marked check.
  const refresh = (f: ComponentFixture<CatalogListComponent>) => { f.componentRef.injector.get(ChangeDetectorRef).markForCheck(); f.detectChanges(); };
  function list(inputs: Partial<CatalogListComponent>): ComponentFixture<CatalogListComponent> {
    const fixture = TestBed.createComponent(CatalogListComponent);
    Object.assign(fixture.componentInstance, { entries: entries(3), ...inputs });
    fixture.componentInstance.ngOnChanges({ entries: {} as any, selectedId: {} as any });
    fixture.nativeElement.classList.add('fc-ui');
    refresh(fixture);
    return fixture;
  }
  const rows = (f: ComponentFixture<CatalogListComponent>) => Array.from(f.nativeElement.querySelectorAll('button.catalog-row')) as HTMLButtonElement[];
  const key = (f: ComponentFixture<CatalogListComponent>, k: string) => f.nativeElement.querySelector('.catalog-list').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('renders one row per entry, stacked, the selected one marked, in the tab order and on the selected surface', () => {
    const f = list({ selectedId: 'e1' });
    expect(rows(f).length).toBe(3);
    expect(rows(f)[1].getAttribute('aria-selected')).toBe('true');
    expect(rows(f).map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    const [first, second] = rows(f).map((r) => r.getBoundingClientRect());
    expect(second.top).toBeGreaterThanOrEqual(first.bottom - 1); // a list, not a strip
    expect(second.left).toBe(first.left);
    expect(second.height).toBeGreaterThanOrEqual(48);
    expect(getComputedStyle(rows(f)[1]).backgroundColor).toBe('rgb(23, 30, 36)');
    expect(f.nativeElement.querySelector('.catalog-list').getAttribute('role')).toBe('listbox');
    expect(rows(f)[1].getAttribute('role')).toBe('option');
  });

  it('scrolls inside its own box so the detail panel beside it stays in view', () => {
    const f = list({ entries: entries(80) });
    const box = f.nativeElement.querySelector('.catalog-list') as HTMLElement;
    expect(getComputedStyle(box).overflowY).toBe('auto');
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
  });

  it('emits the entry on click and not while disabled', () => {
    const f = list({});
    const got: string[] = [];
    f.componentInstance.selected.subscribe((e) => got.push(e.id));
    rows(f)[2].click();
    f.componentInstance.disabled = true;
    refresh(f);
    rows(f)[2].click();
    expect(got).toEqual(['e2']);
    expect(rows(f)[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('moves focus with ArrowDown/Up, Home and End and selects on Enter and Space', () => {
    const f = list({});
    const got: string[] = [];
    f.componentInstance.selected.subscribe((e) => got.push(e.id));
    rows(f)[0].focus();
    key(f, 'ArrowDown'); f.detectChanges();
    expect(document.activeElement).toBe(rows(f)[1]);
    expect(rows(f)[1].tabIndex).toBe(0);
    key(f, 'End'); expect(document.activeElement).toBe(rows(f)[2]);
    key(f, 'Home'); expect(document.activeElement).toBe(rows(f)[0]);
    key(f, 'ArrowUp'); expect(document.activeElement).toBe(rows(f)[0]);
    key(f, 'Enter'); key(f, ' ');
    expect(got).toEqual(['e0', 'e0']);
  });

  it('shows the engine spinner while loading', () => {
    const f = list({ loading: true });
    expect(f.nativeElement.querySelector('#catalog-list-spinner')).not.toBeNull();
    expect(rows(f).length).toBe(0);
    expect(f.nativeElement.querySelector('.catalog-list').getAttribute('aria-busy')).toBe('true');
  });

  it('shows the empty line when nothing matches', () => {
    const f = list({ entries: [], emptyText: 'No matching applications' });
    expect(f.nativeElement.querySelector('.list-empty').textContent).toContain('No matching applications');
  });

  it('focusEntry focuses the row by id', () => {
    const f = list({});
    f.componentInstance.focusEntry('e2');
    expect(document.activeElement).toBe(rows(f)[2]);
  });

  it('tags each row: the tier first, then Installed, else the category', () => {
    const items = entries(5);
    items[0].catalog_app = false;
    items[1].reason = 'no amd64 image';
    items[2].status = 'UNAVAILABLE'; items[2].reason = 'archived';
    const f = list({ entries: items, installedIds: new Set(['e3']) });
    const tags = Array.from(f.nativeElement.querySelectorAll('.row-tag')) as HTMLElement[];
    expect(tags.map((t) => t.textContent.trim())).toEqual(['Unreviewed', 'no amd64 image', 'Not available', 'Installed', 'Utilities']);
    expect(tags[2].getAttribute('title')).toBe('archived');
    expect(tags[2].classList).toContain('row-tag--warn');
    expect(tags[3].classList).toContain('row-tag--installed');
  });

  // the internal development record: a provider logo drawn for light backgrounds gets a traced edge on a dark theme only
  it('outlines provider icons on a dark theme, never the placeholder glyph or a light theme', () => {
    const items = entries(2);
    items[0].icon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      root.classList.add('dark');
      const f = list({ entries: items });
      const img = f.nativeElement.querySelector('.row-icon img') as HTMLElement;
      expect(getComputedStyle(img).filter.match(/drop-shadow/g)?.length).toBe(4);
      expect(getComputedStyle(f.nativeElement.querySelector('.row-icon .mat-icon')).filter).toBe('none');
      root.classList.remove('dark');
      expect(getComputedStyle(img).filter).toBe('none');
    } finally {
      root.classList.toggle('dark', wasDark);
    }
  });
});
