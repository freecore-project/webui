import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'form-ipwithnetmask-layout-test-host',
  template: `
    <div class="ip-with-netmask-layout" [dir]="direction">
      <div class="ip-with-netmask-hidden-layout" style="display:none"></div>
      <div class="ip-with-netmask-address-layout"></div>
      <span class="ip-with-netmask-divider-layout">/</span>
      @if (!preset) {
        <div class="ip-with-netmask-select-layout standard-select"></div>
      }
      @if (preset) {
        <div class="ip-with-netmask-select-layout preset-select"></div>
      }
      @if (tooltip) {
        <div class="ip-with-netmask-tooltip-layout"></div>
      }
      <div class="margin-for-error"></div>
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-ipwithnetmask-layout.css'],
})
class FormIpWithNetmaskLayoutTestHostComponent {
  direction = 'ltr';
  preset = false;
  tooltip = true;
}

describe('IP-with-netmask field layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FormIpWithNetmaskLayoutTestHostComponent],
      imports: [CommonModule],
    }).compileComponents();
  }));

  it('preserves the aligned single-row container contract', () => {
    const fixture = TestBed.createComponent(FormIpWithNetmaskLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-layout'));

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
  });

  it('preserves the flexible address-field sizing', () => {
    const fixture = TestBed.createComponent(FormIpWithNetmaskLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-address-layout'));

    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flex).toBe('1 1 100%');
    expect(styles.minWidth).toBe('auto');
    expect(styles.maxWidth).toBe('100%');
  });

  it('preserves the fixed divider, select, and tooltip sizing', () => {
    const fixture = TestBed.createComponent(FormIpWithNetmaskLayoutTestHostComponent);
    fixture.detectChanges();

    const divider = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-divider-layout'));
    const select = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-select-layout'));
    const tooltip = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-tooltip-layout'));

    expect([divider.flex, divider.minWidth, divider.maxWidth]).toEqual(['1 1 4px', '4px', '4px']);
    expect([select.flex, select.minWidth, select.maxWidth]).toEqual(['1 1 72px', '72px', '72px']);
    expect([tooltip.flex, tooltip.minWidth, tooltip.maxWidth]).toEqual(['1 1 48px', '48px', '48px']);
  });

  it('preserves visible sibling gaps across conditional states', () => {
    const fixture = TestBed.createComponent(FormIpWithNetmaskLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    expect(getComputedStyle(root.querySelector('.ip-with-netmask-hidden-layout')).marginRight).toBe('0px');
    expect(getComputedStyle(root.querySelector('.ip-with-netmask-address-layout')).marginRight).toBe('8px');
    expect(getComputedStyle(root.querySelector('.ip-with-netmask-divider-layout')).marginRight).toBe('8px');
    expect(getComputedStyle(root.querySelector('.standard-select')).marginRight).toBe('8px');
    expect(getComputedStyle(root.querySelector('.ip-with-netmask-tooltip-layout')).marginRight).toBe('8px');
    expect(getComputedStyle(root.querySelector('.margin-for-error')).marginRight).toBe('0px');

    fixture.componentInstance.preset = true;
    fixture.componentInstance.tooltip = false;
    fixture.detectChanges();

    expect(root.querySelector('.standard-select')).toBeNull();
    expect(getComputedStyle(root.querySelector('.preset-select')).marginRight).toBe('8px');
    expect(root.querySelector('.ip-with-netmask-tooltip-layout')).toBeNull();
  });

  it('moves the sibling gaps to the logical end in RTL', () => {
    const fixture = TestBed.createComponent(FormIpWithNetmaskLayoutTestHostComponent);
    fixture.componentInstance.direction = 'rtl';
    fixture.detectChanges();

    const address = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-address-layout'));
    const tooltip = getComputedStyle(fixture.nativeElement.querySelector('.ip-with-netmask-tooltip-layout'));

    expect(address.marginLeft).toBe('8px');
    expect(address.marginRight).toBe('0px');
    expect(tooltip.marginLeft).toBe('8px');
    expect(tooltip.marginRight).toBe('0px');
  });
});
