import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

@Component({
  standalone: false,
  selector: 'unlock-dialog-layout-test-host',
  template: `
    <hlm-separator />
    <p>Unlocked</p>
    <div class="row">
      <strong>tank/data</strong>
      <span class="dataset-row-spacer"></span>
      <a>details</a>
      <i>cancel</i>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./unlock-dialog.component.css'],
})
class UnlockDialogLayoutTestHostComponent {}

describe('unlock dialog result row layout', () => {
  let fixture: ComponentFixture<UnlockDialogLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [UnlockDialogLayoutTestHostComponent],
      imports: [HlmSeparatorImports],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UnlockDialogLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('preserves the implicit parent row contract', () => {
    const styles = getComputedStyle(fixture.nativeElement.querySelector('.row'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.alignItems).toBe('normal');
    expect(styles.justifyContent).toBe('normal');
  });

  it('preserves the former flexible spacer contract', () => {
    const styles = getComputedStyle(fixture.nativeElement.querySelector('.dataset-row-spacer'));

    expect(styles.display).toBe('block');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexGrow).toBe('1');
    expect(styles.flexShrink).toBe('1');
    expect(styles.flexBasis).toBe('0%');
    expect(styles.minWidth).toBe('auto');
    expect(styles.maxWidth).toBe('none');
  });

  it('draws the section hairline in the line token with the old 8px under it (the internal development record)', () => {
    document.documentElement.style.setProperty('--line', '#2A353D');
    fixture.detectChanges();
    const line: HTMLElement = fixture.nativeElement.querySelector('hlm-separator');
    const next: HTMLElement = fixture.nativeElement.querySelector('p');
    const styles = getComputedStyle(line);
    // the old divider's box: a 1px line on top of 8px of clear padding, block-level, no margin to collapse
    expect(styles.display).toBe('block');
    expect(line.getBoundingClientRect().height).toBe(9);
    expect(styles.backgroundColor).toBe('rgb(42, 53, 61)');
    expect(styles.backgroundClip).toBe('content-box');
    expect(styles.paddingBottom).toBe('8px');
    expect(next.getBoundingClientRect().top - line.getBoundingClientRect().top).toBe(9 + parseFloat(getComputedStyle(next).marginTop));
    expect(fixture.nativeElement.querySelector('mat-divider')).toBeNull();
    document.documentElement.style.removeProperty('--line');
  });
});
