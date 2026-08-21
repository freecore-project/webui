import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: the entity-form action row on spartan, measured IN POSITION -- under
// `.fc-ui.ix-blue entity-form .buttons` with the production theme and shell sheets in the
// cascade -- so the rules the swap removed (the `.buttons > button` hairline and hover in
// freecore-ui.css, the createpassphrase/addkey `#cust_button_Cancel` accent paint in the theme)
// are proven gone and the four #353 tiers arrive untouched from the helm button file.
// Ladder written on <html> exactly as the #353 spec does.
@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue">
      <entity-form>
        <div class="mat-content">
          <div class="buttons" style="display:flex; gap:8px; align-items:center;">
            <button hlmBtn id="save_button" type="submit">Save</button>
            <button hlmBtn variant="outline" id="goback_button" type="button">Cancel</button>
            <span><button hlmBtn variant="ghost" id="cust_button_Advanced Options" type="button">Advanced Options</button></span>
            <button hlmBtn variant="destructive" id="delete_button" type="button">Delete</button>
            <button hlmBtn id="off" type="submit" [disabled]="true">Save</button>
            <button hlmBtn id="manual" type="button">Manual</button>
          </div>
        </div>
      </entity-form>
      <app-createpassphrase-form>
        <entity-form>
          <div class="buttons" style="display:flex; gap:8px;">
            <span><button hlmBtn variant="ghost" id="cust_button_Cancel" type="button">Cancel</button></span>
          </div>
        </entity-form>
      </app-createpassphrase-form>
    </div>
  `,
})
class ActionsHostComponent {}

describe('15.2 entity-form action row on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<ActionsHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--primary': '#4E93C4', '--red': '#E3625A' };
  const q = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const bg0 = 'rgb(11, 15, 19)';
  const line = 'rgb(42, 53, 61)';
  const clear = 'rgba(0, 0, 0, 0)';

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({
      declarations: [ActionsHostComponent],
      imports: [HlmButtonImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(ActionsHostComponent);
    // the app's body carries the Plex face; the helm base layer makes buttons inherit it (#391)
    fixture.nativeElement.style.fontFamily = '"IBM Plex Sans", sans-serif';
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
  });

  it('keeps every tier at 32px / 6px / 13px / 500 / 14px padding, sentence case, no elevation', () => {
    ['save_button', 'goback_button', 'cust_button_Advanced Options', 'delete_button'].forEach((id) => {
      const el = root.querySelector<HTMLElement>(`[id="${id}"]`);
      const styles = getComputedStyle(el);
      expect(el.getAttribute('data-slot')).withContext(id).toBe('button');
      expect(el.getBoundingClientRect().height).withContext(id).toBe(32);
      expect(styles.borderTopLeftRadius).withContext(id).toBe('6px');
      expect(styles.fontSize).withContext(id).toBe('13px');
      expect(styles.fontWeight).withContext(id).toBe('500');
      expect(styles.paddingLeft).withContext(id).toBe('14px');
      expect(styles.textTransform).withContext(id).toBe('none');
      expect(styles.boxShadow).withContext(id).toBe('none');
      expect(styles.fontFamily).withContext(id).toContain('IBM Plex Sans');
    });
  });

  it('paints Save as the one primary with no hairline -- the removed .buttons > button rule stays gone', () => {
    const save = getComputedStyle(q('#save_button'));
    expect(save.backgroundColor).toBe(fg1);
    expect(save.color).toBe(bg0);
    expect(save.borderTopWidth).toBe('1px');
    expect(save.borderTopColor).toBe(clear);
  });

  it('outlines Cancel with the --line hairline and keeps custom actions as text without a border', () => {
    const cancel = getComputedStyle(q('#goback_button'));
    expect(cancel.backgroundColor).toBe(clear);
    expect(cancel.color).toBe(fg1);
    expect(cancel.borderTopColor).toBe(line);
    const custom = getComputedStyle(root.querySelector('[id="cust_button_Advanced Options"]'));
    expect(custom.backgroundColor).toBe(clear);
    expect(custom.color).toBe(fg2);
    expect(custom.borderTopColor).toBe(clear);
  });

  it('keeps Delete red as an outline at 45%', () => {
    const danger = getComputedStyle(q('#delete_button'));
    expect(danger.color).toBe('rgb(227, 98, 90)');
    expect(danger.backgroundColor).toBe(clear);
    expect(danger.borderTopColor).not.toBe(clear);
    expect(danger.borderTopColor).not.toBe(line);
  });

  it('dims a disabled button to .4 through the binding and through a direct DOM write', () => {
    const off = q('#off') as HTMLButtonElement;
    expect(off.disabled).toBeTrue();
    expect(getComputedStyle(off).opacity).toBe('0.4');
    expect(getComputedStyle(off).backgroundColor).toBe(fg1);
    const manual = q('#manual') as HTMLButtonElement;
    expect(getComputedStyle(manual).opacity).toBe('1');
    manual.disabled = true;
    expect(getComputedStyle(manual).opacity).toBe('0.4');
  });

  it('renders the createpassphrase / addkey Cancel as a ghost -- the theme accent paint is deleted', () => {
    const cancel = getComputedStyle(root.querySelector('app-createpassphrase-form [id="cust_button_Cancel"]'));
    expect(cancel.backgroundColor).toBe(clear);
    expect(cancel.color).toBe(fg2);
  });
});
