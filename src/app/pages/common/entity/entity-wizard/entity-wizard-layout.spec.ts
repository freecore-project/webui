import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'entity-wizard-layout-test-host',
  template: `
    <div class="form-wrap">
      <div class="entity-wizard-fieldset-layout fieldset wizard-sized-fieldset"
        [class.entity-wizard-fieldset-layout-sized]="fieldsetWidth"
        [style.--entity-wizard-fieldset-width]="fieldsetWidth">
        <div class="entity-wizard-field-layout form-line wizard-sized-line"
          [class.entity-wizard-field-layout-sized]="fieldWidth"
          [style.--entity-wizard-field-width]="fieldWidth"></div>
        <div class="entity-wizard-field-layout form-inline wizard-sized-inline"
          [class.entity-wizard-field-layout-sized]="fieldWidth"
          [style.--entity-wizard-field-width]="fieldWidth"></div>
        <div class="entity-wizard-field-layout form-inline wizard-unsized-inline"
          [class.entity-wizard-field-layout-sized]="missingWidth"
          [style.--entity-wizard-field-width]="missingWidth"></div>
      </div>
      <div class="entity-wizard-fieldset-layout fieldset wizard-unsized-fieldset"
        [class.entity-wizard-fieldset-layout-sized]="missingWidth"
        [style.--entity-wizard-fieldset-width]="missingWidth"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-wizard.component.css', '../entity-form/entity-form.component.scss'],
})
class EntityWizardLayoutTestHostComponent {
  fieldsetWidth = '40%';
  fieldWidth = '30%';
  missingWidth: string;
}

describe('Entity Wizard layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityWizardLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves the wrapping form parent contract', () => {
    const fixture = TestBed.createComponent(EntityWizardLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.form-wrap'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
  });

  it('preserves fieldset row, wrap, and start alignment', () => {
    const fixture = TestBed.createComponent(EntityWizardLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-sized-fieldset'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
  });

  it('preserves configured gt-xs widths and field class ceilings', () => {
    const fixture = TestBed.createComponent(EntityWizardLayoutTestHostComponent);
    fixture.detectChanges();

    expect(window.matchMedia('(min-width: 600px)').matches).toBeTrue();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-sized-fieldset'));
    const lineStyles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-sized-line'));
    const inlineStyles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-sized-inline'));

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
    const fixture = TestBed.createComponent(EntityWizardLayoutTestHostComponent);
    fixture.detectChanges();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-unsized-fieldset'));
    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.wizard-unsized-inline'));

    expect(fieldsetStyles.flex).toBe('1 1 100%');
    expect(fieldsetStyles.minWidth).toBe('auto');
    expect(fieldsetStyles.maxWidth).toBe('none');

    expect(fieldStyles.flex).toBe('1 1 100%');
    expect(fieldStyles.minWidth).toBe('auto');
    expect(fieldStyles.maxWidth).toBe('33.33%');
  });

  it('retains xs ceilings and the exact Flex Layout boundary', () => {
    const fixture = TestBed.createComponent(EntityWizardLayoutTestHostComponent);
    fixture.detectChanges();

    const componentStyles = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent || '')
      .find((css) => css.includes('.entity-wizard-fieldset-layout'));

    expect(componentStyles).toContain('flex: 1 1 100%');
    expect(componentStyles).toContain('max-width: 100%');
    expect(componentStyles).toContain('@media (min-width: 600px)');
  });
});
