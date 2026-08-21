import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// the internal development record: MATERIAL buttons in three tiers under the 15.2 shell (the pages still on
// mat-button; entity-form's own row is on hlmBtn since the internal development record, see
// entity-form-actions-15.2.spec.ts) -- one
// primary (fg1 ground, bg0 text), a hairline secondary for `accent`, text-only
// tertiaries for plain and `mat-basic`, red kept for `warn`. Measured with the
// theme's uppercase, filled, !important rules in the cascade (host is ix-blue).
@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue" style="display:flex; gap:8px; align-items:center;">
      <button id="primary" mat-button color="primary">Submit</button>
      <button id="filled" mat-flat-button color="primary">Add</button>
      <button id="secondary" mat-button color="accent">Cancel</button>
      <button id="tertiary" mat-button class="mat-basic">Advanced options</button>
      <button id="plain" mat-button>Show logs</button>
      <button id="danger" mat-button color="warn">Delete</button>
      <button id="off" mat-button color="primary" disabled>Submit</button>
      <button id="icon" mat-icon-button><mat-icon>more_vert</mat-icon></button>
      <button id="icon-off" mat-icon-button disabled><mat-icon>zoom_in</mat-icon></button>
    </div>
  `,
})
class ButtonsHostComponent {}

describe('15.2 buttons (the internal development record)', () => {
  let fixture: ComponentFixture<ButtonsHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--primary': '#4E93C4', '--red': '#E3625A' };
  const q = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const bg0 = 'rgb(11, 15, 19)';
  const clear = 'rgba(0, 0, 0, 0)';

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({
      declarations: [ButtonsHostComponent],
      imports: [MatButtonModule, MatIconModule, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ButtonsHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
  });

  it('sizes every text button at 32px, 6px radius, sentence case, no elevation', () => {
    ['primary', 'filled', 'secondary', 'tertiary', 'plain', 'danger'].forEach((id) => {
      const styles = getComputedStyle(q(`#${id}`));
      expect(q(`#${id}`).getBoundingClientRect().height).withContext(id).toBe(32);
      expect(styles.borderTopLeftRadius).withContext(id).toBe('6px');
      expect(styles.textTransform).withContext(id).toBe('none');
      expect(styles.fontSize).withContext(id).toBe('13px');
      expect(styles.boxShadow).withContext(id).toBe('none');
    });
  });

  it('paints the one primary in fg1 with bg0 text, for text and flat variants alike', () => {
    ['primary', 'filled'].forEach((id) => {
      expect(getComputedStyle(q(`#${id}`)).backgroundColor).withContext(id).toBe(fg1);
      expect(getComputedStyle(q(`#${id}`)).color).withContext(id).toBe(bg0);
    });
  });

  it('outlines the secondary with a hairline and keeps tertiaries as text', () => {
    const secondary = getComputedStyle(q('#secondary'));
    expect(secondary.backgroundColor).toBe(clear);
    expect(secondary.color).toBe(fg1);
    expect(secondary.borderTopColor).toBe('rgb(42, 53, 61)');
    ['tertiary', 'plain'].forEach((id) => {
      expect(getComputedStyle(q(`#${id}`)).backgroundColor).withContext(id).toBe(clear);
      expect(getComputedStyle(q(`#${id}`)).color).withContext(id).toBe(fg2);
      expect(getComputedStyle(q(`#${id}`)).borderTopColor).withContext(id).toBe(clear);
    });
  });

  it('keeps danger red as an outline, dims a disabled button, and quiets icon buttons', () => {
    const danger = getComputedStyle(q('#danger'));
    expect(danger.color).toBe('rgb(227, 98, 90)');
    expect(danger.backgroundColor).toBe(clear);
    expect(getComputedStyle(q('#off')).opacity).toBe('0.4');
    expect(getComputedStyle(q('#off')).backgroundColor).toBe(fg1);
    expect(getComputedStyle(q('#icon')).color).toBe(fg2);
    expect(getComputedStyle(q('#icon')).borderTopLeftRadius).toBe('6px');
    // the internal development record: a disabled glyph stays legible-but-muted.
    expect(getComputedStyle(q('#icon-off')).opacity).toBe('0.55');
    expect(getComputedStyle(q('#primary .mat-mdc-button-persistent-ripple'), '::before').display).toBe('none');
  });
});
