import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'dynamic-list-layout-test-host',
  template: `
    <div class="dynamic-list-container dynamic-list-row-layout">
      <div class="move-to-action dynamic-list-move-action-layout">Move</div>
      <div class="dynamic-list-flex-content-layout">
        <div class="input-add dynamic-list-row-layout">
          <div class="dynamic-list-flex-content-layout">Input</div>
          <div>Button</div>
        </div>
        <div class="dynamic-list-row-layout">
          <div>List</div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dynamic-list.component.css'],
})
class DynamicListLayoutTestHostComponent {}

describe('iSCSI initiator dynamic-list layout', () => {
  let fixture: ComponentFixture<DynamicListLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DynamicListLayoutTestHostComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DynamicListLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('preserves all three row contracts', () => {
    const rows = fixture.nativeElement.querySelectorAll('.dynamic-list-row-layout');

    expect(rows.length).toBe(3);
    rows.forEach((row: Element) => {
      const styles = getComputedStyle(row);

      expect(styles.display).toBe('flex');
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flexDirection).toBe('row');
      expect(styles.flexWrap).toBe('nowrap');
      expect(styles.alignItems).toBe('normal');
      expect(styles.justifyContent).toBe('normal');
    });
  });

  it('preserves the centered move-action contract', () => {
    const styles = getComputedStyle(fixture.nativeElement.querySelector('.dynamic-list-move-action-layout'));

    expect(styles.display).toBe('block');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexGrow).toBe('0');
    expect(styles.flexShrink).toBe('1');
    expect(styles.flexBasis).toBe('auto');
    expect(styles.alignSelf).toBe('center');
    expect(styles.minWidth).toBe('auto');
    expect(styles.maxWidth).toBe('none');
  });

  it('preserves both full-width flexible wrapper contracts', () => {
    const wrappers = fixture.nativeElement.querySelectorAll('.dynamic-list-flex-content-layout');

    expect(wrappers.length).toBe(2);
    wrappers.forEach((wrapper: Element) => {
      const styles = getComputedStyle(wrapper);

      expect(styles.display).toBe('block');
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flexGrow).toBe('1');
      expect(styles.flexShrink).toBe('1');
      expect(styles.flexBasis).toBe('100%');
      expect(styles.alignSelf).toBe('auto');
      expect(styles.minWidth).toBe('auto');
      expect(styles.maxWidth).toBe('100%');
    });
  });
});
