import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'directory-services-layout-test-host',
  template: `
    <div class="header">
      <h2 class="mat-mdc-dialog-title directory-services-title">Directory Services Monitor</h2>
      <button class="directory-services-refresh" id="refresh-icon" type="button"></button>
    </div>
    <table class="column-probe"><thead><tr><th class="directory-services-icon-column"></th><th></th><th></th></tr></thead></table>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./directory-services-monitor/directory-services-monitor.component.css'],
})
class DirectoryServicesLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'task-manager-layout-test-host',
  template: '<table class="column-probe"><thead><tr><th class="task-manager-state-column"></th><th></th><th></th></tr></thead></table>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-manager/task-manager.component.css'],
})
class TaskManagerLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'app-loader-layout-test-host',
  template: '<div class="console-action-row"></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../../services/app-loader/app-loader.component.css'],
})
class AppLoaderLayoutTestHostComponent {}

describe('status dialog layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        DirectoryServicesLayoutTestHostComponent,
        TaskManagerLayoutTestHostComponent,
        AppLoaderLayoutTestHostComponent,
      ],
    }).compileComponents();
  }));

  it('preserves the directory-services title row and icon-column contracts', () => {
    const fixture = TestBed.createComponent(DirectoryServicesLayoutTestHostComponent);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.header') as HTMLElement;
    const headerStyles = getComputedStyle(header);
    expect(headerStyles.display).toBe('flex');
    expect(headerStyles.boxSizing).toBe('border-box');
    expect(headerStyles.flexDirection).toBe('row');

    // the internal development record: no 90/10 split -- the title row carries the law's 24px gutter and the
    // Refresh button sits at its right edge (margin-left auto), on the same centred line as the h2.
    const title = fixture.nativeElement.querySelector('.directory-services-title') as HTMLElement;
    const refresh = fixture.nativeElement.querySelector('#refresh-icon') as HTMLElement;
    const headerRect = header.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const refreshRect = refresh.getBoundingClientRect();
    expect(headerStyles.alignItems).toBe('center');
    expect(headerStyles.paddingRight).toBe('24px');
    expect(getComputedStyle(title).padding).toBe('0px');
    expect(Math.round(titleRect.left)).toBe(Math.round(headerRect.left + 24));
    expect(Math.round(refreshRect.right)).toBe(Math.round(headerRect.right - 24));
    expect(titleRect.right).toBeLessThanOrEqual(refreshRect.left);
    expect(Math.abs((titleRect.top + titleRect.height / 2) - (refreshRect.top + refreshRect.height / 2))).toBeLessThanOrEqual(1);
    expectFixedHeaderColumn(fixture.nativeElement.querySelector('th.directory-services-icon-column'));
  });

  it('preserves the task-manager fixed state-column contract', () => {
    const fixture = TestBed.createComponent(TaskManagerLayoutTestHostComponent);
    fixture.detectChanges();

    expectFixedHeaderColumn(fixture.nativeElement.querySelector('th.task-manager-state-column'));
  });

  it('preserves the app-loader centered row contract', () => {
    const fixture = TestBed.createComponent(AppLoaderLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.console-action-row'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.justifyContent).toBe('center');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
  });
});

// the internal development record/#467: the dialog tables are native, fixed-layout tables -- a column takes its width from its
// header cell (the stand-in table mirrors the voice's layout: fixed, collapsed, the cell border-box and unpadded).
function expectFixedHeaderColumn(th: HTMLElement): void {
  const table = th.closest('table') as HTMLElement;
  Object.assign(table.style, { tableLayout: 'fixed', width: '400px', borderCollapse: 'collapse' });
  Object.assign(th.style, { padding: '0', boxSizing: 'border-box' });
  expect(getComputedStyle(th).width).toBe('74px');
  expect(th.getBoundingClientRect().width).toBe(74);
}
