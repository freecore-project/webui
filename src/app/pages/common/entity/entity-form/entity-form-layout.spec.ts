import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'entity-form-layout-test-host',
  template: `
    <div class="form-wrap">
      <div class="fieldset-container fieldset-display-default">
        <div class="entity-form-fieldset-layout fieldset entity-form-sized-fieldset"
          [class.entity-form-fieldset-layout-sized]="fieldsetWidth"
          [style.--entity-form-fieldset-width]="fieldsetWidth">
          <div class="entity-form-field-layout form-line entity-form-sized-line"
            [class.entity-form-field-layout-sized]="fieldWidth"
            [style.--entity-form-field-width]="fieldWidth"></div>
          <div class="entity-form-field-layout form-inline entity-form-sized-inline"
            [class.entity-form-field-layout-sized]="fieldWidth"
            [style.--entity-form-field-width]="fieldWidth"></div>
          <div class="entity-form-field-layout form-inline entity-form-unsized-inline"
            [class.entity-form-field-layout-sized]="missingWidth"
            [style.--entity-form-field-width]="missingWidth"></div>
        </div>
        <div class="entity-form-fieldset-layout fieldset entity-form-unsized-fieldset"
          [class.entity-form-fieldset-layout-sized]="missingWidth"
          [style.--entity-form-fieldset-width]="missingWidth"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-form.component.scss'],
})
class EntityFormLayoutTestHostComponent {
  fieldsetWidth = '40%';
  fieldWidth = '30%';
  missingWidth: string;
}

describe('Entity Form layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityFormLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves wrapping form and fieldset-container contracts', () => {
    const fixture = TestBed.createComponent(EntityFormLayoutTestHostComponent);
    fixture.detectChanges();

    const formStyles = getComputedStyle(fixture.nativeElement.querySelector('.form-wrap'));
    const containerStyles = getComputedStyle(fixture.nativeElement.querySelector('.fieldset-container'));

    expect(formStyles.display).toBe('flex');
    expect(formStyles.boxSizing).toBe('border-box');
    expect(formStyles.flexDirection).toBe('row');
    expect(formStyles.flexWrap).toBe('wrap');

    expect(containerStyles.display).toBe('flex');
    expect(containerStyles.flexDirection).toBe('row');
    expect(containerStyles.flexWrap).toBe('wrap');
  });

  it('preserves fieldset row, wrap, and start alignment', () => {
    const fixture = TestBed.createComponent(EntityFormLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-sized-fieldset'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
  });

  it('preserves configured gt-xs widths and field class ceilings', () => {
    const fixture = TestBed.createComponent(EntityFormLayoutTestHostComponent);
    fixture.detectChanges();

    expect(window.matchMedia('(min-width: 600px)').matches).toBeTrue();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-sized-fieldset'));
    const lineStyles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-sized-line'));
    const inlineStyles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-sized-inline'));

    expect(fieldsetStyles.flex).toBe('1 1 calc(40% - 16px)');
    expect(fieldsetStyles.minWidth).toBe('calc(40% - 16px)');
    expect(fieldsetStyles.maxWidth).toBe('none');

    expect(lineStyles.flex).toBe('1 1 calc(30% - 16px)');
    expect(lineStyles.minWidth).toBe('calc(30% - 16px)');
    expect(lineStyles.maxWidth).toBe('100%');

    expect(inlineStyles.flex).toBe('1 1 calc(30% - 16px)');
    expect(inlineStyles.minWidth).toBe('calc(30% - 16px)');
    expect(inlineStyles.maxWidth).toBe('33.33%');
  });

  it('preserves missing-width gt-xs fallbacks', () => {
    const fixture = TestBed.createComponent(EntityFormLayoutTestHostComponent);
    fixture.detectChanges();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-unsized-fieldset'));
    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.entity-form-unsized-inline'));

    expect(fieldsetStyles.flex).toBe('1 1 100%');
    expect(fieldsetStyles.minWidth).toBe('auto');
    expect(fieldsetStyles.maxWidth).toBe('none');

    expect(fieldStyles.flex).toBe('1 1 100%');
    expect(fieldStyles.minWidth).toBe('auto');
    expect(fieldStyles.maxWidth).toBe('33.33%');
  });

  it('retains xs ceilings and the exact Flex Layout boundary', () => {
    const fixture = TestBed.createComponent(EntityFormLayoutTestHostComponent);
    fixture.detectChanges();

    const componentStyles = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent || '')
      // the internal development record: the 15.2 settings specs inject freecore-ui.css (a `.fc-ui` layer that also
      // names this selector) into <head> for the whole run; take the component's own style, not that.
      .find((css) => css.includes('.entity-form-fieldset-layout') && !css.includes('.fc-ui'));

    expect(componentStyles).toContain('flex: 1 1 100%');
    expect(componentStyles).toContain('max-width: 100%');
    expect(componentStyles).toContain('@media (min-width: 600px)');
  });
});
