import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  standalone: false,
  selector: 'manager-layout-test-host',
  template: `
    <div class="fields manager-fields-layout">
      <div class="manager-new-pool-row-layout">
        <div class="inline manager-name-layout">Name</div>
        <div class="inline manager-encryption-layout">Encryption</div>
        <div class="inline encryption-select manager-algorithm-layout">Algorithm</div>
      </div>
      <div class="pool-error manager-column-full-layout">Error</div>
      <div class="button-bar manager-column-full-layout">Buttons</div>
    </div>
    <div class="filters manager-filter-row-layout">
      <input hlmInput class="manager-filter-field-layout" />
      <div class="manager-filter-spacer-layout"></div>
      <input hlmInput class="manager-filter-field-layout" />
    </div>
    <div class="ix-blue">
      <div id="manager-header-cell" class="datatable-header-cell"
        style="position: relative; width: 82px; height: 52px">
        <div class="headerCheckBox"><hlm-checkbox /></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./manager.component.css'],
})
class ManagerLayoutTestHostComponent {}

describe('storage manager layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ManagerLayoutTestHostComponent],
      imports: [...HlmCheckboxImports, ...HlmInputImports, NoopAnimationsModule],
    }).compileComponents();
  }));

  it('preserves the fields column contract', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.manager-fields-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('column');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.width).toBe('600px');
  });

  // the internal development record: the row centres its controls on the Name box line, in the 20px bands the
  // Material field reserved above and below its box (it used to stretch them and pad them by hand).
  it('centres the new-pool row in the field\'s bands', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.manager-new-pool-row-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('stretch');
    expect(styles.paddingTop).toBe('20px');
    expect(styles.paddingBottom).toBe('20px');
  });

  it('preserves new-pool item sizing', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const name = getComputedStyle(root.querySelector('.manager-name-layout'));
    const encryption = getComputedStyle(root.querySelector('.manager-encryption-layout'));
    const algorithm = getComputedStyle(root.querySelector('.manager-algorithm-layout'));

    expect(name.boxSizing).toBe('border-box');
    expect(name.flex).toBe('1 1 40%');
    expect(name.maxWidth).toBe('40%');
    expect(encryption.boxSizing).toBe('border-box');
    expect(encryption.flex).toBe('1 1 25%');
    expect(encryption.maxWidth).toBe('25%');
    expect(algorithm.boxSizing).toBe('border-box');
    expect(algorithm.flex).toBe('1 1 0%');
    expect(algorithm.maxWidth).toBe('none');
  });

  it('preserves column-relative error and button-bar sizing', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    ['.pool-error', '.button-bar'].forEach((selector) => {
      const styles = getComputedStyle(root.querySelector(selector));
      expect(styles.boxSizing).withContext(selector).toBe('border-box');
      expect(styles.flex).withContext(selector).toBe('1 1 100%');
      expect(styles.minHeight).withContext(selector).toBe('auto');
      expect(styles.maxHeight).withContext(selector).toBe('100%');
    });
    expect(getComputedStyle(root.querySelector('.button-bar')).display).toBe('flex');
  });

  it('preserves disk-filter field and spacer caps', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const row = getComputedStyle(root.querySelector('.manager-filter-row-layout'));
    expect(row.display).toBe('flex');
    expect(row.boxSizing).toBe('border-box');
    expect(row.flexDirection).toBe('row');
    expect(row.flexWrap).toBe('nowrap');

    const fields = root.querySelectorAll('.manager-filter-field-layout');
    fields.forEach((field) => {
      const styles = getComputedStyle(field);
      expect(styles.display).toBe('block'); // #471: the filter is the kit input itself, a blockified flex item
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flex).toBe('1 1 100%');
      expect(styles.minWidth).toBe('0px');
      expect(styles.maxWidth).toBe('40%');
    });

    const spacer = getComputedStyle(root.querySelector('.manager-filter-spacer-layout'));
    expect(spacer.boxSizing).toBe('border-box');
    expect(spacer.flex).toBe('1 1 100%');
    expect(spacer.maxWidth).toBe('5%');
  });

  it('centers the kit checkbox in Pool Manager header cells', () => {
    const fixture = TestBed.createComponent(ManagerLayoutTestHostComponent);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('#manager-header-cell') as HTMLElement;
    const wrapper = cell.querySelector('.headerCheckBox') as HTMLElement;
    const checkbox = cell.querySelector('button[role="checkbox"]') as HTMLElement;
    const wrapperStyles = getComputedStyle(wrapper);
    const cellRect = cell.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const checkboxRect = checkbox.getBoundingClientRect();

    expect(wrapperStyles.position).toBe('absolute');
    expect(wrapperStyles.inset).toBe('0px');
    expect(wrapperStyles.margin).toBe('0px');
    expectCenter(wrapperRect, cellRect);
    expectCenter(checkboxRect, cellRect);
  });
});

function expectCenter(actual: DOMRect, container: DOMRect): void {
  expect(actual.left + actual.width / 2).toBeCloseTo(container.left + container.width / 2, 1);
  expect(actual.top + actual.height / 2).toBeCloseTo(container.top + container.height / 2, 1);
}

// the internal development record: the pool builder on the page shell -- the capped page under the one title voice,
// the two panes with their headings in the section voice (left-aligned on the pane, the free-standing
// group h4s on the .data-div's offset), the #353 tiers (Reset/Suggest/Repeat/Cancel outline, Create
// default, the vdev arrows and X ghost icon buttons with a 20px glyph) and the hairline action row this
// page restates because it is not a .fc-settings-form. The stand-in mirrors manager.component.html +
// vdev.component.html with both component sheets in the cascade under the `.ix-blue.fc-ui` root.
@Component({
  standalone: true,
  imports: [MatIconModule, ...HlmButtonImports],
  template: `
    <div id="create-pool-card" class="fc-page fc-page--capped">
      <h1 class="fc-page-title">Pool</h1>
      <div>
        <div class="manager">
          <div class="fields manager-fields-layout">
            <div class="button-bar manager-column-full-layout">
              <div><button id="pool-manager__reset-layout-button" hlmBtn variant="outline" type="button" [disabled]="true">Reset Layout</button></div>
              <div><button id="pool-manager__suggest-layout-button" hlmBtn variant="outline" type="button">Suggest Layout</button></div>
              <div class="button-spacer"></div>
              <div><button hlmBtn variant="outline" type="button" class="menu-toggle" id="pool-manager__add-vdev-button"><span>Add Vdev</span></button></div>
            </div>
          </div>
          <div class="wrapper">
            <div class="disks">
              <h4 id="avail-disks-title">Available Disks</h4>
              <div id="disks-table" style="height: 120px"></div>
              <div id="filter-wrapper" class="manager-filter-row-layout"></div>
            </div>
            <div class="pool">
              <div>
                <div class="data-div">
                  <div class="data-title"><h4 class="vdev-h4" id="data-title">Data VDevs</h4></div>
                  <div class="duplicate-button"><button id="pool-manager__create-data-vdevs-button" hlmBtn variant="outline" type="button">Repeat</button></div>
                </div>
                <div class="vdev-wrapper" id="vdev-0">
                  <div class="vdev-actions" id="vdev__action-buttons">
                    <button id="vdev__add-button" hlmBtn variant="ghost" size="icon" type="button"><mat-icon class="arrow">arrow_forward</mat-icon></button>
                    <button id="vdev__remove-button" hlmBtn variant="ghost" size="icon" type="button" [disabled]="true"><mat-icon class="arrow">arrow_back</mat-icon></button>
                  </div>
                  <div class="vdev-table">
                    <div id="vdev-table" style="height: 120px"></div>
                    <div class="vdev-wrapper">
                      <div class="vdev-type"><div class="datainfo">Estimated raw capacity: 0</div></div>
                      <div class="vdev-close">
                        <button id="vdev__close-button" hlmBtn variant="ghost" size="icon" type="button" aria-label="Remove"><mat-icon aria-hidden="true">close</mat-icon></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 class="vdev-h4" id="cache-title">Cache VDev</h4>
              </div>
            </div>
          </div>
        </div>
        <div class="sizeMessage">Estimated total raw data capacity: 0</div>
        <div class="forceCreateCheckbox"><span id="force">Force</span></div>
        <div class="buttons" id="pool-manager__button-group">
          <button id="pool-manager__create-button" hlmBtn type="button" name="create-button" [disabled]="true">Create</button>
          <button id="pool-manager__cancel-button" hlmBtn variant="outline" type="button">Cancel</button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./manager.component.css', './vdev/vdev.component.css'],
})
class PoolManagerPageStandIn {}

