import { Component, ChangeDetectionStrategy } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewControllerComponent } from './viewcontroller.component';

@Component({
  standalone: false,
  selector: 'display',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class DisplayStubComponent {}

describe('ViewControllerComponent', () => {
  let component: ViewControllerComponent;
  let fixture: ComponentFixture<ViewControllerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DisplayStubComponent, ViewControllerComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('preserves the wrapper flex-row contract', () => {
    const wrapper = fixture.nativeElement.querySelector('.view-controller-layout');
    const styles = getComputedStyle(wrapper);

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('space-around');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
    expect(styles.rowGap).toBe('normal');
    expect(styles.columnGap).toBe('normal');
  });

  it('keeps the one-child legacy gap behavior as a no-op', () => {
    const placeholder = fixture.nativeElement.querySelector('.view-controller-layout > display');
    const styles = getComputedStyle(placeholder);

    expect(styles.display).toBe('none');
    expect(styles.marginTop).toBe('0px');
    expect(styles.marginRight).toBe('0px');
    expect(styles.marginBottom).toBe('0px');
    expect(styles.marginLeft).toBe('0px');
  });
});
