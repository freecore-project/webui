import { CdkStepperModule, StepperSelectionEvent } from '@angular/cdk/stepper';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FcStepperComponent } from './fc-stepper.component';

// the host is Eager on purpose: this app's components default to OnPush, and the spec writes
// plain fields
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CdkStepperModule, ReactiveFormsModule, FcStepperComponent],
  template: `
    <form>
      <fc-stepper [linear]="linear" #stepper (selectionChange)="events.push($event)">
        <cdk-step [stepControl]="first">
          <ng-template cdkStepLabel>Name Jail</ng-template>
          <input id="first-input" [formControl]="first" />
          <button id="next-0" type="button" cdkStepperNext>Next</button>
        </cdk-step>
        <cdk-step [stepControl]="second" label="Networking">
          <input id="second-input" [formControl]="second" />
          <button id="back-1" type="button" cdkStepperPrevious>Back</button>
          <button id="next-1" cdkStepperNext>Next</button>
        </cdk-step>
        <cdk-step>
          <ng-template cdkStepLabel>Confirm Options</ng-template>
          <p id="summary">Confirm these settings.</p>
        </cdk-step>
      </fc-stepper>
    </form>
  `,
})
class StepperHostComponent {
  linear = true;
  first = new FormControl('', Validators.required);
  second = new FormControl('');
  events: StepperSelectionEvent[] = [];
}

