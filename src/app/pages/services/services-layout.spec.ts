import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

// the internal development record: the Services host (services.component.html) is div.fc-page on the page shell:
// the header row holds the list toolbar's #351 filter group (the search glyph as its addon, the
// #filter ref on the native input) beside the hlm-spinner loading glyph, then the table row. The
// stand-in mirrors that markup against services.component.css through styleUrls (exactly as the
// page); freecore-ui.css and the spartan sheet are Karma global styles, so it only needs the
// `.ix-blue.fc-ui` root <body> carries. The two extra table rows stand in for the 5% gap contract.
@Component({
  standalone: true,
  imports: [MatIconModule, HlmInputGroupImports, HlmSpinnerImports],
  template: `
    <h2 id="services-title" class="fc-services-title fc-page-title">Services</h2>
    <div id="services-page" class="fc-page">
      <div class="services-header-layout">
        <div id="services-filter" class="fc-table-search services-filter">
          <hlm-input-group>
            <hlm-input-group-addon (click)="filter.focus()"><mat-icon aria-hidden="true">search</mat-icon></hlm-input-group-addon>
            <input hlmInputGroupInput #filter type="text" placeholder="Filter Services" aria-label="Filter Services">
          </hlm-input-group>
        </div>
        <hlm-spinner id="services-spinner" />
      </div>
      <div class="services-table-row-layout">
        <div class="services-table-layout">Table</div>
      </div>
      <div class="gap-test-row services-table-row-layout table-row-ltr">
        <div class="services-table-layout table-ltr-first">First</div>
        <div class="services-table-layout table-ltr-last">Last</div>
      </div>
      <div dir="rtl" class="gap-test-row services-table-row-layout table-row-rtl">
        <div class="services-table-layout table-rtl-first">First</div>
        <div class="services-table-layout table-rtl-last">Last</div>
      </div>
    </div>
  `,
  styles: ['.gap-test-row { width: 400px; }'],
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./services.component.css'],
})
class ServicesLayoutTestHostComponent {}

