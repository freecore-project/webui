import { Component, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'form-radio-layout-test-host',
  template: '<div class="radio-option-row"></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-radio/form-radio.component.scss'],
})
class FormRadioLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'form-paragraph-layout-test-host',
  template: `
    <div class="paragraph-layout-row ltr-row" dir="ltr">
      <span class="ltr-first"></span>
      <span class="ltr-last"></span>
    </div>
    <div class="paragraph-layout-row rtl-row" dir="rtl">
      <span class="rtl-first"></span>
      <span class="rtl-last"></span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-paragraph/form-paragraph.component.scss'],
})
class FormParagraphLayoutTestHostComponent {}

/* the internal development record. The wrapper layer above the Material primitives had
 * drifted: a checkbox row carried a 13px bottom margin on top of a padding rule
 * that could never match, and form-radio declared a padding-bottom its own
 * shorthand reset on the next line. These hosts pin what that pass settled on,
 * including the radio values that look arbitrary but hold an inline radio at the
 * 66px field pitch and must not be "tidied". */
@Component({
  standalone: false,
  selector: 'form-checkbox-spacing-test-host',
  template: '<div class="form-checkbox"><input type="checkbox"></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-checkbox/form-checkbox.component.scss'],
})
class FormCheckboxSpacingTestHostComponent {}

@Component({
  standalone: false,
  selector: 'form-radio-spacing-test-host',
  // 12px matches the font the wrapper inherits in a rendered pane, which is what
  // the em values below resolve against.
  template: `
    <div class="mat-radio" style="font-size: 12px">
      <div class="top"></div>
      <div class="radio-option-row"><mat-radio-button></mat-radio-button></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-radio/form-radio.component.scss'],
})
class FormRadioSpacingTestHostComponent {}

@Component({
  standalone: false,
  selector: 'entity-form-fieldset-test-host',
  template: `
    <div class="fieldset-container fieldset-display-default">
      <div class="fieldset"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../entity-form.component.scss'],
})
class EntityFormFieldsetTestHostComponent {}

describe('entity-form leaf control layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        FormRadioLayoutTestHostComponent, FormParagraphLayoutTestHostComponent,
        FormCheckboxSpacingTestHostComponent, FormRadioSpacingTestHostComponent,
        EntityFormFieldsetTestHostComponent,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  it('preserves the radio option row contract', () => {
    const fixture = TestBed.createComponent(FormRadioLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.radio-option-row'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');

    // the internal development record: the row is 40px tall because of the radio's state
    // layer. Stretch-aligned, the 20px option tooltip sat 10px above its label.
    expect(styles.alignItems).toBe('center');
  });

  it('preserves the paragraph row alignment contract', () => {
    const fixture = TestBed.createComponent(FormParagraphLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.paragraph-layout-row'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
  });

  it('preserves direction-aware paragraph child spacing', () => {
    const fixture = TestBed.createComponent(FormParagraphLayoutTestHostComponent);
    fixture.detectChanges();

    const ltrFirst = getComputedStyle(fixture.nativeElement.querySelector('.ltr-first'));
    const ltrLast = getComputedStyle(fixture.nativeElement.querySelector('.ltr-last'));
    const rtlFirst = getComputedStyle(fixture.nativeElement.querySelector('.rtl-first'));
    const rtlLast = getComputedStyle(fixture.nativeElement.querySelector('.rtl-last'));

    expect(ltrFirst.marginRight).toBe('8px');
    expect(ltrFirst.marginLeft).toBe('0px');
    expect(ltrLast.marginRight).toBe('0px');
    expect(ltrLast.marginLeft).toBe('0px');

    expect(rtlFirst.marginLeft).toBe('8px');
    expect(rtlFirst.marginRight).toBe('0px');
    expect(rtlLast.marginLeft).toBe('0px');
    expect(rtlLast.marginRight).toBe('0px');
  });

  it('leaves a checkbox row without a gutter of its own', () => {
    const fixture = TestBed.createComponent(FormCheckboxSpacingTestHostComponent);
    fixture.detectChanges();

    const row = getComputedStyle(fixture.nativeElement.querySelector('.form-checkbox'));

    // A checkbox reserves no subscript and the state layer already pads the
    // label, so the 40px control plus its leading is the whole 48px row. The
    // 13px this used to add pitched a run of checkboxes at 61px.
    expect(row.marginBottom).toBe('0px');
    expect(row.paddingTop).toBe('0px');
    expect(row.paddingBottom).toBe('0px');
  });

  it('does not dress a checkbox input as a text field', () => {
    const fixture = TestBed.createComponent(FormCheckboxSpacingTestHostComponent);
    fixture.detectChanges();

    const input = getComputedStyle(fixture.nativeElement.querySelector('input'));

    // The removed rule was `input { padding: 10px 15px; border: 1px ...; }`. It
    // never matched in production -- mat-checkbox renders its native input from
    // its own template, out of reach of these emulated-encapsulation styles --
    // but scoped to a host that does own an input, it would inflate the row.
    expect(input.padding).toBe('0px');
    expect(input.display).not.toBe('block');
  });

  it('preserves the radio wrapper chrome that matches the 66px field pitch', () => {
    const fixture = TestBed.createComponent(FormRadioSpacingTestHostComponent);
    fixture.detectChanges();

    const wrapper = getComputedStyle(fixture.nativeElement.querySelector('.mat-radio'));

    // .84375em and .4375em against the inherited 12px. With the 45px option row
    // this holds an inline radio at 65.5px beside a 66px field in System ->
    // General, which is why these values are kept rather than rounded.
    expect(wrapper.borderTopWidth).toBe('10px');
    expect(wrapper.paddingTop).toBe('5.25px');

    // The shorthand always reset the 1.29688em padding-bottom declared above it,
    // so deleting that line changed nothing. This pins the resolved value, which
    // is what a padding-bottom re-added *after* the shorthand would break.
    expect(wrapper.paddingBottom).toBe('5.25px');

    // the internal development record: the option row carries the 5px (form-radio renders on spartan; the row is the unit).
    const option = getComputedStyle(fixture.nativeElement.querySelector('.radio-option-row'));
    expect(option.display).toBe('flex');
    expect(option.marginBottom).toBe('5px');

    // the internal development record: was 10px, which this test recorded without a reason
    // while the values above it record the 65.5px pitch. In the inline layout
    // .top is a *stretched* flex item, and stretch fills the line minus
    // margins -- so a 10px margin shortened the label's box and left its text
    // 11px above the radio it names. 13.3 aligns them to within a pixel.
    // Mirroring the option's own 5px above puts them on the same axis, and the
    // pitch those other assertions protect is unchanged: still 65.5px.
    const top = getComputedStyle(fixture.nativeElement.querySelector('.top'));
    expect(top.marginBottom).toBe('5px');
    expect(top.marginBottom).toBe(option.marginBottom);

    // align-self is inert outside a flex container, so the stacked layout
    // (System -> Email) keeps rendering its label above the options.
    expect(top.alignSelf).toBe('center');
  });

  it('keeps default-view fieldsets flush', () => {
    const fixture = TestBed.createComponent(EntityFormFieldsetTestHostComponent);
    fixture.detectChanges();

    const fieldset = getComputedStyle(fixture.nativeElement.querySelector('.fieldset'));

    // `margin: 24px 0` was declared here and then reset by a second copy of the
    // same selector five lines below, so fieldsets have always rendered flush.
    expect(fieldset.marginTop).toBe('0px');
    expect(fieldset.marginBottom).toBe('0px');
  });
});
