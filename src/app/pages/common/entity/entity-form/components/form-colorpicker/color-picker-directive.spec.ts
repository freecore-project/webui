import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ColorPickerDirective } from 'ngx-color-picker';

@Component({
  standalone: false,
  selector: 'color-picker-directive-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <input
      [(colorPicker)]="color"
      [cpToggle]="open"
      cpOutputFormat="hex"
    >
  `,
})
class ColorPickerDirectiveTestHostComponent {
  @ViewChild(ColorPickerDirective, { static: true }) directive: ColorPickerDirective;

  color = '#123456';
  open = false;
}

describe('ColorPickerDirective', () => {
  let fixture: ComponentFixture<ColorPickerDirectiveTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ColorPickerDirective],
      declarations: [ColorPickerDirectiveTestHostComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ColorPickerDirectiveTestHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('preserves two-way color value propagation', () => {
    fixture.componentInstance.directive.colorChanged('#abcdef');
    fixture.detectChanges();

    expect(fixture.componentInstance.color).toBe('#abcdef');
  });

  it('creates and destroys the popup through the standalone directive', () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('color-picker')).not.toBeNull();

    fixture.destroy();
    expect(fixture.nativeElement.querySelector('color-picker')).toBeNull();
  });
});
