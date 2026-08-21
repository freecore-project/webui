import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmSliderImports } from '@spartan-ng/helm/slider';

// the internal development record: the helm slider that replaced the last mat-slider (the terminal's font size) -- the #377 mono
// look (2px hairline track, 2px fg2 fill up to the knob, 14px round fg1 knob, no shadow) and what mat-slider did:
// the knob centre travels the track end to end, the arrow keys step, Home/End go to the ends, a click on (or near)
// the track jumps there, a named slider role for assistive tech.
@Component({
  standalone: true,
  imports: [HlmSliderImports],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="fc-ui" style="padding: 20px">
      <hlm-slider id="font" style="width: 140px; height: 48px" min="10" max="20" step="1" [value]="value"
        (valueChange)="changes.push($event[0]); value = $event" [aria-label]="'Font size'" />
    </div>
  `,
})
class SliderHostComponent {
  value = [14];
  changes: number[] = [];
}

describe('helm slider on the FreeCORE mono controls (the internal development record)', () => {
  let fixture: ComponentFixture<SliderHostComponent>;
  const ladder = { '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };
  const q = (sel: string): HTMLElement => fixture.nativeElement.querySelector(sel);
  const rect = (sel: string): DOMRect => q(sel).getBoundingClientRect();
  const centre = (r: DOMRect): number => r.left + r.width / 2;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fixture.detectChanges();
  };
  const key = (name: string): void => {
    q('[role=slider]').dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    await TestBed.configureTestingModule({ imports: [SliderHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(SliderHostComponent);
    document.body.appendChild(fixture.nativeElement);
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    Object.keys(ladder).forEach((name) => document.documentElement.style.removeProperty(name));
  });

  it('draws the #377 mono look: a 2px hairline track, a 2px fg2 fill to the knob, a 14px round fg1 knob', () => {
    const host = rect('#font');
    const track = rect('[data-slot=slider-track]');
    const fill = rect('[data-slot=slider-range]');
    const knob = rect('[role=slider]');
    expect([Math.round(track.width), Math.round(track.height), Math.round(track.left - host.left)]).toEqual([140, 2, 0]);
    expect(Math.round(track.top + track.height / 2)).toBe(Math.round(host.top + 24)); // the line through the 48px box
    expect(getComputedStyle(q('[data-slot=slider-track]')).backgroundColor).toBe('rgb(42, 53, 61)');
    expect([Math.round(fill.left - track.left), Math.round(fill.height)]).toEqual([0, 2]);
    expect(getComputedStyle(q('[data-slot=slider-range]')).backgroundColor).toBe('rgb(151, 166, 174)');
    const k = getComputedStyle(q('[role=slider]'));
    expect([Math.round(knob.width), Math.round(knob.height), k.backgroundColor, k.boxShadow]).toEqual([14, 14, 'rgb(220, 227, 230)', 'none']);
    expect(parseFloat(k.borderTopLeftRadius)).toBeGreaterThanOrEqual(7); // round (rounded-full is calc(infinity * 1px))
    // 14 of 10..20: the knob centre and the fill end at 40% of the track; the knob sits on the track's line
    expect(Math.abs(centre(knob) - (track.left + 56))).toBeLessThan(0.6);
    expect(Math.abs(fill.right - centre(knob))).toBeLessThan(0.6);
    expect(Math.abs((knob.top + knob.height / 2) - (track.top + track.height / 2))).toBeLessThan(0.6);
  });

  it('runs the knob centre from one end of the track to the other', async () => {
    fixture.componentInstance.value = [10];
    await settle();
    expect(Math.abs(centre(rect('[role=slider]')) - rect('[data-slot=slider-track]').left)).toBeLessThan(0.6);
    fixture.componentInstance.value = [20];
    await settle();
    expect(Math.abs(centre(rect('[role=slider]')) - rect('[data-slot=slider-track]').right)).toBeLessThan(0.6);
  });

  it('steps with the arrow keys, goes to the ends on Home / End, and names itself', () => {
    const thumb = q('[role=slider]');
    expect([thumb.getAttribute('aria-label'), thumb.getAttribute('aria-valuemin'), thumb.getAttribute('aria-valuemax'), thumb.tabIndex])
      .toEqual(['Font size', '10', '20', 0]);
    key('ArrowRight');
    expect(thumb.getAttribute('aria-valuenow')).toBe('15');
    key('End');
    expect(thumb.getAttribute('aria-valuenow')).toBe('20');
    key('Home');
    expect(thumb.getAttribute('aria-valuenow')).toBe('10');
    expect(fixture.componentInstance.changes).toEqual([15, 20, 10]);
  });

  it('jumps to a click on the track or in the band around it', async () => {
    const track = rect('[data-slot=slider-track]');
    const y = track.top + track.height / 2;
    spyOn(Element.prototype, 'setPointerCapture'); // a synthetic pointer is no active pointer to capture
    const press = (x: number, atY: number): void => {
      const target = document.elementFromPoint(x, atY) as HTMLElement;
      expect(target.getAttribute('data-slot')).toMatch(/^slider-(track|range)$/);
      target.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: atY, pointerId: 1, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    press(track.left + track.width * 0.75, y);
    expect(fixture.componentInstance.changes).toEqual([18]);
    await settle();
    press(track.left + track.width * 0.3, y - 10); // 10px above the 2px line still takes the click
    expect(fixture.componentInstance.changes).toEqual([18, 13]);
  });
});
