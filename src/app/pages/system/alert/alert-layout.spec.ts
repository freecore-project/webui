import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: Alert Settings (alert.component.html) is the settings form on the engine's
// section grid -- entity-form.component.scss through styleUrls, exactly as the page -- with the
// shared .fc-settings-form voice + action row and the page's own rule/options grids from
// freecore-ui.css (a Karma global style, so the stand-in only needs the `.ix-blue.fc-ui` root
// <body> carries). The stand-in mirrors the page's markup: the capped page, the h1, one category
// section whose field column is the rule list, and the single-Save row.
@Component({
  standalone: true,
  imports: [HlmButtonImports],
  template: `
    <section id="alert-settings-page" class="fc-page fc-page--capped" aria-labelledby="alert-settings-title">
      <h1 id="alert-settings-title" class="fc-page-title">Alert Settings</h1>
      <form class="fc-settings-form">
        <div class="fieldset-container fieldset-display-default">
          <section class="fc-settings-section fc-alert-category" aria-labelledby="alert-category-0" id="category-0">
            <h2 class="fieldset-label" id="alert-category-0">Applications</h2>
            <div class="fc-alert-rules">
              <div class="fc-alert-rule" role="group" id="rule-0">
                <h3>Applications update available</h3>
                <div class="fc-alert-options">
                  <div class="fc-alert-control"><div id="form_field_level">level</div></div>
                  <div class="fc-alert-control"><div id="form_field_policy">policy</div></div>
                </div>
              </div>
              <div class="fc-alert-rule" role="group" id="rule-1">
                <h3>Applications catalog stale</h3>
                <div class="fc-alert-options">
                  <div class="fc-alert-control"><div id="form_field_level2">level</div></div>
                  <div class="fc-alert-control"><div id="form_field_policy2">policy</div></div>
                </div>
              </div>
            </div>
          </section>
          <section class="fc-settings-section fc-alert-category" aria-labelledby="alert-category-1" id="category-1">
            <h2 class="fieldset-label" id="alert-category-1">Certificates</h2>
            <div class="fc-alert-rules"><div class="fc-alert-rule" role="group"><h3>Certificate expiring</h3></div></div>
          </section>
          <div class="buttons">
            <button hlmBtn id="save_button" type="submit">Save</button>
          </div>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../common/entity/entity-form/entity-form.component.scss'],
})
class AlertSettingsStandIn {}

describe('Alert Settings layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4',
  };

  async function mount(width: number): Promise<void> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [AlertSettingsStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(AlertSettingsStandIn);
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
  const tokens = (value: string): string[] => value.trim().split(/\s+/);
  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);

  it('is the capped page under the one title voice, the form on the page edge', async () => {
    await mount(1200);
    const page = q('#alert-settings-page');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    const form = getComputedStyle(q('form.fc-settings-form'));
    expect(form.color).toBe('rgb(151, 166, 174)'); // the fg2 12px body every form has
    expect(form.fontSize).toBe('12px');
    expect(left(q('form'))).toBe(0);
    expect(getComputedStyle(q('.fieldset-container')).display).toBe('block');
  });

  it('renders each category as a settings section: 170px label column, 34px gap, the hairline, the rules in the field column', async () => {
    await mount(1200);
    for (const sel of ['#category-0', '#category-1']) {
      const s = getComputedStyle(q(sel));
      expect(s.display).withContext(sel).toBe('grid');
      const cols = tokens(s.gridTemplateColumns);
      expect(cols.length).withContext(sel).toBe(2);
      expect(cols[0]).withContext(sel).toBe('170px');
      expect(s.columnGap).withContext(sel).toBe('34px');
      expect(s.paddingTop).withContext(sel).toBe('28px');
      expect(s.paddingBottom).withContext(sel).toBe('16px');
      expect(s.borderTopWidth).withContext(sel).toBe('1px');
      expect(s.borderTopColor).withContext(sel).toBe('rgb(42, 53, 61)');
    }
    const h2 = getComputedStyle(q('#alert-category-0'));
    expect(h2.fontSize).toBe('15px');
    expect(h2.fontWeight).toBe('400');
    expect(h2.color).toBe('rgb(220, 227, 230)');
    expect(h2.marginTop).toBe('6px');
    expect(h2.marginBottom).toBe('0px');
    // the rule list sits in the field column, 170 + 34 right of the label
    expect(Math.round(q('.fc-alert-rules').getBoundingClientRect().left - q('#alert-category-0').getBoundingClientRect().left)).toBe(204);
    expect(getComputedStyle(q('.fc-alert-rules')).minWidth).toBe('0px');
    // each rule: the name beside its two options
    const rule = getComputedStyle(q('#rule-0'));
    expect(rule.display).toBe('grid');
    expect(tokens(rule.gridTemplateColumns).length).toBe(2);
    const options = getComputedStyle(q('#rule-0 .fc-alert-options'));
    expect(options.display).toBe('grid');
    expect(tokens(options.gridTemplateColumns).length).toBe(2);
    expect(Math.round(q('#form_field_level').getBoundingClientRect().top)).toBe(Math.round(q('#form_field_policy').getBoundingClientRect().top));
  });

  it('collapses the label column at the engine step and the rule at the page step, as containers', async () => {
    await mount(760); // the form is the nearest inline-size container (760 < 800: one column)
    expect(tokens(getComputedStyle(q('#category-0')).gridTemplateColumns).length).toBe(1);
    expect(tokens(getComputedStyle(q('#rule-0')).gridTemplateColumns).length).toBe(2); // the 620 rule step has not fired
    root.remove();
    TestBed.resetTestingModule();
    await mount(600);
    expect(tokens(getComputedStyle(q('#rule-0')).gridTemplateColumns).length).toBe(1);
    expect(getComputedStyle(q('#rule-0')).marginBottom).toBe('20px');
  });

  it('closes with the shared hairline row and exactly one Save on the default tier', async () => {
    await mount(1200);
    const row = getComputedStyle(q('.buttons'));
    expect(row.display).toBe('flex');
    expect(row.borderTopWidth).toBe('1px');
    expect(row.paddingTop).toBe('20px');
    expect(row.paddingLeft).toBe('0px');
    expect(row.marginTop).toBe('12px');
    expect(row.minHeight).toBe('64px');
    const buttons = Array.from(host.querySelectorAll('.buttons button'));
    expect(buttons.length).toBe(1);
    const save = q('#save_button');
    expect(save.classList).toContain('bg-primary');
    expect(Math.round(save.getBoundingClientRect().height)).toBe(32);
    expect(left(save)).toBe(0);
    expect(host.querySelector('mat-card, mat-card-actions')).toBeNull();
  });
});
