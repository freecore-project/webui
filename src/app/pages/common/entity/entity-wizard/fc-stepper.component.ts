import { NgTemplateOutlet } from '@angular/common';
import { CdkStepHeader, CdkStepper } from '@angular/cdk/stepper';
import {
  ChangeDetectionStrategy, Component, QueryList, ViewChildren, ViewEncapsulation,
} from '@angular/core';

/**
 * the internal development record: the wizard's stepper off Material. spartan/ui has no stepper, so this is a
 * FreeCORE component on `@angular/cdk/stepper` (the engine Material's stepper is built on):
 * consumers keep `<cdk-step [stepControl]>` with `<ng-template cdkStepLabel>`; the header is our
 * own row of `<button cdkStepHeader role="tab">` on the vocabulary (56px row on a hairline, 24px
 * circles, 13px labels, hairline connectors; selected = the fg1 slab, completed = the #352 ring
 * with a check, upcoming = the ring in fg2); the panels are rendered for EVERY step and the
 * non-selected ones are `inert` with a zero-height hidden box, as Material did, so the other
 * steps' fields, ids and ix-auto hooks stay in the DOM with a position.
 *
 * CDK owns the behaviour: linear gating through the `selectedIndex` setter (Next is refused while
 * a preceding step's control is invalid or pending), `next()` / `previous()`, `selectionChange`,
 * the roving tabindex and the arrow / Home / End / Enter keys on the header, and the aria wiring.
 * Two things Material also had to do by hand: `_stepHeader` is re-declared as a VIEW query (the
 * inherited one is a content query and would leave the key manager empty), and every header is
 * `type="button"` (the row sits inside the wizard's <form>).
 */
@Component({
  selector: 'fc-stepper',
  standalone: true,
  imports: [NgTemplateOutlet, CdkStepHeader],
  providers: [{ provide: CdkStepper, useExisting: FcStepperComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'fcStepper',
  host: { class: 'fc-stepper' },
  templateUrl: './fc-stepper.component.html',
  styleUrl: './fc-stepper.component.css',
})
export class FcStepperComponent extends CdkStepper {
  @ViewChildren(CdkStepHeader) override _stepHeader: QueryList<CdkStepHeader>;
}
