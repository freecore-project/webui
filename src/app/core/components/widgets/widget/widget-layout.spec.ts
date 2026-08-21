import { Component, NO_ERRORS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'widget-layout-test-host',
  template: `
    <section [dir]="direction">
      <div class="fc-card front widget-base-front-layout">
        <div class="fc-card-header mat-card-toolbar widget-base-toolbar-layout">Toolbar</div>
        <div class="fc-card-content widget-base-content-layout">
          <viewchartdonut
            class="widget-base-chart-layout widget-base-donut-layout"
            style="display: none"
          ></viewchartdonut>
          <viewchartline class="widget-base-chart-layout widget-base-line-layout"></viewchartline>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./widget.component.scss'],
})
class WidgetLayoutTestHostComponent {
  direction = 'ltr';
}

describe('base widget layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetLayoutTestHostComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  it('preserves the front card row contract', () => {
    const fixture = TestBed.createComponent(WidgetLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.widget-base-front-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('space-between');
    expect(styles.alignItems).toBe('stretch');
    expect(styles.alignContent).toBe('stretch');
    expect(styles.maxHeight).toBe('100%');
  });

  it('preserves the toolbar alignment and sizing', () => {
    const fixture = TestBed.createComponent(WidgetLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.widget-base-toolbar-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flex).toBe('1 1 100%');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('space-between');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
    expect(styles.minWidth).toBe('auto');
    expect(styles.maxWidth).toBe('100%');
  });

  it('preserves the chart-content alignment and sizing', () => {
    const fixture = TestBed.createComponent(WidgetLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.widget-base-content-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flex).toBe('1 1 100%');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('center');
    expect(styles.alignItems).toBe('flex-start');
    expect(styles.alignContent).toBe('flex-start');
    expect(styles.minWidth).toBe('auto');
    expect(styles.maxWidth).toBe('100%');
  });

  it('preserves the hidden donut and line chart flex contracts', () => {
    const fixture = TestBed.createComponent(WidgetLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const donut = getComputedStyle(root.querySelector('.widget-base-donut-layout'));
    const line = getComputedStyle(root.querySelector('.widget-base-line-layout'));

    expect(donut.display).toBe('none');
    expect(donut.boxSizing).toBe('border-box');
    expect(donut.flex).toBe('1 1 100%');
    expect(donut.minWidth).toBe('0px');
    expect(donut.maxWidth).toBe('30%');

    expect(line.display).toBe('block');
    expect(line.boxSizing).toBe('border-box');
    expect(line.flex).toBe('1 1 100%');
    expect(line.alignSelf).toBe('flex-end');
    expect(line.minWidth).toBe('auto');
    expect(line.maxWidth).toBe('100%');
  });

  it('keeps percentage sizing and end alignment under RTL', () => {
    const fixture = TestBed.createComponent(WidgetLayoutTestHostComponent);
    fixture.componentInstance.direction = 'rtl';
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const toolbar = getComputedStyle(root.querySelector('.widget-base-toolbar-layout'));
    const donut = getComputedStyle(root.querySelector('.widget-base-donut-layout'));
    const line = getComputedStyle(root.querySelector('.widget-base-line-layout'));

    expect(toolbar.flex).toBe('1 1 100%');
    expect(toolbar.maxWidth).toBe('100%');
    expect(donut.maxWidth).toBe('30%');
    expect(line.maxWidth).toBe('100%');
    expect(line.alignSelf).toBe('flex-end');
  });
});
