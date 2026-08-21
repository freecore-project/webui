import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the two VM device forms (device-add2, device-edit) render the same markup as
// entity-form's settings shape -- .fc-page.fc-page--capped > h1.fc-page-title > .form-card.fc-settings-form
// > form > .fieldset-container > one .fc-settings-section headed by the selected type, one cell per
// field, the hairline div.buttons on hlmBtn. The stand-in mirrors that DOM with the entity-form sheet
// in styleUrls (what both pages carry) under an `.ix-blue.fc-ui` root, so the emulated section grid
// and the shell's voice / row rules (freecore-ui.css, a Karma global style) are measured together.
// device-edit differs only in the Type cell being [hidden] (the `edit` flag).
@Component({
  standalone: true,
  imports: [HlmButtonImports],
  template: `
    <div class="fc-page fc-page--capped" id="page">
      <h1 class="fc-page-title">Device</h1>
      <div class="form-card fc-settings-form">
        <form>
          <div class="fieldset-container fieldset-display-default">
            <section class="fc-settings-section" aria-labelledby="device-section">
              <h2 class="fieldset-label" id="device-section">NIC</h2>
              <div class="fc-settings-fields">
                <div class="entity-form-field-layout form-line" id="cell-dtype" [hidden]="edit"><div id="form_field_dtype">select</div></div>
                <div class="entity-form-field-layout form-line" id="cell-type"><div id="form_field_type">select</div></div>
                <div class="entity-form-field-layout form-line" id="cell-mac"><div id="form_field_mac">input</div></div>
                <div class="entity-form-field-layout form-line fc-settings-wide" id="cell-path"><div id="form_field_path">explorer</div></div>
                <div class="entity-form-field-layout form-line fc-settings-wide" id="cell-boot" [hidden]="true"><div id="form_field_boot">checkbox</div></div>
                <div class="entity-form-field-layout form-line" id="cell-order"><div id="form_field_order">input</div></div>
              </div>
            </section>
            <div class="buttons">
              <button hlmBtn id="save_button" type="submit">Save</button>
              <button hlmBtn variant="outline" id="goback_button" type="button">Cancel</button>
              <span><button hlmBtn variant="ghost" id="cust_button_Generate MAC Address" type="button">Generate MAC Address</button></span>
            </div>
          </div>
        </form>
        <div id="error_message" class="form-error-line" role="alert"><div>Error text</div></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../common/entity/entity-form/entity-form.component.scss'],
})
class VmDeviceFormStandIn {
  edit = false;
}

describe('VM device forms layout (the internal development record)', () => {
  let fixture: ComponentFixture<VmDeviceFormStandIn>;
  let root: HTMLElement;
  let host: HTMLElement;

  // the ladder ThemeService writes inline on <html>: the shell layer reads bare var(--fg1) etc.
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4', '--red': '#E3625A' };
  const fg1 = 'rgb(220, 227, 230)';
  const line = 'rgb(42, 53, 61)';

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [VmDeviceFormStandIn] }).compileComponents();
    fixture = TestBed.createComponent(VmDeviceFormStandIn);
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
  const classes = (sel: string): string[] => Array.from(q(sel).classList);

  it('is a capped page with the one title voice and no card', () => {
    expect(getComputedStyle(q('#page')).maxWidth).toBe('1120px');
    const title = getComputedStyle(q('h1.fc-page-title'));
    expect(title.fontSize).toBe('27px');
    expect(title.fontWeight).toBe('400');
    expect(title.color).toBe(fg1);
    const card = getComputedStyle(q('.form-card'));
    expect(card.boxShadow).toBe('none');
    expect(card.borderTopWidth).toBe('0px');
    expect(getComputedStyle(q('.fieldset-container')).display).toBe('block');
  });

  it('lays the one section on the engine grid: 170px label column, 34px gap, 28px above, a 1px hairline', () => {
    const section = getComputedStyle(q('.fc-settings-section'));
    expect(section.display).toBe('grid');
    expect(section.gridTemplateColumns.startsWith('170px ')).withContext(section.gridTemplateColumns).toBeTrue();
    expect(section.columnGap).toBe('34px');
    expect(section.rowGap).toBe('34px');
    expect(section.paddingTop).toBe('28px');
    expect(section.borderTopWidth).toBe('1px');
    expect(section.borderTopColor).toBe(line);
    const fields = getComputedStyle(q('.fc-settings-fields'));
    expect(fields.display).toBe('grid');
    expect(fields.gridTemplateColumns.split(' ').length).toBe(2);
  });

  it('speaks the selected type as the h2 in the section voice: 15px / 400 / fg1', () => {
    const h2 = getComputedStyle(q('h2.fieldset-label'));
    expect(h2.fontSize).toBe('15px');
    expect(h2.fontWeight).toBe('400');
    expect(h2.color).toBe(fg1);
    expect(q('.fc-settings-section').getAttribute('aria-labelledby')).toBe('device-section');
  });

  it('spans a wide cell (explorer / checkbox) across both field columns and keeps input / select cells to one', () => {
    expect(getComputedStyle(q('#cell-path')).gridColumnEnd).toBe('-1');
    expect(getComputedStyle(q('#cell-mac')).gridColumnEnd).toBe('auto');
    expect(getComputedStyle(q('#cell-type')).gridColumnEnd).toBe('auto');
    // device-add: the Type select and the first type field share the first row
    expect(q('#cell-dtype').getBoundingClientRect().top).toBe(q('#cell-type').getBoundingClientRect().top);
    expect(q('#cell-mac').getBoundingClientRect().top).toBeGreaterThan(q('#cell-type').getBoundingClientRect().bottom - 1);
    expect(q('#cell-path').getBoundingClientRect().width).toBe(q('.fc-settings-fields').getBoundingClientRect().width);
  });

  it('drops a [hidden] cell from the grid so it leaves no empty slot', () => {
    expect(getComputedStyle(q('#cell-boot')).display).toBe('none');
    expect(q('#cell-dtype').hidden).toBeFalse();
    expect(getComputedStyle(q('#cell-dtype')).display).not.toBe('none');
    fixture.componentInstance.edit = true;
    fixture.detectChanges();
    expect(q('#cell-dtype').hidden).toBeTrue();
    expect(getComputedStyle(q('#cell-dtype')).display).toBe('none');
    // device-edit: the first type field takes the slot the Type select left, its neighbour beside it
    expect(Math.round(q('#cell-type').getBoundingClientRect().left)).toBe(Math.round(q('.fc-settings-fields').getBoundingClientRect().left));
    expect(q('#cell-type').getBoundingClientRect().top).toBe(q('#cell-mac').getBoundingClientRect().top);
  });

  it('draws the action row as the shared hairline row: 1px above, 20px in, 12px up, 64px tall', () => {
    const row = getComputedStyle(q('.buttons'));
    expect(row.display).toBe('flex');
    expect(row.flexWrap).toBe('wrap');
    expect(row.borderTopWidth).toBe('1px');
    expect(row.borderTopColor).toBe(line);
    expect(row.paddingTop).toBe('20px');
    expect(row.paddingLeft).toBe('0px');
    expect(row.marginTop).toBe('12px');
    expect(row.minHeight).toBe('64px');
    expect(row.columnGap).toBe('8px');
  });

  it('puts Save on the default tier, Cancel on outline and Generate MAC Address on ghost, all 32px tall', () => {
    for (const id of ['save_button', 'goback_button', 'cust_button_Generate MAC Address']) {
      const el = host.querySelector<HTMLElement>(`[id="${id}"]`);
      expect(el.getAttribute('data-slot')).withContext(id).toBe('button');
      expect(el.getBoundingClientRect().height).withContext(id).toBe(32);
      expect(Array.from(el.classList)).withContext(id).toContain('h-8');
    }
    expect(classes('#save_button')).toContain('bg-primary');
    expect(classes('#save_button')).toContain('text-primary-foreground');
    expect(classes('#goback_button')).toContain('border-border');
    expect(classes('#goback_button')).toContain('bg-transparent');
    const ghost = Array.from(host.querySelector('[id="cust_button_Generate MAC Address"]').classList);
    expect(ghost).toContain('text-muted-foreground');
    expect(ghost).not.toContain('bg-primary');
    expect(q('#save_button').getAttribute('type')).toBe('submit');
    expect(q('#goback_button').getAttribute('type')).toBe('button');
  });

  it('keeps the error line as the 12/16 form-error-line under the form', () => {
    const error = getComputedStyle(q('#error_message'));
    expect(error.fontSize).toBe('12px');
    expect(error.lineHeight).toBe('16px');
    expect(error.marginTop).toBe('4px');
    expect(q('#error_message').getAttribute('role')).toBe('alert');
    expect(q('#error_message').getBoundingClientRect().top).toBeGreaterThan(q('.buttons').getBoundingClientRect().bottom - 1);
  });
});