describe('Services page shell layout', () => {
  let fixture: ComponentFixture<ServicesLayoutTestHostComponent>;
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  async function mount(width: number): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [ServicesLayoutTestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(ServicesLayoutTestHostComponent);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = `position:fixed; top:0; left:0; width:${width}px; z-index:1`;
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);
  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);

  it('is the uncapped page under the one title voice, no card left', async () => {
    await mount(1200);
    const page = getComputedStyle(q('#services-page'));
    expect(page.minWidth).toBe('0px');
    expect(page.maxWidth).toBe('none');
    expect(left(q('#services-page'))).toBe(0);
    const title = getComputedStyle(q('#services-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(title.marginBottom).toBe('16px'); // the list pitch
    expect(host.querySelector('mat-card, mat-card-header, mat-card-content, mat-form-field, mat-spinner')).toBeNull();
  });

  // the internal development record: the view-controls block (the dead card/slim toggles) is gone with the card view.
  it('preserves the header row contract, centred on the 32px line at the 8px gap over the 16px pitch', async () => {
    await mount(1200);
    const header = getComputedStyle(q('.services-header-layout'));

    expect(header.display).toBe('flex');
    expect(header.boxSizing).toBe('border-box');
    expect(header.flexDirection).toBe('row');
    expect(header.flexWrap).toBe('nowrap');
    expect(header.alignItems).toBe('center');
    expect(header.columnGap).toBe('8px');
    expect(header.paddingTop).toBe('0px');
    expect(header.paddingBottom).toBe('16px');
    expect(header.paddingLeft).toBe('0px');
    expect(host.querySelector('.view-controls')).toBeNull();
  });

  it('draws the filter as the #351 group: 300px cap on the page edge, the 32px box, the 16px search addon, no #filter id', async () => {
    await mount(1200);
    const filter = q('#services-filter');
    expect(host.querySelector('#filter')).toBeNull(); // material-reduction.css hacks that id
    const s = getComputedStyle(filter);
    expect(s.flexGrow).toBe('1');
    expect(s.flexShrink).toBe('1');
    expect(s.flexBasis).toBe('200px');
    expect(s.maxWidth).toBe('300px');
    expect(s.minWidth).toBe('0px');
    expect(s.position).toBe('relative'); // .fc-table-search
    expect(left(filter)).toBe(0);
    expect(Math.round(filter.getBoundingClientRect().width)).toBe(300);
    const group = q('#services-filter hlm-input-group');
    expect(getComputedStyle(group).minWidth).toBe('0px');
    expect(Math.round(group.getBoundingClientRect().width)).toBe(300);
    expect(Math.round(group.getBoundingClientRect().height)).toBe(32);
    expect(getComputedStyle(group).borderTopWidth).toBe('1px');
    const glyph = getComputedStyle(q('#services-filter hlm-input-group-addon .mat-icon'));
    expect(glyph.fontSize).toBe('16px');
    expect(glyph.width).toBe('16px');
    expect(glyph.height).toBe('16px');
    expect(glyph.lineHeight).toBe('16px');
    const input = q('#services-filter input[hlmInputGroupInput]');
    expect(input).not.toBeNull();
    expect(input.getAttribute('placeholder')).toBe('Filter Services');
    // the addon leads the input on the box row
    expect(q('#services-filter hlm-input-group-addon').getBoundingClientRect().right).toBeLessThanOrEqual(input.getBoundingClientRect().left);
  });

  it('shows loading as the 20px fg2 spinner glyph beside the filter on the header line', async () => {
    await mount(1200);
    const spinner = q('#services-spinner');
    const s = getComputedStyle(spinner);
    expect(s.fontSize).toBe('20px');
    expect(s.color).toBe('rgb(151, 166, 174)');
    expect(spinner.getAttribute('role')).toBe('status');
    // layout boxes, not client rects: the glyph spins (a transform) and would skew a rect
    const filter = q('#services-filter');
    expect(spinner.offsetLeft - (filter.offsetLeft + filter.offsetWidth)).toBe(8);
    expect(Math.abs((spinner.offsetTop + spinner.offsetHeight / 2) - (filter.offsetTop + filter.offsetHeight / 2))).toBeLessThanOrEqual(1);
  });

  it('preserves both space-between start-aligned table rows', async () => {
    await mount(1200);
    const rows = host.querySelectorAll('.gap-test-row');

    expect(rows.length).toBe(2);
    rows.forEach((row: Element) => {
      const styles = getComputedStyle(row);

      expect(styles.display).toBe('flex');
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flexDirection).toBe('row');
      expect(styles.flexWrap).toBe('nowrap');
      expect(styles.alignItems).toBe('flex-start');
      expect(styles.justifyContent).toBe('space-between');
    });
  });

  it('preserves the 5-percent direction-aware gap and final-child resets', async () => {
    await mount(1200);
    const ltrFirst = getComputedStyle(q('.table-ltr-first'));
    const ltrLast = getComputedStyle(q('.table-ltr-last'));
    const rtlFirst = getComputedStyle(q('.table-rtl-first'));
    const rtlLast = getComputedStyle(q('.table-rtl-last'));

    expect(ltrFirst.marginLeft).toBe('0px');
    expect(ltrFirst.marginRight).toBe('20px');
    expect(ltrLast.marginLeft).toBe('0px');
    expect(ltrLast.marginRight).toBe('0px');
    expect(rtlFirst.marginLeft).toBe('20px');
    expect(rtlFirst.marginRight).toBe('0px');
    expect(rtlLast.marginLeft).toBe('0px');
    expect(rtlLast.marginRight).toBe('0px');
  });

  it('preserves the full-width column-flex table-host contract', async () => {
    await mount(1200);
    const styles = getComputedStyle(q('.table-ltr-first'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flex).toBe('1 1 100%');
    expect(styles.flexDirection).toBe('column');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.maxWidth).toBe('100%');
  });
});
