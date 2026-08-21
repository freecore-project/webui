import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

// the host is Eager on purpose: this app's components default to OnPush, and the spec writes
// plain fields
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...HlmTooltipImports],
  template: `
    <div style="padding: 120px 0 0 200px; width: 600px">
      <button id="save" type="button" [hlmTooltip]="text">Save</button>
      <button id="below" type="button" hlmTooltip="Underneath" position="bottom">Below</button>
      <button id="left" type="button" hlmTooltip="Leftward" position="left">Left</button>
      <button id="off" type="button" hlmTooltip="Never" [tooltipDisabled]="true">Off</button>
      <span id="wrap" style="display: inline-block" hlmTooltip="Nothing to save">
        <button id="locked" type="button" disabled>Locked</button>
      </span>
    </div>
  `,
})
class TooltipHostComponent {
  text = 'Save the configuration and apply it to every interface on this host';
}

// The FreeCORE default ladder (theme.service.ts DefaultTheme), as setCssVars() emits it.
const LADDER = {
  '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D',
  '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--alt-bg1': '#212A31', '--accent': '#8FB4C7', '--red': '#E3625A',
};

// the internal development record: the tooltip is the #354 popover surface -- bg2, the --line hairline, 6px --
// at 12px/1.5 left-aligned, inset 6px 10px, at most 200px wide, no arrow; 150 ms in, 100 ms out,
// the popover's fade; it opens on mouse hover and keyboard focus, closes on leave/blur/Escape.
// The panel is the brain's content component in the CDK pane: [role=tooltip] with an id the
// trigger's aria-describedby points at while it is shown.
describe('hlm-tooltip (the internal development record)', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;
  let overlay: OverlayContainer;
  const root = document.documentElement;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const panel = (): HTMLElement | null => overlay.getContainerElement().querySelector('[role="tooltip"]');
  const pointer = (type: string, pointerType = 'mouse'): PointerEvent => new PointerEvent(type, { pointerType });
  const escape = (): KeyboardEvent => new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });

  // the brain wires its listeners in afterNextRender and opens after its show delay
  function hover(id: string): HTMLElement | null {
    q(`#${id}`).dispatchEvent(pointer('pointerenter'));
    tick(150);
    fixture.detectChanges();
    return panel();
  }

  beforeEach(async () => {
    Object.entries(LADDER).forEach(([name, value]) => root.style.setProperty(name, value));
    await TestBed.configureTestingModule({ imports: [TooltipHostComponent] }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(TooltipHostComponent);
    // pinned to the viewport's top-left: other specs leave the karma page tall or short, and CDK
    // flips a panel that would not fit above its trigger
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:800px; z-index:1';
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    overlay.ngOnDestroy();
    Object.keys(LADDER).forEach((name) => root.style.removeProperty(name));
  });

  it('opens 150 ms after a mouse hover as the #354 surface above the trigger, described to it, with no arrow', fakeAsync(() => {
    const trigger = q('#save');
    trigger.dispatchEvent(pointer('pointerenter'));
    tick(149);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    tick(1);
    fixture.detectChanges();
    const p = panel();
    expect(p).not.toBeNull();
    expect(p.tagName.toLowerCase()).toBe('ng-component');
    expect(p.id).toMatch(/^brn-tooltip-\d+$/);
    expect(trigger.getAttribute('aria-describedby')).toBe(p.id);
    expect(p.getAttribute('data-state')).toBe('open');
    expect(p.getAttribute('data-side')).toBe('top');
    expect(p.textContent.trim()).toBe(fixture.componentInstance.text);
    const s = getComputedStyle(p);
    expect(s.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(s.color).toBe('rgb(220, 227, 230)');
    expect(s.borderTopWidth).toBe('1px');
    expect(s.borderTopStyle).toBe('solid');
    expect(s.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(s.borderTopLeftRadius).toBe('6px');
    expect(s.fontSize).toBe('12px');
    expect(s.lineHeight).toBe('18px');
    expect(s.paddingTop).toBe('6px');
    expect(s.paddingBottom).toBe('6px');
    expect(s.paddingLeft).toBe('10px');
    expect(s.paddingRight).toBe('10px');
    expect(s.maxWidth).toBe('200px');
    expect(s.boxSizing).toBe('border-box');
    expect(s.textAlign).toBe('left');
    const pr = p.getBoundingClientRect();
    expect(pr.width).toBeLessThanOrEqual(200);
    expect(pr.height).toBeGreaterThan(30); // the long text wrapped inside the cap
    // the brain always mounts its arrow span + svg; the law hides them
    const arrow = p.querySelector('svg') as SVGElement;
    expect(arrow).not.toBeNull();
    expect(arrow.getClientRects().length).toBe(0);
    expect(getComputedStyle(arrow.parentElement).display).toBe('none');
    const tr = trigger.getBoundingClientRect();
    expect(Math.round(tr.top - pr.bottom)).toBe(8); // above, the brain's 8px offset
    expect(Math.abs((pr.left + pr.width / 2) - (tr.left + tr.width / 2))).toBeLessThanOrEqual(1);
    flush();
  }));

  it('closes 100 ms after the pointer leaves, and is detached once the fade has run', fakeAsync(() => {
    const trigger = q('#save');
    const p = hover('save');
    expect(p).not.toBeNull();
    trigger.dispatchEvent(pointer('pointerleave'));
    tick(99);
    fixture.detectChanges();
    expect(p.getAttribute('data-state')).toBe('open');
    tick(1);
    fixture.detectChanges();
    expect(p.getAttribute('data-state')).toBe('closed');
    tick(300);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(trigger.hasAttribute('aria-describedby')).toBeFalse();
    flush();
  }));

  it('opens on keyboard focus and closes on blur', fakeAsync(() => {
    const trigger = q('#save');
    trigger.focus(); // script focus with no pointer history is :focus-visible in Chrome
    expect(trigger.matches(':focus-visible')).toBeTrue();
    tick(150);
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    trigger.blur();
    tick(100);
    fixture.detectChanges();
    expect(panel().getAttribute('data-state')).toBe('closed');
    tick(300);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    flush();
  }));

  it('does not open on focus that is not :focus-visible (a dialog or menu handing focus back to its opener), and hovers again afterwards', fakeAsync(() => {
    const trigger = q('#save');
    const matches = trigger.matches.bind(trigger);
    spyOn(trigger, 'matches').and.callFake(((selector: string): boolean => (selector === ':focus-visible' ? false : matches(selector))) as typeof trigger.matches);
    trigger.focus();
    tick(300);
    fixture.detectChanges();
    expect(panel()).withContext('pointer-origin focus opens nothing').toBeNull();
    expect(trigger.hasAttribute('aria-describedby')).toBeFalse();
    trigger.dispatchEvent(pointer('pointerenter')); // hover restores the consumer setting
    tick(150);
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    trigger.dispatchEvent(pointer('pointerleave'));
    trigger.blur();
    tick(400);
    fixture.detectChanges();
    flush();
  }));

  it('closes at once on Escape', fakeAsync(() => {
    const p = hover('save');
    expect(p).not.toBeNull();
    document.body.dispatchEvent(escape()); // the brain listens on the window
    fixture.detectChanges();
    expect(p.getAttribute('data-state')).toBe('closed');
    tick(300);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    flush();
  }));

  it('never opens while tooltipDisabled, and creates no overlay pane for it', fakeAsync(() => {
    expect(hover('off')).toBeNull();
    tick(500);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(overlay.getContainerElement().querySelector('.cdk-overlay-pane')).toBeNull();
    expect(q('#off').hasAttribute('aria-describedby')).toBeFalse();
    flush();
  }));

  it('ignores a touch pointer', fakeAsync(() => {
    q('#save').dispatchEvent(pointer('pointerenter', 'touch'));
    tick(500);
    fixture.detectChanges();
    expect(panel()).toBeNull();
    flush();
  }));

  it('places the panel 8px below and centred when position is bottom', fakeAsync(() => {
    const p = hover('below');
    expect(p).not.toBeNull();
    expect(p.getAttribute('data-side')).toBe('bottom');
    const tr = q('#below').getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    expect(Math.round(pr.top - tr.bottom)).toBe(8);
    expect(Math.abs((pr.left + pr.width / 2) - (tr.left + tr.width / 2))).toBeLessThanOrEqual(1);
    flush();
  }));

  it('places the panel 8px left of the trigger and centred on it when position is left (the row-menu default)', fakeAsync(() => {
    const p = hover('left');
    expect(p).not.toBeNull();
    expect(p.getAttribute('data-side')).toBe('left');
    const tr = q('#left').getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    expect(Math.round(tr.left - pr.right)).toBe(8);
    expect(Math.abs((pr.top + pr.height / 2) - (tr.top + tr.height / 2))).toBeLessThanOrEqual(1);
    flush();
  }));

  // the issue's placement rule: a disabled control fires no pointer events, so its wrapper owns
  // the tooltip
  it('opens from the wrapper of a disabled control', fakeAsync(() => {
    const p = hover('wrap');
    expect(p).not.toBeNull();
    expect(p.textContent.trim()).toBe('Nothing to save');
    expect(q('#wrap').getAttribute('aria-describedby')).toBe(p.id);
    flush();
  }));
});
