import { CommonModule } from '@angular/common';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewChartComponent } from './viewchart.component';

describe('ViewChartComponent', () => {
  let component: ViewChartComponent;
  let fixture: ComponentFixture<ViewChartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ViewChartComponent],
      imports: [CommonModule],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewChartComponent);
    component = fixture.componentInstance;
    component.chartLoaded = true;
    component.makeConfig();
    component.legend = [
      { name: 'One', value: 1, visible: true },
      { name: 'Two', value: 2, visible: true },
      { name: 'Three', value: 3, visible: true },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('preserves the desktop legend layout and spacing', () => {
    const legend = fixture.nativeElement.querySelector('.legend-html');
    const items = Array.from(legend.querySelectorAll('.legend-item')) as HTMLElement[];
    const styles = getComputedStyle(legend);

    expect(window.matchMedia('screen and (min-width: 0px) and (max-width: 599.98px)').matches).toBeFalse();
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('space-between');
    expect(styles.alignItems).toBe('stretch');
    expect(styles.alignContent).toBe('stretch');

    expect(getComputedStyle(items[0]).flex).toBe('0 1 auto');
    expect(getComputedStyle(items[0]).minWidth).toBe('auto');
    expect(getComputedStyle(items[0]).maxWidth).toBe('none');
    expect(getComputedStyle(items[0]).marginRight).toBe('16px');
    expect(getComputedStyle(items[1]).marginRight).toBe('16px');
    expect(getComputedStyle(items[2]).marginRight).toBe('0px');
  });

  it('preserves logical end spacing in rtl', () => {
    const legend = fixture.nativeElement.querySelector('.legend-html');
    const items = Array.from(legend.querySelectorAll('.legend-item')) as HTMLElement[];

    legend.setAttribute('dir', 'rtl');

    expect(getComputedStyle(items[0]).marginLeft).toBe('16px');
    expect(getComputedStyle(items[0]).marginRight).toBe('0px');
    expect(getComputedStyle(items[1]).marginLeft).toBe('16px');
    expect(getComputedStyle(items[2]).marginLeft).toBe('0px');
  });

  it('preserves the xs calc flex contract', () => {
    const topLevelRules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
    const mediaRule = topLevelRules.find((rule) => rule.type === CSSRule.MEDIA_RULE
      && (rule as CSSMediaRule).conditionText.includes('max-width: 599.98px')
      && Array.from((rule as CSSMediaRule).cssRules).some((nestedRule) => nestedRule.type === CSSRule.STYLE_RULE
        && (nestedRule as CSSStyleRule).selectorText.includes('.legend-html')
        && (nestedRule as CSSStyleRule).selectorText.includes('.legend-item'))) as CSSMediaRule;
    const itemRule = Array.from(mediaRule.cssRules).find((rule) => rule.type === CSSRule.STYLE_RULE
      && (rule as CSSStyleRule).selectorText.includes('.legend-html')
      && (rule as CSSStyleRule).selectorText.includes('.legend-item')) as CSSStyleRule;

    expect(mediaRule).toBeTruthy();
    expect(itemRule).toBeTruthy();
    expect(itemRule.style.boxSizing).toBe('border-box');
    expect(itemRule.style.flex).toBe('1 1 calc(33% - 16px)');
    expect(itemRule.style.minWidth).toBe('calc(33% - 16px)');
    expect(itemRule.style.maxWidth).toBe('');
  });
});
