import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'breadcrumb-layout-test-host',
  // the internal development record moved the copyright into the project footer; the bar no
  // longer carries a .copyright-txt child.
  template: '<div class="breadcrumb-bar"></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./breadcrumb/breadcrumb.component.css'],
})
class BreadcrumbLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'navigation-layout-test-host',
  template: `
    <div class="sidebar-panel fc-sidenav">
      <div class="sidebar-list-item">
        <div class="fc-nav-item__content">
          <div class="fc-nav-item__text">
            <a><span class="navigation-menu-spacer"></span></a>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./navigation/navigation.component.css'],
})
class NavigationLayoutTestHostComponent {}

describe('common chrome layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        BreadcrumbLayoutTestHostComponent,
        NavigationLayoutTestHostComponent,
      ],
    }).compileComponents();
  }));

  it('preserves the breadcrumb parent flex contract', () => {
    const fixture = TestBed.createComponent(BreadcrumbLayoutTestHostComponent);
    fixture.detectChanges();

    expectFlexRow(fixture, '.breadcrumb-bar');
  });

  it('preserves the navigation row and dropdown spacer contracts', () => {
    const fixture = TestBed.createComponent(NavigationLayoutTestHostComponent);
    fixture.detectChanges();

    expectFlexRow(fixture, 'a');
    expectDefaultFlexChild(fixture, '.navigation-menu-spacer');
  });
});

function expectFlexRow(fixture: ComponentFixture<unknown>, selector: string): void {
  const element = fixture.nativeElement.querySelector(selector);
  const styles = getComputedStyle(element);

  expect(styles.display).toBe('flex');
  expect(styles.boxSizing).toBe('border-box');
  expect(styles.flexDirection).toBe('row');
}

function expectDefaultFlexChild(fixture: ComponentFixture<unknown>, selector: string): void {
  const element = fixture.nativeElement.querySelector(selector);
  const styles = getComputedStyle(element);

  expect(styles.flexGrow).toBe('1');
  expect(styles.flexShrink).toBe('1');
  expect(styles.flexBasis).toBe('0%');
  expect(styles.boxSizing).toBe('border-box');
}
