import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FC_EXPANSION } from './fc-expansion';

// the internal development record: the expansion panel off Material (Storage -> Pools). What mat-expansion-panel did and drew under
// the theme: a button-role header with aria-expanded / aria-controls / aria-disabled and one tab stop (none while
// disabled), click / Enter / Space toggling, Up / Down / Home / End between headers (skipping a disabled one, wrapping),
// the body a region named by its header, inert and hidden when closed; the 8px fg1 chevron turned over when open, the
// hover layer on a closed header only, the keyboard-focus layer on any header. freecore-ui.css is a Karma global.
@Component({
  standalone: true,
  imports: [...FC_EXPANSION],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div fcAccordion class="fc-ui" style="width: 600px">
      @for (p of panels; track p.name) {
        <div class="fc-expansion-panel" brnCollapsible [expanded]="p.open" [disabled]="p.disabled" [id]="'panel-' + p.name">
          <div fcExpansionHeader #header="fcExpansionHeader">
            <span class="fc-expansion-content"><span class="name">{{ p.name }}</span></span>
            <span class="fc-expansion-indicator" aria-hidden="true"></span>
          </div>
          <div class="fc-expansion-panel-content-wrapper" brnCollapsibleContent role="region" [attr.aria-labelledby]="header.id">
            <div class="fc-expansion-panel-content"><div class="fc-expansion-panel-body"><button type="button">inside {{ p.name }}</button></div></div>
          </div>
        </div>
      }
    </div>
  `,
})
class PanelsHostComponent {
  panels = [
    { name: 'tank', open: true, disabled: false },
    { name: 'locked', open: false, disabled: false },
    { name: 'offline', open: true, disabled: true },
    { name: 'archive', open: true, disabled: false },
  ];
}

describe('expansion panel (the internal development record)', () => {
  let fixture: ComponentFixture<PanelsHostComponent>;
  const ladder = { '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };
  const panel = (name: string): HTMLElement => fixture.nativeElement.querySelector(`#panel-${name}`);
  const header = (name: string): HTMLElement => panel(name).querySelector('.fc-expansion-panel-header');
  const region = (name: string): HTMLElement => panel(name).querySelector('[role=region]');
  const key = (el: HTMLElement, name: string, keyCode: number): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { get: () => keyCode });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const settle = (ms = 300): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)); // the 225ms animations

  beforeEach(async () => {
    Object.entries(ladder).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    await TestBed.configureTestingModule({ imports: [PanelsHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(PanelsHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    Object.keys(ladder).forEach((name) => document.documentElement.style.removeProperty(name));
  });

  it('wires each header as a button that controls its region', () => {
    for (const name of ['tank', 'locked', 'archive']) {
      const h = header(name);
      expect([h.getAttribute('role'), h.getAttribute('tabindex'), h.getAttribute('aria-disabled')]).toEqual(['button', '0', 'false']);
      expect(h.getAttribute('aria-controls')).toBe(region(name).id);
      expect(region(name).getAttribute('aria-labelledby')).toBe(h.id);
    }
    expect([header('tank').getAttribute('aria-expanded'), header('locked').getAttribute('aria-expanded')]).toEqual(['true', 'false']);
    expect([header('offline').getAttribute('tabindex'), header('offline').getAttribute('aria-disabled')]).toEqual(['-1', 'true']);
  });

  it('opens and closes on a click, Enter and Space; a disabled header stays as it is', async () => {
    header('tank').click();
    fixture.detectChanges();
    expect(header('tank').getAttribute('aria-expanded')).toBe('false');
    const enter = key(header('tank'), 'Enter', 13);
    expect(enter.defaultPrevented).toBeTrue();
    expect(header('tank').getAttribute('aria-expanded')).toBe('true');
    key(header('tank'), ' ', 32);
    expect(header('tank').getAttribute('aria-expanded')).toBe('false');
    header('offline').click();
    key(header('offline'), 'Enter', 13);
    expect(header('offline').getAttribute('aria-expanded')).toBe('true');
    await settle();
  });

  it('hides a closed body and takes it out of the tab order', async () => {
    const wrapper = region('locked');
    expect(wrapper.hasAttribute('inert')).toBeTrue();
    expect(Math.round(wrapper.getBoundingClientRect().height)).toBe(0);
    expect(getComputedStyle(wrapper.querySelector('.fc-expansion-panel-content')).visibility).toBe('hidden');
    header('locked').click();
    fixture.detectChanges();
    await settle();
    expect(wrapper.hasAttribute('inert')).toBeFalse();
    expect(wrapper.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(getComputedStyle(wrapper.querySelector('.fc-expansion-panel-content')).visibility).toBe('visible');
  });

  it('moves focus between headers with Up / Down / Home / End, skipping a disabled one and wrapping', () => {
    header('tank').focus();
    key(header('tank'), 'ArrowDown', 40);
    expect(document.activeElement).toBe(header('locked'));
    key(header('locked'), 'ArrowDown', 40);
    expect(document.activeElement).toBe(header('archive')); // offline is disabled
    key(header('archive'), 'ArrowDown', 40);
    expect(document.activeElement).toBe(header('tank'));
    key(header('tank'), 'End', 35);
    expect(document.activeElement).toBe(header('archive'));
    key(header('archive'), 'Home', 36);
    expect(document.activeElement).toBe(header('tank'));
    expect(header('tank').getAttribute('aria-expanded')).toBe('true'); // moving focus toggles nothing
  });

  it('draws the theme chevron, turned over while open, and the 14px/500 header and 14px/20px body voices', async () => {
    const after = (name: string): CSSStyleDeclaration => getComputedStyle(panel(name).querySelector('.fc-expansion-indicator'), '::after');
    const a = after('tank');
    expect([a.borderRightWidth, a.borderBottomWidth, a.borderTopWidth, a.borderRightColor, a.paddingTop]).toEqual(['2px', '2px', '0px', 'rgb(220, 227, 230)', '3px']);
    const box = panel('tank').querySelector('.fc-expansion-indicator').getBoundingClientRect();
    expect(Math.round(box.width)).toBe(8);
    expect(getComputedStyle(panel('tank').querySelector('.fc-expansion-indicator')).transform).toBe('matrix(-1, 0, 0, -1, 0, 0)');
    expect(getComputedStyle(panel('locked').querySelector('.fc-expansion-indicator')).transform).toBe('none');
    const h = getComputedStyle(header('tank'));
    expect([h.fontSize, h.fontWeight, h.cursor, h.color]).toEqual(['14px', '500', 'pointer', 'rgb(151, 166, 174)']);
    expect(getComputedStyle(header('offline')).cursor).toBe('default');
    const c = getComputedStyle(panel('tank').querySelector('.fc-expansion-panel-content'));
    expect([c.fontSize, c.lineHeight, c.fontWeight, c.letterSpacing]).toEqual(['14px', '20px', '400', '0.25px']);
    const p = getComputedStyle(panel('tank'));
    expect([p.backgroundColor, p.boxShadow, p.borderTopLeftRadius, p.overflow]).toEqual(['rgba(0, 0, 0, 0)', 'none', '0px', 'hidden']);
  });
});
