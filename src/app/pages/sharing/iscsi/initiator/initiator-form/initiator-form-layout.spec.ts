import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the initiator form on the settings-form law -- a .fc-page--capped page, the
// form as the .fc-settings-form container, one 'General' section on the engine grid (the emulated
// entity-form.component.scss, the same sheet the page lists in styleUrls), the shared row / voice
// rules and the page's own list / glyph rules in freecore-ui.css (a Karma global style, so the
// stand-in only needs the `.ix-blue.fc-ui` root <body> carries). The stand-in mirrors
// initiator-form.component.html with the dynamic fields as plain cells; the real component is
// rendered through SharingModule by sharing-settings.spec.ts.
@Component({
  standalone: true,
  selector: 'iscsi-initiator-form-layout-test-host',
  imports: [HlmButtonImports, MatIconModule],
  template: `
    <div class="fc-page fc-page--capped fc-initiator-form">
      <h1 class="fc-initiator-title fc-page-title">Initiator Group</h1>
      <form class="fc-settings-form">
        <div class="fieldset-container fieldset-display-default">
          <section class="fc-settings-section" aria-labelledby="initiator-section-general">
            <h2 class="fieldset-label" id="initiator-section-general">General</h2>
            <div class="fc-settings-fields">
              <div class="entity-form-field-layout form-line fc-settings-wide" id="general-0"><div id="dynamicField_allow_all_initiators">Allow All Initiators</div></div>
              <div class="connected-initiators-container entity-form-field-layout has-tooltip" [class.disabled]="disabled" id="general-1">
                <label>Connected Initiators</label>
                <div class="connected-initiators-list" role="group" aria-label="Connected Initiators"></div>
                <div class="initiator-refresh-layout">
                  <button hlmBtn variant="ghost" type="button" id="refresh" ix-auto="button__refresh"><mat-icon>refresh</mat-icon> Refresh</button>
                </div>
              </div>
              <div class="entity-form-field-layout" id="general-2">
                <div class="dynamic-list-container dynamic-list-row-layout">
                  <div class="move-to-action"><button hlmBtn variant="ghost" size="icon" class="move-to-btn" type="button" id="move-to" aria-label="Add selected items to Allowed Initiators (IQN)"><mat-icon>arrow_forward</mat-icon></button></div>
                  <div class="input-add"><button hlmBtn variant="ghost" size="icon" type="button" id="add" aria-label="Add Allowed Initiators (IQN)"><mat-icon>add</mat-icon></button></div>
                </div>
              </div>
              <div class="entity-form-field-layout form-line fc-settings-wide" id="general-3"><div id="dynamicField_comment">Description</div></div>
              <div class="entity-form-field-layout form-line" id="general-hidden" hidden></div>
            </div>
          </section>
          <div class="buttons">
            <button hlmBtn id="save_button" type="submit" ix-auto="button__save">Save</button>
            <button hlmBtn variant="outline" id="goback_button" type="button" ix-auto="button__cancel">Cancel</button>
          </div>
        </div>
        <div id="error_message" class="form-error-line" role="alert"><div>Initiator group already exists.</div></div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: [
    './initiator-form.component.css',
    '../../../../common/entity/entity-form/entity-form.component.scss',
  ],
})
class IscsiInitiatorFormLayoutTestHostComponent {
  disabled = false;
}

describe('iSCSI initiator form layout (the internal development record)', () => {
  let fixture: ComponentFixture<IscsiInitiatorFormLayoutTestHostComponent>;
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--red': '#E3625A' };
  const FG1 = 'rgb(220, 227, 230)';
  const FG2 = 'rgb(151, 166, 174)';
  const LINE = 'rgb(42, 53, 61)';

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [IscsiInitiatorFormLayoutTestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(IscsiInitiatorFormLayoutTestHostComponent);
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
  const rect = (sel: string): DOMRect => q(sel).getBoundingClientRect();

  it('is a capped page with the title inside the wrapper and the fg2 body the card gave it', () => {
    const page = q('.fc-initiator-form');
    expect(page.classList.contains('fc-page')).toBeTrue();
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(getComputedStyle(page).color).toBe(FG2);
    expect(q('.fc-initiator-form > h1.fc-page-title')).not.toBeNull();
    expect(getComputedStyle(q('h1.fc-page-title')).fontSize).toBe('27px');
    expect(getComputedStyle(q('h1.fc-page-title')).color).toBe(FG1);
    expect(q('form').classList.contains('fc-settings-form')).toBeTrue();
    expect(q('form mat-card, form .mat-mdc-card, form .form-wrap')).toBeNull();
  });

  it('lays the General section on the engine grid: 170px column, 34px gap, 28px above, one hairline', () => {
    const section = getComputedStyle(q('.fc-settings-section'));
    expect(section.display).toBe('grid');
    expect(section.gridTemplateColumns.startsWith('170px ')).withContext(section.gridTemplateColumns).toBeTrue();
    expect(section.columnGap).toBe('34px');
    expect(section.rowGap).toBe('34px');
    expect(section.paddingTop).toBe('28px');
    expect(section.borderTopWidth).toBe('1px');
    expect(section.borderTopStyle).toBe('solid');
    expect(section.borderTopColor).toBe(LINE);
    expect(q('.fc-settings-section').getAttribute('aria-labelledby')).toBe('initiator-section-general');
  });

  it('speaks the section heading in the h2 voice: 15px / 400 / fg1', () => {
    const h2 = q('h2.fieldset-label');
    expect(h2.id).toBe('initiator-section-general');
    const s = getComputedStyle(h2);
    expect(s.fontSize).toBe('15px');
    expect(s.fontWeight).toBe('400');
    expect(s.color).toBe(FG1);
  });

  it('puts the checkbox and the comment on a wide cell, the list and the movers side by side, a hidden cell out of the grid', () => {
    const fields = getComputedStyle(q('.fc-settings-fields'));
    expect(fields.display).toBe('grid');
    expect(fields.columnGap).toBe('24px');
    for (const sel of ['#general-0', '#general-3']) {
      expect(getComputedStyle(q(sel)).gridColumnEnd).withContext(sel).toBe('-1');
    }
    for (const sel of ['#general-1', '#general-2']) {
      expect(getComputedStyle(q(sel)).gridColumnEnd).withContext(sel).toBe('auto');
    }
    expect(Math.round(rect('#general-1').top)).toBe(Math.round(rect('#general-2').top));
    expect(Math.round(rect('#general-2').left - rect('#general-1').right)).toBe(24);
    expect(Math.round(rect('#general-1').width)).toBe(Math.round(rect('#general-2').width));
    expect(rect('#general-3').top).toBeGreaterThanOrEqual(rect('#general-1').bottom);
    expect(getComputedStyle(q('#general-hidden')).display).toBe('none');
    expect(getComputedStyle(q('.connected-initiators-container')).marginRight).toBe('0px');
  });

  it('draws the connected initiators list as the 320px hairline box that scrolls, dimmed with its container', () => {
    const list = getComputedStyle(q('.connected-initiators-list'));
    // the 800px media step (freecore-ui.css) keys on the viewport, and Karma's Chrome window is 800 wide
    expect(list.height).toBe(window.matchMedia('(max-width: 800px)').matches ? '200px' : '320px');
    // the internal development record: content-box with 8px above and below the rows, as the mat-selection-list drew it --
    // the outer box stays 338px (218px narrow), so nothing below the list moves.
    expect(q('.connected-initiators-list').getBoundingClientRect().height).toBe(window.matchMedia('(max-width: 800px)').matches ? 218 : 338);
    expect(list.overflowY).toBe('auto');
    expect(list.borderTopWidth).toBe('1px');
    expect(list.borderTopColor).toBe(LINE);
    expect(list.borderTopLeftRadius).toBe('6px');
    expect(list.marginTop).toBe('16px');
    expect(list.marginBottom).toBe('12px');
    expect(getComputedStyle(q('.connected-initiators-container')).opacity).toBe('1');
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(q('.connected-initiators-container').classList.contains('disabled')).toBeTrue();
    expect(getComputedStyle(q('.connected-initiators-container')).opacity).toBe('0.38');
  });

  it('keeps the refresh action on the right of the list as a ghost with a 16px glyph', () => {
    const row = getComputedStyle(q('.initiator-refresh-layout'));
    expect(row.display).toBe('flex');
    expect(row.boxSizing).toBe('border-box');
    expect(row.flexDirection).toBe('row');
    expect(row.flexWrap).toBe('nowrap');
    expect(row.justifyContent).toBe('flex-end');
    expect(row.alignItems).toBe('center');
    expect(row.alignContent).toBe('center');
    const refresh = q('#refresh');
    expect(refresh.classList.contains('text-muted-foreground')).toBeTrue();
    expect(refresh.getAttribute('data-slot')).toBe('button');
    expect(getComputedStyle(refresh).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(refresh).height).toBe('32px');
    expect(Math.round(rect('.initiator-refresh-layout').right - rect('#refresh').right)).toBe(0);
    const glyph = getComputedStyle(q('#refresh .mat-icon'));
    expect(glyph.width).toBe('16px');
    expect(glyph.height).toBe('16px');
    expect(glyph.fontSize).toBe('16px');
  });

  it('sizes the mover icon actions as 32px ghost icons with a 20px glyph', () => {
    for (const sel of ['#move-to', '#add']) {
      const button = q(sel);
      expect(button.classList.contains('size-8')).withContext(sel).toBeTrue();
      expect(button.classList.contains('text-muted-foreground')).withContext(sel).toBeTrue();
      expect(getComputedStyle(button).height).withContext(sel).toBe('32px');
      expect(getComputedStyle(button).backgroundColor).withContext(sel).toBe('rgba(0, 0, 0, 0)');
      const glyph = getComputedStyle(q(`${sel} .mat-icon`));
      expect(glyph.width).withContext(sel).toBe('20px');
      expect(glyph.height).withContext(sel).toBe('20px');
      expect(glyph.fontSize).withContext(sel).toBe('20px');
    }
    expect(q('#move-to').classList.contains('move-to-btn')).toBeTrue();
  });

  it('puts Save and Cancel on the shared hairline row in the default and outline tiers', () => {
    const row = getComputedStyle(q('.buttons'));
    expect(row.display).toBe('flex');
    expect(row.flexWrap).toBe('wrap');
    expect(row.alignItems).toBe('center');
    expect(row.columnGap).toBe('8px');
    expect(row.borderTopWidth).toBe('1px');
    expect(row.borderTopColor).toBe(LINE);
    expect(row.paddingTop).toBe('20px');
    expect(row.paddingLeft).toBe('0px');
    expect(row.marginTop).toBe('12px');
    expect(row.minHeight).toBe('64px');
    const save = q('#save_button');
    expect(save.getAttribute('type')).toBe('submit');
    expect(save.classList.contains('bg-primary')).toBeTrue();
    expect(save.classList.contains('text-primary-foreground')).toBeTrue();
    expect(getComputedStyle(save).height).toBe('32px');
    expect(getComputedStyle(save).backgroundColor).toBe(FG1);
    expect(getComputedStyle(save).color).toBe('rgb(11, 15, 19)');
    const cancel = q('#goback_button');
    expect(cancel.getAttribute('type')).toBe('button');
    expect(cancel.classList.contains('border-border')).toBeTrue();
    expect(cancel.classList.contains('bg-transparent')).toBeTrue();
    expect(getComputedStyle(cancel).borderTopWidth).toBe('1px');
    expect(getComputedStyle(cancel).borderTopColor).toBe(LINE);
    expect(getComputedStyle(cancel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(Math.round(rect('#save_button').left - rect('.buttons').left)).toBe(0);
    expect(Math.round(rect('#goback_button').left - rect('#save_button').right)).toBe(8);
    for (const sel of ['#save_button', '#goback_button']) {
      for (const dead of ['btn', 'btn-block', 'btn-warning', 'mat-mdc-button']) {
        expect(q(sel).classList.contains(dead)).withContext(`${sel} ${dead}`).toBeFalse();
      }
    }
  });

  it('renders the form error as the 12/16 error line in --red', () => {
    const error = getComputedStyle(q('#error_message'));
    expect(q('#error_message').getAttribute('role')).toBe('alert');
    expect(error.fontSize).toBe('12px');
    expect(error.lineHeight).toBe('16px');
    expect(error.color).toBe('rgb(227, 98, 90)');
  });
});