// the internal development record: the wizard stepper on the vocabulary -- a 56px header row on the --line
// hairline, 24px circles 8px from 13px labels, hairline connectors; selected = the fg1 slab with
// a bg0 number and a fg1 500 label, completed = the #352 ring with a fg1 check, upcoming = the
// ring with a fg2 number and label. CDK owns the behaviour. Fallback ladder (no theme service in
// karma): line #2A353D, bg0 #0B0F13, fg1 #DCE3E6, fg2 #97A6AE.
describe('fc-stepper (the internal development record)', () => {
  let fixture: ComponentFixture<StepperHostComponent>;
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const line = 'rgb(42, 53, 61)';
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const tabs = (): HTMLButtonElement[] => qa('.fc-step-header') as HTMLButtonElement[];
  const panels = (): HTMLElement[] => qa('.fc-step-panel');
  const shown = (): boolean[] => panels().map((p) => !p.hasAttribute('inert'));
  // Chrome's serialization of a color-mix() result is not a design law: compare against a probe
  const mixed = (css: string): string => { const probe = document.createElement('span'); probe.style.borderColor = css; fixture.nativeElement.appendChild(probe); const value = getComputedStyle(probe).borderTopColor; probe.remove(); return value; };
  const icon = (i: number): HTMLElement => tabs()[i].querySelector('.fc-step-icon');
  const label = (i: number): HTMLElement => tabs()[i].querySelector('.fc-step-label');
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 150));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepperHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(StepperHostComponent);
    fixture.nativeElement.style.cssText = 'display:block;width:800px';
    fixture.detectChanges();
    // the step circles transition background/border/color over 120ms: read the resting paint, not a frame of it
    fixture.nativeElement.querySelectorAll('.fc-step-icon, .fc-step-label').forEach((el: HTMLElement) => { el.style.transition = 'none'; });
  });

  it('draws one tab per step in a 56px row on the hairline, with 24px circles, 13px labels and hairline connectors', () => {
    const header = q('.fc-stepper-header');
    expect(header.getAttribute('role')).toBe('tablist');
    expect(header.getBoundingClientRect().height).toBe(56);
    expect(getComputedStyle(header).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(header).borderBottomColor).toBe(line);
    expect(getComputedStyle(header).marginBottom).toBe('24px');
    expect(tabs().length).toBe(3);
    expect(tabs().map((t) => t.querySelector('.fc-step-label').textContent.trim())).toEqual(['Name Jail', 'Networking', 'Confirm Options']);
    tabs().forEach((t) => {
      expect(t.tagName).toBe('BUTTON');
      expect(t.type).toBe('button'); // inside the wizard's <form>
      expect(t.getAttribute('role')).toBe('tab');
      expect(t.getBoundingClientRect().height).toBe(40);
      expect(getComputedStyle(t).fontSize).toBe('13px');
      expect(getComputedStyle(t).paddingLeft).toBe('8px');
      expect(getComputedStyle(t).borderTopLeftRadius).toBe('6px');
      const circle = t.querySelector<HTMLElement>('.fc-step-icon');
      expect([circle.getBoundingClientRect().width, circle.getBoundingClientRect().height]).toEqual([24, 24]);
      expect(Math.round(t.querySelector('.fc-step-label').getBoundingClientRect().left - circle.getBoundingClientRect().right)).toBe(8);
    });
    const lines = qa('.fc-step-line');
    expect(lines.length).toBe(2);
    lines.forEach((l) => {
      expect(l.getBoundingClientRect().height).toBe(1);
      expect(getComputedStyle(l).backgroundColor).toBe(line);
      expect(l.getBoundingClientRect().width).toBeGreaterThanOrEqual(32);
    });
    // the connectors sit between the tabs, on the circles' centre line
    expect(Math.round(lines[0].getBoundingClientRect().top)).toBe(Math.round(icon(0).getBoundingClientRect().top + 11.5));
    expect(lines[0].getBoundingClientRect().left).toBeGreaterThan(tabs()[0].getBoundingClientRect().right);
    expect(lines[0].getBoundingClientRect().right).toBeLessThan(tabs()[1].getBoundingClientRect().left);
  });

  it('paints the selected step as the fg1 slab, the upcoming ones as the fg2 ring, and the completed one with a check', async () => {
    expect(tabs()[0].getAttribute('data-state')).toBe('selected');
    expect(getComputedStyle(icon(0)).backgroundColor).toBe(fg1);
    expect(getComputedStyle(icon(0)).color).toBe('rgb(11, 15, 19)');
    expect(icon(0).textContent.trim()).toBe('1');
    expect(getComputedStyle(icon(0)).fontSize).toBe('12px');
    expect(getComputedStyle(label(0)).color).toBe(fg1);
    expect(getComputedStyle(label(0)).fontWeight).toBe('500');
    expect(tabs()[1].getAttribute('data-state')).toBe('upcoming');
    expect(getComputedStyle(icon(1)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(icon(1)).borderTopWidth).toBe('1px');
    expect(getComputedStyle(icon(1)).borderTopColor).toBe(mixed('color-mix(in srgb, #97a6ae 70%, transparent)')); // fg2 at 70%, the #352 ring
    expect(getComputedStyle(icon(1)).color).toBe(fg2);
    expect(icon(1).textContent.trim()).toBe('2');
    expect(getComputedStyle(label(1)).color).toBe(fg2);
    expect(getComputedStyle(label(1)).fontWeight).toBe('400');
    // complete the first step and move on: it keeps the ring, gains the check, its label goes fg1
    fixture.componentInstance.first.setValue('web');
    fixture.detectChanges();
    q('#next-0').click();
    fixture.detectChanges();
    await settle();
    expect(tabs()[0].getAttribute('data-state')).toBe('completed');
    expect(icon(0).querySelector('svg.fc-step-check')).not.toBeNull();
    expect(icon(0).textContent.trim()).toBe('');
    expect(getComputedStyle(icon(0)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(icon(0)).color).toBe(fg1);
    expect(getComputedStyle(label(0)).color).toBe(fg1);
    expect(getComputedStyle(label(0)).fontWeight).toBe('400');
    expect(tabs()[1].getAttribute('data-state')).toBe('selected');
    expect(getComputedStyle(icon(1)).backgroundColor).toBe(fg1);
  });

  it('renders every panel, keeps the non-selected ones inert in a zero-height hidden box, and wires the tab/tabpanel aria', () => {
    expect(panels().length).toBe(3);
    expect(shown()).toEqual([true, false, false]);
    expect(panels().map((p) => getComputedStyle(p).visibility)).toEqual(['visible', 'hidden', 'hidden']);
    expect(panels().map((p) => p.getBoundingClientRect().height > 0)).toEqual([true, false, false]);
    expect(panels().map((p) => getComputedStyle(p).display)).toEqual(['block', 'block', 'block']); // a box, as Material kept it: scrollIntoView on another step's field still lands
    expect(q('#second-input')).not.toBeNull(); // the other steps' DOM is present (ids, hooks)
    expect(q('#second-input').getBoundingClientRect().top).toBeGreaterThan(0);
    panels().forEach((p, i) => {
      expect(p.getAttribute('role')).toBe('tabpanel');
      expect(p.id).toBe(tabs()[i].getAttribute('aria-controls'));
      expect(p.getAttribute('aria-labelledby')).toBe(tabs()[i].id);
    });
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs().map((t) => t.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
    expect(tabs().map((t) => t.getAttribute('aria-setsize'))).toEqual(['3', '3', '3']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']); // roving
    expect(tabs().map((t) => t.getAttribute('aria-disabled'))).toEqual([null, 'true', 'true']); // linear: not yet navigable
  });

  it('gates Next on the step control under linear, and lets Back and the header go where CDK allows', async () => {
    const stepper = fixture.componentInstance;
    q('#next-0').click();
    fixture.detectChanges();
    expect(shown()[0]).toBeTrue(); // refused: the first control is required and empty
    expect(stepper.events.length).toBe(0);
    tabs()[1].click();
    fixture.detectChanges();
    expect(shown()[0]).toBeTrue(); // the header is gated the same way
    stepper.first.setValue('web');
    fixture.detectChanges();
    q('#next-0').focus(); // a pointer click focuses the button; the synthetic one does not
    q('#next-0').click();
    fixture.detectChanges();
    await settle();
    expect(shown()).toEqual([false, true, false]);
    expect(stepper.events.length).toBe(1);
    expect(stepper.events[0].previouslySelectedIndex).toBe(0);
    expect(stepper.events[0].selectedIndex).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]); // focus was inside the stepper: CDK moves it to the new header
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(tabs()[0].getAttribute('aria-disabled')).toBeNull(); // completed: navigable
    // a plain button gets type=button from the directive; a cdkStepperNext without one is a submit (CDK default)
    expect((q('#next-1') as HTMLButtonElement).type).toBe('submit');
    expect((q('#back-1') as HTMLButtonElement).type).toBe('button');
    q('#back-1').click();
    fixture.detectChanges();
    await settle();
    expect(shown()).toEqual([true, false, false]);
    // the completed header is clickable from the first step too
    tabs()[1].click();
    fixture.detectChanges();
    expect(shown()[1]).toBeTrue();
  });

  it('walks the header with the arrow keys and selects on Enter only where navigable', async () => {
    const key = (target: HTMLElement, k: string, code: number): void => { target.dispatchEvent(new KeyboardEvent('keydown', { key: k, keyCode: code, bubbles: true })); fixture.detectChanges(); };
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight', 39);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    key(tabs()[1], 'Enter', 13);
    expect(shown()[0]).toBeTrue(); // not navigable yet (the first control is invalid)
    key(tabs()[1], 'End', 35);
    expect(document.activeElement).toBe(tabs()[2]);
    key(tabs()[2], 'Home', 36);
    expect(document.activeElement).toBe(tabs()[0]);
    fixture.componentInstance.first.setValue('web');
    fixture.detectChanges();
    key(tabs()[0], 'ArrowRight', 39);
    key(tabs()[1], 'Enter', 13);
    await settle();
    expect(shown()[1]).toBeTrue();
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('exposes the CDK surface the wizards drive: selectedIndex get/set, next(), and the hover surface on navigable headers', async () => {
    const stepper = fixture.debugElement.query((el) => el.componentInstance instanceof FcStepperComponent).componentInstance as FcStepperComponent;
    expect(stepper.selectedIndex).toBe(0);
    expect(typeof stepper.selectedIndex).toBe('number'); // not the private signal
    stepper.next();
    fixture.detectChanges();
    expect(stepper.selectedIndex).toBe(0); // gated
    fixture.componentInstance.linear = false;
    fixture.detectChanges();
    stepper.next();
    fixture.detectChanges();
    expect(stepper.selectedIndex).toBe(1);
    stepper.selectedIndex = 2;
    fixture.detectChanges();
    expect(shown()).toEqual([false, false, true]);
    expect(tabs().map((t) => t.getAttribute('aria-disabled'))).toEqual([null, null, null]); // non-linear: all navigable
    expect(getComputedStyle(tabs()[0]).cursor).toBe('pointer');
    // :hover cannot be synthesised in karma; the rule is asserted statically (the box round hovers a real pointer)
    const hover = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules)).find((rule) => (rule as CSSStyleRule).selectorText === '.fc-step-header:hover:not([aria-disabled])') as CSSStyleRule;
    expect(hover).toBeDefined();
    expect(hover.style.backgroundColor).toContain('var(--sp-accent');
    // the focus ring has room: the row is not a clip box above 700px
    expect(getComputedStyle(q('.fc-stepper-header')).overflowX).toBe('visible');
    expect(getComputedStyle(q('.fc-stepper-header')).paddingLeft).toBe('0px'); // the hairline ends where the fields do
    expect(Math.round(icon(0).getBoundingClientRect().left - q('.fc-stepper-header').getBoundingClientRect().left)).toBe(8); // the tab's own inset
  });
});
