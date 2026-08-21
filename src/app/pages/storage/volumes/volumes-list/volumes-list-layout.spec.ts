import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

@Component({
  standalone: false,
  selector: 'volumes-list-layout-test-host',
  template: '<div class="pool-action-row-layout"></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./volumes-list-layout.scss'],
})
class VolumesListLayoutTestHostComponent {}

describe('Pools list layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [VolumesListLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves the pool action row alignment contract', () => {
    const fixture = TestBed.createComponent(VolumesListLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.pool-action-row-layout'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.justifyContent).toBe('flex-end');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
  });
});

// the internal development record: the Pools host (volumes-list.component.html) is section.fc-page on the page
// shell: the .fc-page-header row carries the h1, the hlm-spinner loading glyph and the Add on the
// outline tier; the empty state is the shell notice. The stand-in mirrors that markup against
// volumes-list.component.css through styleUrls (exactly as the page); freecore-ui.css and the spartan
// sheet are Karma global styles, so it only needs the `.ix-blue.fc-ui` root <body> carries.
@Component({
  standalone: true,
  imports: [HlmButtonImports, HlmSpinnerImports],
  template: `
    <section id="volumes-list.component_html" class="fc-page">
      <header class="fc-page-header">
        <h1 class="fc-page-title">Pools</h1>
        <hlm-spinner id="pools-spinner" />
        <div class="entity-add-actions-wrapper" style="display:inline-block; text-align:left;">
          <button hlmBtn variant="outline" type="button" id="add_action_button">Add</button>
        </div>
      </header>
      <p class="fc-page-notice" name="no_pools">No pools</p>
      <div class="fc-expansion-panel" id="panel-stand-in">a pool panel stand-in (the internal development record: the panel is flat on the canvas, no raised shadow)</div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./volumes-list.component.css'],
})
class PoolsShellStandIn {}

describe('Pools page shell (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [PoolsShellStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(PoolsShellStandIn);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = 'position:fixed; top:0; left:0; width:1200px; z-index:1';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);

  it('keeps the per-pool panel as a flat surface on the canvas, not a raised box', () => {
    expect(getComputedStyle(q('#panel-stand-in')).boxShadow).toBe('none');
  });

  it('speaks the one title voice on the header row', () => {
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(title.marginBottom).toBe('0px');
    const header = getComputedStyle(q('.fc-page-header'));
    expect(header.display).toBe('flex');
    expect(header.justifyContent).toBe('space-between');
    expect(header.marginBottom).toBe('24px');
    expect(host.querySelector('.mat-card, .mat-toolbar, mat-card, mat-spinner')).toBeNull();
  });

  it('keeps Add on the right edge with the 20px spinner glyph beside the title, not in the middle', () => {
    const section = q('[id="volumes-list.component_html"]'); // the page's dotted id, verbatim
    const add = q('#add_action_button');
    expect(Math.round(section.getBoundingClientRect().right - add.getBoundingClientRect().right)).toBe(0);
    const spinner = q('#pools-spinner');
    const s = getComputedStyle(spinner);
    expect(s.fontSize).toBe('20px');
    expect(s.color).toBe('rgb(151, 166, 174)');
    expect(parseFloat(s.marginRight)).toBeGreaterThan(100); // `margin-right: auto` resolves to the header's slack on a flex item
    expect(spinner.getAttribute('role')).toBe('status');
    // layout boxes, not client rects: the glyph spins (a transform) and would skew a rect
    const title = q('h1.fc-page-title');
    expect(spinner.offsetLeft - (title.offsetLeft + title.offsetWidth)).toBe(16); // the header gap
    expect(add.offsetLeft - (spinner.offsetLeft + spinner.offsetWidth)).toBeGreaterThan(16);
  });

  it('draws Add on the outline tier', () => {
    const add = q('#add_action_button');
    const s = getComputedStyle(add);
    expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(s.borderTopWidth).toBe('1px');
    expect(Math.round(add.getBoundingClientRect().height)).toBe(32);
    expect(add.classList).not.toContain('bg-primary');
  });

  it('shows the empty state as the shell notice on the page edge', () => {
    const notice = q('.fc-page-notice[name="no_pools"]');
    const s = getComputedStyle(notice);
    expect(s.borderTopWidth).toBe('1px');
    expect(s.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(s.fontSize).toBe('13px');
    expect(Math.round(notice.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0);
  });
});
