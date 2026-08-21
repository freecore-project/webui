import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { Display, DisplayContainer } from './display.component';

@Component({
  standalone: false,
  selector: 'display-test-child',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<span>Dynamic child</span>',
})
class DisplayTestChildComponent {}

@Component({
  standalone: false,
  selector: 'display-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<display #display></display>',
})
class DisplayTestHostComponent {
  @ViewChild('display', { static: true }) display: Display;
}

describe('Display dynamic component lifecycle', () => {
  let fixture: ComponentFixture<DisplayTestHostComponent>;
  let display: Display;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        Display,
        DisplayContainer,
        DisplayTestChildComponent,
        DisplayTestHostComponent,
      ],
    })
      .overrideComponent(Display, {
        set: {
          template: '<ng-container #test></ng-container><div displayContainer #wrapper></div>',
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayTestHostComponent);
    fixture.detectChanges();
    display = fixture.componentInstance.display;
  });

  it('keeps creation detached until addChild and destroys the inserted child', () => {
    const instance = display.create(DisplayTestChildComponent);
    const componentRef = display.getChild(instance);

    expect(componentRef).toBeTruthy();
    expect(fixture.nativeElement.querySelector('display-test-child')).toBeNull();
    expect(display.displayList).toEqual([]);

    display.addChild(instance);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('display-test-child').textContent.trim()).toBe('Dynamic child');
    expect(display.displayList).toEqual([instance]);

    display.removeChild(instance);
    fixture.detectChanges();

    expect(componentRef.hostView.destroyed).toBe(true);
    expect(fixture.nativeElement.querySelector('display-test-child')).toBeNull();
    expect(display.children).toEqual([]);
    expect(display.displayList).toEqual([]);
  });
});
