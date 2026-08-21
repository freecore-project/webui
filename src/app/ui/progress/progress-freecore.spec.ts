import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmProgressImports } from '@spartan-ng/helm/progress';

// the internal development record: the helm progress that replaced the last mat-progress-bars -- the contracts the MDC spec
// pinned (aria-valuenow on a value, none without one, the value shown as the fill) plus the ix paint: a square
// 4px bar, the fill in the theme's --primary, the track the same colour at half strength, an indeterminate sweep.
@Component({
  standalone: true,
  imports: [HlmProgressImports],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="width: 400px">
      <hlm-progress id="determinate" [value]="value"><hlm-progress-indicator /></hlm-progress>
      <hlm-progress id="indeterminate"><hlm-progress-indicator /></hlm-progress>
    </div>
  `,
})
class ProgressHostComponent {
  value = 25;
}

describe('helm progress on the FreeCORE paint (the internal development record)', () => {
  let fixture: ComponentFixture<ProgressHostComponent>;
  const bar = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`);
  const fill = (id: string): HTMLElement => bar(id).querySelector('hlm-progress-indicator');

  beforeEach(async () => {
    document.documentElement.style.setProperty('--primary', '#0095d5');
    await TestBed.configureTestingModule({ imports: [ProgressHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgressHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => document.documentElement.style.removeProperty('--primary'));

  it('exposes a determinate value to assistive tech and draws it as the fill', () => {
    const host = bar('determinate');
    expect(host.getAttribute('role')).toBe('progressbar');
    expect(host.getAttribute('aria-valuenow')).toBe('25');
    expect(host.getAttribute('aria-valuetext')).toBe('25%');
    expect(fill('determinate').style.transform).toBe('translateX(-75%)');
    fixture.componentInstance.value = 80;
    fixture.detectChanges();
    expect(host.getAttribute('aria-valuenow')).toBe('80');
    expect(fill('determinate').style.transform).toBe('translateX(-20%)');
  });

  it('has no value while indeterminate and sweeps instead', () => {
    const host = bar('indeterminate');
    expect(host.hasAttribute('aria-valuenow')).toBeFalse();
    expect(host.hasAttribute('aria-valuetext')).toBeFalse();
    expect(host.getAttribute('data-state')).toBe('indeterminate');
    expect(fill('indeterminate').classList).toContain('animate-indeterminate');
    expect(getComputedStyle(fill('indeterminate')).animationName).toBe('indeterminate');
    expect(getComputedStyle(fill('determinate')).animationName).toBe('none');
  });

  it('paints the ix bar: square 4px, the fill in --primary, the track at half strength', () => {
    const host = getComputedStyle(bar('determinate'));
    expect(bar('determinate').getBoundingClientRect().height).toBe(4);
    expect(bar('determinate').getBoundingClientRect().width).toBe(400);
    expect(host.borderRadius).toBe('0px');
    expect(host.overflow).toBe('hidden');
    expect(getComputedStyle(fill('determinate')).backgroundColor).toBe('rgb(0, 149, 213)');
    // the track is --primary mixed 50% with transparent: same hue, half alpha (colour-space spelling varies)
    expect(host.backgroundColor).toMatch(/\/ 0\.5\)$|, 0\.5\)$/);
  });
});
