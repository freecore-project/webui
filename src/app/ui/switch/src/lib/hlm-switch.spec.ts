import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';

// the host is Eager on purpose: this app's components default to OnPush, and the spec writes
// plain fields
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ...HlmSwitchImports],
  template: `
    <hlm-switch id="plain" [checked]="on" (checkedChange)="on = $event; changes = changes + 1" aria-label="Running" />
    <hlm-switch id="bound" [(ngModel)]="model" />
    <hlm-switch id="off" [disabled]="true" aria-label="Locked" />
    <hlm-switch id="quiet" [tabIndex]="-1" inputId="quiet-button" aria-hidden="true" />
  `,
})
class SwitchHostComponent {
  on = false;
  changes = 0;
  model = true;
}

// the internal development record: the S1 switch -- a 32x18 track on the checkbox law: off = the --line hairline
// on a transparent track with a fg2 thumb, on = the fg1 track with a bg0 thumb; the thumb 14px,
// 2px in, sliding 14px. Fallback ladder (no theme service in karma): line #2A353D, bg0 #0B0F13,
// fg1 #DCE3E6, fg2 #97A6AE.
describe('hlm-switch (the internal development record)', () => {
  let fixture: ComponentFixture<SwitchHostComponent>;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const track = (id: string): HTMLButtonElement => q(`#${id} button[role="switch"]`) as HTMLButtonElement;
  const thumb = (id: string): HTMLElement => track(id).querySelector('brn-switch-thumb') as HTMLElement;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SwitchHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(SwitchHostComponent);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges(); // ngModel writes on a microtask
  });

  it('draws the 32x18 track on the hairline with a 14px fg2 thumb 2px in when off', () => {
    const t = track('plain');
    const r = t.getBoundingClientRect();
    expect([Math.round(r.width), Math.round(r.height)]).toEqual([32, 18]);
    expect(parseFloat(getComputedStyle(t).borderTopLeftRadius)).toBeGreaterThanOrEqual(9); // rounded-full
    expect(getComputedStyle(t).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(t).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(t.getAttribute('data-state')).toBe('unchecked');
    expect(t.getAttribute('aria-checked')).toBe('false');
    expect(t.getAttribute('aria-label')).toBe('Running');
    const th = thumb('plain');
    const tr = th.getBoundingClientRect();
    expect([Math.round(tr.width), Math.round(tr.height)]).toEqual([14, 14]);
    expect(Math.round(tr.left - r.left)).toBe(2);
    expect(Math.round(tr.top - r.top)).toBe(2);
    expect(getComputedStyle(th).backgroundColor).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(th).pointerEvents).toBe('none');
  });

  it('fills the track fg1 and slides a bg0 thumb 14px when on, toggling on click and reporting the change', async () => {
    const t = track('plain');
    t.click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.on).toBeTrue();
    expect(fixture.componentInstance.changes).toBe(1);
    expect(t.getAttribute('data-state')).toBe('checked');
    expect(getComputedStyle(t).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(t).borderTopColor).toBe('rgb(220, 227, 230)');
    const th = thumb('plain');
    expect(getComputedStyle(th).backgroundColor).toBe('rgb(11, 15, 19)');
    expect(Math.round(th.getBoundingClientRect().left - t.getBoundingClientRect().left)).toBe(16); // 2 + 14
    // an outside write follows the input
    fixture.componentInstance.on = false;
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(t.getAttribute('data-state')).toBe('unchecked');
    expect(Math.round(th.getBoundingClientRect().left - t.getBoundingClientRect().left)).toBe(2);
  });

  it('is a value accessor and dims when disabled', async () => {
    expect(track('bound').getAttribute('data-state')).toBe('checked');
    track('bound').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.model).toBeFalse();
    const off = track('off');
    expect(off.disabled).toBeTrue();
    expect(getComputedStyle(off).opacity).toBe('0.5');
    expect(getComputedStyle(off).cursor).toBe('not-allowed');
    // a display-only switch: out of the tab order, its button named by inputId
    const quiet = track('quiet');
    expect(quiet.tabIndex).toBe(-1);
    expect(quiet.id).toBe('quiet-button');
    expect(quiet.closest('brn-switch').id).toBe('quiet-button-switch');
  });
});