describe('Pool Manager page layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the sheets read bare var(--fg1) / var(--line)
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  async function mount(width: number): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [PoolManagerPageStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(PoolManagerPageStandIn);
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
  const box = (el: Element): number[] => [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)];

  it('is the capped page under the one title voice, the fields column on the page edge', async () => {
    await mount(1200);
    const page = q('#create-pool-card');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    expect(host.querySelector('mat-card, .mat-toolbar, .mat-card-toolbar, .pool-manager-title')).toBeNull();
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    const fields = getComputedStyle(q('.fields'));
    expect(fields.width).toBe('600px');
    expect(fields.margin).toBe('0px 0px 24px');
    expect(left(q('.fields'))).toBe(0);
    expect(getComputedStyle(q('.sizeMessage')).margin).toBe('8px 0px');
    expect(getComputedStyle(q('.forceCreateCheckbox')).margin).toBe('0px 0px 12px');
  });

  it('speaks the pane and group headings in the section voice, left on their pane', async () => {
    await mount(1200);
    for (const sel of ['#avail-disks-title', '#data-title', '#cache-title']) {
      const h4 = getComputedStyle(q(sel));
      expect(h4.fontSize).withContext(sel).toBe('15px');
      expect(h4.fontWeight).withContext(sel).toBe('400');
      expect(h4.lineHeight).withContext(sel).toBe('22.5px');
      expect(h4.color).withContext(sel).toBe('rgb(220, 227, 230)');
      expect(h4.textAlign).withContext(sel).toBe('start');
      expect(h4.marginTop).withContext(sel).toBe('0px');
    }
    expect(getComputedStyle(q('#avail-disks-title')).marginBottom).toBe('12px');
    expect(getComputedStyle(q('#avail-disks-title')).marginLeft).toBe('0px'); // the disks pane sits on the page edge like the fields
    expect(left(q('#avail-disks-title'))).toBe(0);
    // the page's `#create-pool-card .vdev-h4 { margin: 0 }` keeps the group headings' bottom margin at 0 (only #avail-disks-title gets 12px)
    expect(getComputedStyle(q('#data-title')).marginBottom).toBe('0px');
    expect(getComputedStyle(q('#cache-title')).marginBottom).toBe('0px');
    // Karma's 800px window fires the 1399px step: the free-standing group h4 sits on the .data-div's 72px offset
    // (the vdev table's text column: 32px arrow column + 16px table margin + 8px cell padding = 56, +16 under 1399px)
    expect(getComputedStyle(q('.data-div')).marginLeft).toBe('72px');
    expect(getComputedStyle(q('#cache-title')).marginLeft).toBe('72px');
    expect(left(q('#cache-title'))).toBe(left(q('#data-title')));
    expect(getComputedStyle(q('.duplicate-button')).width).not.toBe('60px');
  });

  it('draws the layout buttons on the outline tier in an 8px bar and the vdev arrows/X as 32px ghost icon buttons with a 20px glyph', async () => {
    await mount(1200);
    const bar = getComputedStyle(q('.button-bar'));
    expect(bar.display).toBe('flex');
    expect(bar.gap).toBe('8px');
    expect(bar.alignItems).toBe('center');
    for (const sel of ['#pool-manager__reset-layout-button', '#pool-manager__suggest-layout-button', '#pool-manager__create-data-vdevs-button', '#pool-manager__cancel-button']) {
      const b = q(sel);
      expect(b.classList).withContext(sel).toContain('bg-transparent');
      expect(b.getAttribute('type')).withContext(sel).toBe('button');
      expect(Math.round(b.getBoundingClientRect().height)).withContext(sel).toBe(32);
      expect(getComputedStyle(b).borderTopColor).withContext(sel).toBe('rgb(42, 53, 61)');
      expect(getComputedStyle(b).marginRight).withContext(sel).toBe('0px'); // the page's 5px button margin is gone
    }
    expect(getComputedStyle(q('#pool-manager__reset-layout-button')).opacity).toBe('0.4'); // the tier's disabled dimming, not the page's .38
    for (const sel of ['#vdev__add-button', '#vdev__remove-button', '#vdev__close-button']) {
      const b = q(sel);
      expect(b.getAttribute('type')).withContext(sel).toBe('button');
      expect(box(b)).withContext(sel).toEqual([32, 32]);
      expect(getComputedStyle(b).borderTopColor).withContext(sel).toBe('rgba(0, 0, 0, 0)'); // ghost: no hairline
      expect(box(b.querySelector('.mat-icon'))).withContext(sel).toEqual([20, 20]);
    }
    expect(q('#vdev__close-button').getAttribute('aria-label')).toBe('Remove');
    expect(host.querySelector('.vdev-action-btn, .mat-mdc-unelevated-button, .mat-mdc-button, .btn')).toBeNull();
  });

  it('closes with the hairline action row: Create on the default tier beside an outline Cancel', async () => {
    await mount(1200);
    const row = getComputedStyle(q('#pool-manager__button-group'));
    expect(row.display).toBe('flex');
    expect(row.flexWrap).toBe('wrap');
    expect(row.gap).toBe('8px');
    expect(row.alignItems).toBe('center');
    expect(row.borderTopWidth).toBe('1px');
    expect(row.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(row.paddingTop).toBe('20px');
    expect(row.paddingLeft).toBe('0px');
    expect(row.marginTop).toBe('12px');
    expect(row.marginLeft).toBe('0px');
    expect(row.minHeight).toBe('64px');
    const buttons = Array.from(host.querySelectorAll('#pool-manager__button-group button'));
    expect(buttons.map((b) => b.id)).toEqual(['pool-manager__create-button', 'pool-manager__cancel-button']);
    const create = q('#pool-manager__create-button');
    expect(create.classList).toContain('bg-primary');
    expect(create.getAttribute('name')).toBe('create-button');
    expect(Math.round(create.getBoundingClientRect().height)).toBe(32);
    expect(left(create)).toBe(0);
    expect(Math.round(q('#pool-manager__cancel-button').getBoundingClientRect().left - create.getBoundingClientRect().right)).toBe(8);
  });
});
