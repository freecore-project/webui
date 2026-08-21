import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'form-list-layout-test-host',
  template: `
    <div class="form-list-item-layout form-list-default">
      <div class="form-list-field-layout form-list-unsized"></div>
    </div>
    <div class="form-list-item-layout form-list-item-layout-wrap form-list-wrapped">
      <div class="form-list-field-layout form-list-field-layout-sized form-list-sized"
        style="--form-list-field-width: 30%"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-list.component.css'],
})
class FormListLayoutTestHostComponent {}

describe('form-list layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FormListLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves the default and full-width parent row contracts', () => {
    const fixture = TestBed.createComponent(FormListLayoutTestHostComponent);
    fixture.detectChanges();

    const defaultStyles = getComputedStyle(fixture.nativeElement.querySelector('.form-list-default'));
    const wrappedStyles = getComputedStyle(fixture.nativeElement.querySelector('.form-list-wrapped'));

    expect(defaultStyles.display).toBe('flex');
    expect(defaultStyles.boxSizing).toBe('border-box');
    expect(defaultStyles.flexDirection).toBe('row');
    expect(defaultStyles.flexWrap).toBe('nowrap');

    expect(wrappedStyles.display).toBe('flex');
    expect(wrappedStyles.boxSizing).toBe('border-box');
    expect(wrappedStyles.flexDirection).toBe('row');
    expect(wrappedStyles.flexWrap).toBe('wrap');
  });

  it('preserves the characterized unsized gt-xs field fallback', () => {
    const fixture = TestBed.createComponent(FormListLayoutTestHostComponent);
    fixture.detectChanges();

    expect(window.matchMedia('(min-width: 600px)').matches).toBeTrue();

    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.form-list-unsized'));

    expect(fieldStyles.flexGrow).toBe('1');
    expect(fieldStyles.flexShrink).toBe('1');
    expect(fieldStyles.flexBasis).toBe('100%');
    expect(fieldStyles.boxSizing).toBe('border-box');
    expect(fieldStyles.minWidth).toBe('auto');
    expect(fieldStyles.maxWidth).toBe('none');
  });

  it('preserves the characterized sized gt-xs field contract', () => {
    const fixture = TestBed.createComponent(FormListLayoutTestHostComponent);
    fixture.detectChanges();

    const fieldStyles = getComputedStyle(fixture.nativeElement.querySelector('.form-list-sized'));

    expect(fieldStyles.flexGrow).toBe('1');
    expect(fieldStyles.flexShrink).toBe('1');
    expect(fieldStyles.flexBasis).toBe('calc(30% - 16px)');
    expect(fieldStyles.boxSizing).toBe('border-box');
    expect(fieldStyles.minWidth).toBe('calc(30% - 16px)');
    expect(fieldStyles.maxWidth).toBe('none');
  });

  it('retains the base max-width and exact Flex Layout gt-xs boundary', () => {
    const fixture = TestBed.createComponent(FormListLayoutTestHostComponent);
    fixture.detectChanges();

    const componentStyles = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent || '')
      .find((css) => css.includes('.form-list-field-layout'));

    expect(componentStyles).toContain('max-width: 100%');
    expect(componentStyles).toContain('@media (min-width: 600px)');
  });
});
