import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

// the internal development record: the advanced jail editor (jail-form.component.html) is a .fc-page--capped page
// on the engine's settings grid -- entity-form.component.scss through styleUrls, exactly as the page
// -- with the shared .fc-settings-form voice + action row from freecore-ui.css (a Karma global
// style, so the stand-in only needs the `.ix-blue.fc-ui` root <body> carries). The stand-in mirrors
// the page's markup: title, spinner, four-section shape (two here), a wide cell, a [hidden] cell,
// the Save/Cancel row and the error line.
@Component({
  standalone: true,
  imports: [HlmButtonImports, HlmSpinnerImports],
  template: `
    <div class="fc-page fc-page--capped">
      <h1 class="fc-page-title">Jail</h1>
      <div class="form-card fc-settings-form">
        @if (showSpinner) {
          <hlm-spinner id="entity-table-spinner" />
        }
        <form>
          <div class="fieldset-container fieldset-display-default">
            <section class="fc-settings-section basic" aria-labelledby="jail-section-0" id="section-basic">
              <h2 class="fieldset-label" id="jail-section-0">Basic Properties</h2>
              <div class="fc-settings-fields" id="fields-basic">
                <div class="entity-form-field-layout form-line" id="Basic Properties-0"><div id="form_field_uuid">uuid</div></div>
                <div class="entity-form-field-layout form-line" id="Basic Properties-1"><div id="form_field_release">release</div></div>
                <div class="entity-form-field-layout form-line fc-settings-wide" id="Basic Properties-2"><div id="form_field_ip4_addr">ip4</div></div>
                <div class="entity-form-field-layout form-line" [hidden]="httpsHidden" id="Basic Properties-3"><div id="form_field_https">https</div></div>
              </div>
            </section>
            <section class="fc-settings-section jail" aria-labelledby="jail-section-1" id="section-jail">
              <h2 class="fieldset-label" id="jail-section-1">Jail Properties</h2>
              <div class="fc-settings-fields">
                <div class="entity-form-field-layout form-line fc-settings-wide" id="Jail Properties-0"><div id="form_field_devfs_ruleset">devfs</div></div>
              </div>
            </section>
            <div class="buttons">
              <button hlmBtn id="save_button" type="submit" [disabled]="true">Save</button>
              <button hlmBtn variant="outline" id="goback_button" type="button">Cancel</button>
            </div>
          </div>
        </form>
        @if (error) {
          <div id="error_message" class="form-error-line" role="alert"><div [innerHTML]="error"></div></div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../common/entity/entity-form/entity-form.component.scss'],
})
class JailFormStandIn {
  showSpinner = true;
  httpsHidden = true;
  error = 'Rejected. <a href="#">Docs</a>';
}

describe('Jail form layout (the internal development record)', () => {
  let root: HTMLElement;
  let host: HTMLElement;
  let standIn: JailFormStandIn;
  let detect: () => void;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = {
    '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--red': '#E3625A', '--primary': '#4E93C4',
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [JailFormStandIn] }).compileComponents();
    const fixture = TestBed.createComponent(JailFormStandIn);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = 'position:fixed; top:0; left:0; width:1200px; z-index:1';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    standIn = fixture.componentInstance;
    detect = () => fixture.detectChanges();
  });

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const q = (sel: string): HTMLElement => host.querySelector<HTMLElement>(sel);
  const tokens = (value: string): string[] => value.trim().split(/\s+/);

  it('is a capped page under the one title voice', () => {
    const page = q('.fc-page.fc-page--capped');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(Math.round(page.getBoundingClientRect().left - root.getBoundingClientRect().left)).toBe(0);
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe('rgb(220, 227, 230)');
    expect(q('.fc-page-title').nextElementSibling.classList).toContain('fc-settings-form');
    expect(getComputedStyle(q('.form-card')).position).toBe('relative');
    expect(getComputedStyle(q('.fieldset-container')).display).toBe('block');
  });

  it('renders every fieldset as a settings section: 170px label column, 34px gap, 28px lead, the hairline', () => {
    for (const sel of ['#section-basic', '#section-jail']) {
      const s = getComputedStyle(q(sel));
      expect(s.display).withContext(sel).toBe('grid');
      const columns = tokens(s.gridTemplateColumns);
      expect(columns.length).withContext(sel).toBe(2);
      expect(columns[0]).withContext(sel).toBe('170px');
      expect(s.columnGap).withContext(sel).toBe('34px');
      expect(s.rowGap).withContext(sel).toBe('34px');
      expect(s.paddingTop).withContext(sel).toBe('28px');
      expect(s.paddingBottom).withContext(sel).toBe('16px');
      expect(s.borderTopWidth).withContext(sel).toBe('1px');
      expect(s.borderTopStyle).withContext(sel).toBe('solid');
    }
    // the [ngClass]="fieldSet.class" hook survives beside the section class
    expect(q('#section-basic').classList).toContain('basic');
    expect(q('#section-jail').classList).toContain('jail');
  });

  it('speaks the section title as the 15px/400 h2 the label column points at', () => {
    const h2 = q('#jail-section-0');
    expect(h2.tagName).toBe('H2');
    expect(h2.classList).toContain('fieldset-label');
    const s = getComputedStyle(h2);
    expect(s.fontSize).toBe('15px');
    expect(s.fontWeight).toBe('400');
    expect(s.color).toBe('rgb(220, 227, 230)');
    expect(s.marginTop).toBe('6px');
    expect(s.marginBottom).toBe('0px');
    expect(q('#section-basic').getAttribute('aria-labelledby')).toBe('jail-section-0');
    // the h2 sits in the label column, the fields in the second
    const fields = q('#fields-basic').getBoundingClientRect();
    expect(Math.round(fields.left - h2.getBoundingClientRect().left)).toBe(170 + 34);
  });

  it('lays the fields on the two-column grid, a wide cell spanning both, a hidden cell leaving no slot', () => {
    const fields = getComputedStyle(q('#fields-basic'));
    expect(fields.display).toBe('grid');
    expect(tokens(fields.gridTemplateColumns).length).toBe(2);
    expect(fields.columnGap).toBe('24px');
    expect(fields.rowGap).toBe('6px');
    const wide = q('[id="Basic Properties-2"]');
    expect(wide.classList).toContain('fc-settings-wide');
    expect(getComputedStyle(wide).gridColumnEnd).toBe('-1');
    expect(Math.round(wide.getBoundingClientRect().width)).toBe(Math.round(q('#fields-basic').getBoundingClientRect().width));
    const narrow = q('[id="Basic Properties-0"]');
    expect(getComputedStyle(narrow).gridColumnEnd).toBe('auto');
    expect(narrow.getBoundingClientRect().width).toBeLessThan(wide.getBoundingClientRect().width);
    // the runtime isHidden flip (jail-form.service.ts setDisabled) lands on the cell, not a bare field
    const hidden = q('[id="Basic Properties-3"]');
    expect(hidden.hasAttribute('hidden')).toBeTrue();
    expect(getComputedStyle(hidden).display).toBe('none');
    standIn.httpsHidden = false; detect();
    expect(hidden.hasAttribute('hidden')).toBeFalse();
    expect(getComputedStyle(hidden).display).not.toBe('none');
    // the ids the page keys on
    expect(q('#form_field_uuid')).toBeTruthy();
    expect(q('[id="Jail Properties-0"] #form_field_devfs_ruleset')).toBeTruthy();
  });

  it('closes with the shared action row: hairline, 20/12 lead, 64px, Save default tier, Cancel outline', () => {
    const row = q('.buttons');
    expect(row.tagName).toBe('DIV');
    const s = getComputedStyle(row);
    expect(s.display).toBe('flex');
    expect(s.flexWrap).toBe('wrap');
    expect(s.alignItems).toBe('center');
    expect(s.columnGap).toBe('8px');
    expect(s.borderTopWidth).toBe('1px');
    expect(s.borderTopStyle).toBe('solid');
    expect(s.paddingTop).toBe('20px');
    expect(s.paddingLeft).toBe('0px');
    expect(s.marginTop).toBe('12px');
    expect(s.minHeight).toBe('64px');
    const save = q('#save_button') as HTMLButtonElement;
    expect(save.getAttribute('type')).toBe('submit');
    expect(save.disabled).toBeTrue();
    expect(save.classList).toContain('bg-primary');
    expect(save.classList).toContain('h-8');
    expect(Math.round(save.getBoundingClientRect().height)).toBe(32);
    const cancel = q('#goback_button');
    expect(cancel.getAttribute('type')).toBe('button');
    expect(cancel.classList).toContain('border-border');
    expect(cancel.classList).not.toContain('bg-primary');
    expect(Math.round(cancel.getBoundingClientRect().height)).toBe(32);
    expect(Math.round(cancel.getBoundingClientRect().left - save.getBoundingClientRect().right)).toBe(8);
    expect(row.querySelector('.btn, .mat-mdc-button, mat-card-actions')).toBeNull();
    // the panel steppers are gone: no Previous / Next anywhere
    expect(host.textContent).not.toContain('Previous');
    expect(host.textContent).not.toContain('Next');
  });

  it('overlays hlm-spinner on the card and prints the error as the form error line', () => {
    const spinner = q('hlm-spinner#entity-table-spinner');
    expect(spinner.getAttribute('data-slot')).toBe('spinner');
    expect(spinner.parentElement.classList).toContain('form-card');
    const s = getComputedStyle(spinner);
    expect(s.position).toBe('absolute');
    expect(s.fontSize).toBe('40px');
    expect(Math.round(spinner.getBoundingClientRect().width)).toBe(40);
    const card = q('.form-card').getBoundingClientRect();
    expect(Math.abs((spinner.getBoundingClientRect().left + 20) - (card.left + card.width / 2))).toBeLessThanOrEqual(1);
    standIn.showSpinner = false; detect();
    expect(q('hlm-spinner')).toBeNull();
    const error = q('#error_message');
    expect(error.tagName).toBe('DIV');
    expect(error.classList).toContain('form-error-line');
    expect(error.getAttribute('role')).toBe('alert');
    expect(getComputedStyle(error).fontSize).toBe('12px');
    expect(getComputedStyle(error).color).toBe('rgb(227, 98, 90)');
    expect(getComputedStyle(error.querySelector('a')).textDecorationLine).toBe('underline');
    expect(error.parentElement.classList).toContain('form-card');
  });
});
