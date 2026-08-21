import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'viewchartdonut-layout-test-host',
  template: `
    <section>
      <div class="viewchart-donut-root-layout">
        <div class="top-legend">
          <div class="legend-html top-row">
            <div class="legend-item">One</div>
            <div class="legend-item">Two</div>
            <div class="legend-item">Three</div>
          </div>
        </div>
        <div class="chart viewchart-donut-half-layout"></div>
        <div class="right-legend viewchart-donut-half-layout">
          <div class="legend-html right-row">
            <div class="legend-item viewchart-donut-right-item-layout">One</div>
            <div class="legend-item viewchart-donut-right-item-layout">Two</div>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../viewchart/viewchart-layout.css', './viewchartdonut-layout.scss'],
})
class ViewChartDonutLayoutTestHostComponent {}

describe('donut chart layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartDonutLayoutTestHostComponent],
    }).compileComponents();
  }));

  it('preserves the wrapping root alignment contract', () => {
    const fixture = TestBed.createComponent(ViewChartDonutLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.viewchart-donut-root-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('space-around');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
  });

  it('reuses the shared desktop legend row and gap contract', () => {
    const fixture = TestBed.createComponent(ViewChartDonutLayoutTestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.top-row');
    const styles = getComputedStyle(row);
    const items = row.querySelectorAll('.legend-item');
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('space-between');
    expect(styles.alignItems).toBe('stretch');
    expect(styles.alignContent).toBe('stretch');
    expect(getComputedStyle(items[0]).flex).toBe('0 1 auto');
    expect(getComputedStyle(items[0]).marginRight).toBe('16px');
    expect(getComputedStyle(items[1]).marginRight).toBe('16px');
    expect(getComputedStyle(items[2]).marginRight).toBe('0px');
  });

  it('moves legend gaps to the logical end in RTL', () => {
    const fixture = TestBed.createComponent(ViewChartDonutLayoutTestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.top-row');
    row.setAttribute('dir', 'rtl');
    const items = row.querySelectorAll('.legend-item');
    expect(getComputedStyle(items[0]).marginLeft).toBe('16px');
    expect(getComputedStyle(items[0]).marginRight).toBe('0px');
    expect(getComputedStyle(items[1]).marginLeft).toBe('16px');
    expect(getComputedStyle(items[2]).marginLeft).toBe('0px');
  });

  it('preserves chart, right-legend, and right-item sizing', () => {
    const fixture = TestBed.createComponent(ViewChartDonutLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    ['.chart', '.right-legend'].forEach((selector) => {
      const styles = getComputedStyle(root.querySelector(selector));
      expect(styles.boxSizing).withContext(selector).toBe('border-box');
      expect(styles.flex).withContext(selector).toBe('1 1 50%');
      expect(styles.minWidth).withContext(selector).toBe('auto');
      expect(styles.maxWidth).withContext(selector).toBe('50%');
    });

    const items = root.querySelectorAll('.viewchart-donut-right-item-layout');
    items.forEach((item) => {
      const styles = getComputedStyle(item);
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flex).toBe('1 1 100%');
      expect(styles.minWidth).toBe('auto');
      expect(styles.maxWidth).toBe('100%');
    });
    expect(getComputedStyle(items[0]).marginRight).toBe('16px');
    expect(getComputedStyle(items[1]).marginRight).toBe('0px');
  });

  it('preserves the exact xs top-item rule without narrowing right items', () => {
    const fixture = TestBed.createComponent(ViewChartDonutLayoutTestHostComponent);
    fixture.detectChanges();

    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
    const mediaRule = rules.find((rule) => rule.type === CSSRule.MEDIA_RULE
      && (rule as CSSMediaRule).conditionText.includes('min-width: 0px')
      && (rule as CSSMediaRule).conditionText.includes('max-width: 599.98px')
      && Array.from((rule as CSSMediaRule).cssRules).some((nestedRule) => nestedRule.type === CSSRule.STYLE_RULE
        && (nestedRule as CSSStyleRule).selectorText.includes('.legend-html')
        && (nestedRule as CSSStyleRule).selectorText.includes('.legend-item'))) as CSSMediaRule;
    const itemRule = Array.from(mediaRule.cssRules).find((rule) => rule.type === CSSRule.STYLE_RULE
      && (rule as CSSStyleRule).selectorText.includes('.legend-html')
      && (rule as CSSStyleRule).selectorText.includes('.legend-item')) as CSSStyleRule;

    expect(mediaRule).toBeTruthy();
    expect(itemRule.style.boxSizing).toBe('border-box');
    expect(itemRule.style.flex).toBe('1 1 calc(33% - 16px)');
    expect(itemRule.style.minWidth).toBe('calc(33% - 16px)');
    expect(itemRule.style.maxWidth).toBe('');

    const rightItem = getComputedStyle(fixture.nativeElement.querySelector('.viewchart-donut-right-item-layout'));
    expect(rightItem.flex).toBe('1 1 100%');
    expect(rightItem.maxWidth).toBe('100%');
  });
});
