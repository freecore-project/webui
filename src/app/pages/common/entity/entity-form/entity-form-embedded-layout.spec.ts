import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'entity-form-embedded-layout-test-host',
  template: `
    <div class="fieldset-container fieldset-display-default embedded-default">
      <div class="entity-form-embedded-fieldset-layout fieldset embedded-sized-fieldset"
        [class.entity-form-embedded-fieldset-layout-sized]="fieldsetWidth"
        [style.--entity-form-embedded-fieldset-width]="fieldsetWidth">
        <div class="entity-form-embedded-field-layout form-line embedded-sized-field"
          [class.entity-form-embedded-field-layout-sized]="fieldWidth"
          [style.--entity-form-embedded-field-width]="fieldWidth"></div>
        <div class="entity-form-embedded-field-layout form-line embedded-unsized-field"
          [class.entity-form-embedded-field-layout-sized]="missingWidth"
          [style.--entity-form-embedded-field-width]="missingWidth"></div>
      </div>
      <div class="entity-form-embedded-fieldset-layout fieldset embedded-unsized-fieldset"
        [class.entity-form-embedded-fieldset-layout-sized]="missingWidth"
        [style.--entity-form-embedded-fieldset-width]="missingWidth"></div>
      <div class="entity-form-embedded-fieldset-layout fieldset hidden embedded-hidden-fieldset"></div>
    </div>
    <div class="fieldset-container fieldset-display-carousel embedded-carousel"></div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-form-embedded.component.css'],
})
class EntityFormEmbeddedLayoutTestHostComponent {
  fieldsetWidth = '40%';
  fieldWidth = '30%';
  missingWidth: string;
}

describe('embedded Entity Form layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityFormEmbeddedLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves default and carousel container contracts', () => {
    const fixture = TestBed.createComponent(EntityFormEmbeddedLayoutTestHostComponent);
    fixture.detectChanges();

    const defaultStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-default'));
    const carouselStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-carousel'));

    expect(defaultStyles.display).toBe('flex');
    expect(defaultStyles.boxSizing).toBe('border-box');
    expect(defaultStyles.flexDirection).toBe('row');
    expect(defaultStyles.flexWrap).toBe('wrap');
    expect(parseFloat(carouselStyles.width)).toBe(2 * parseFloat(defaultStyles.width));
  });

  it('preserves fieldset row, wrap, and start alignment', () => {
    const fixture = TestBed.createComponent(EntityFormEmbeddedLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-sized-fieldset'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
  });

  it('preserves configured gt-xs fieldset and field widths', () => {
    const fixture = TestBed.createComponent(EntityFormEmbeddedLayoutTestHostComponent);
    fixture.detectChanges();

    expect(window.matchMedia('(min-width: 600px)').matches).toBeTrue();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-sized-fieldset'));
    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-sized-field'));

    expect(fieldsetStyles.flex).toBe('1 1 calc(40% - 16px)');
    expect(fieldsetStyles.minWidth).toBe('calc(40% - 16px)');
    expect(fieldsetStyles.maxWidth).toBe('none');

    expect(fieldStyles.flex).toBe('1 1 calc(30% - 16px)');
    expect(fieldStyles.boxSizing).toBe('border-box');
    expect(fieldStyles.minWidth).toBe('calc(30% - 16px)');
    expect(fieldStyles.maxWidth).toBe('none');
    expect(fieldStyles.margin).toBe('8px');
  });

  it('preserves missing-width gt-xs fallbacks', () => {
    const fixture = TestBed.createComponent(EntityFormEmbeddedLayoutTestHostComponent);
    fixture.detectChanges();

    const fieldsetStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-unsized-fieldset'));
    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-unsized-field'));

    expect(fieldsetStyles.flex).toBe('1 1 100%');
    expect(fieldsetStyles.minWidth).toBe('auto');
    expect(fieldsetStyles.maxWidth).toBe('none');

    expect(fieldStyles.flex).toBe('1 1 100%');
    expect(fieldStyles.minWidth).toBe('auto');
    expect(fieldStyles.maxWidth).toBe('none');
  });

  it('retains hidden mode, xs ceilings, and the exact Flex Layout boundary', () => {
    const fixture = TestBed.createComponent(EntityFormEmbeddedLayoutTestHostComponent);
    fixture.detectChanges();

    const hiddenStyles = getComputedStyle(fixture.nativeElement.querySelector('.embedded-hidden-fieldset'));
    const componentStyles = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent || '')
      .find((css) => css.includes('.entity-form-embedded-fieldset-layout'));

    expect(hiddenStyles.display).toBe('none');
    expect(componentStyles).toContain('flex: 1 1 100%');
    expect(componentStyles).toContain('max-width: 100%');
    expect(componentStyles).toContain('@media (min-width: 600px)');
  });
});
