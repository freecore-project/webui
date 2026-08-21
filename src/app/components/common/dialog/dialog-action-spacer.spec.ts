import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'dialog-action-spacer-test-host',
  template: `
    <div class="dialog-actions-test-host">
      <span class="dialog-action-spacer"></span>
      <button>Action</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    '.dialog-actions-test-host { display: flex; width: 320px; }',
  ],
})
class DialogActionSpacerTestHostComponent {}

describe('dialog action spacer', () => {
  let fixture: ComponentFixture<DialogActionSpacerTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DialogActionSpacerTestHostComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogActionSpacerTestHostComponent);
    fixture.detectChanges();
  });

  it('matches the former default fxFlex contract', () => {
    const spacer = fixture.nativeElement.querySelector('.dialog-action-spacer');
    const styles = getComputedStyle(spacer);

    expect(styles.flexGrow).toBe('1');
    expect(styles.flexShrink).toBe('1');
    expect(styles.flexBasis).toBe('0%');
    expect(styles.boxSizing).toBe('border-box');
  });
});
