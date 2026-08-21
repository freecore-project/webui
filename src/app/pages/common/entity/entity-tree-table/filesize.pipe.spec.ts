import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FileSizePipe } from './filesize.pipe';

@Component({
  standalone: false,
  selector: 'filesize-pipe-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '{{ (value || 0) | filesize : { standard: "iec" } }}',
})
class FileSizePipeTestHostComponent {
  value: number;
}

describe('FileSizePipe', () => {
  it('preserves scalar formatting and option forwarding', () => {
    const pipe = new FileSizePipe();

    expect(pipe.transform(500)).toBe('500 B');
    expect(pipe.transform(265318, { standard: 'iec' })).toBe('259.1 KiB');
  });

  it('preserves array order and applies the same options to every value', () => {
    const pipe = new FileSizePipe();
    const values = [0, 1024, 265318];
    const options = { standard: 'iec' } as const;

    expect(pipe.transform(values, options)).toEqual(['0 B', '1 KiB', '259.1 KiB']);
  });
});

describe('FileSizePipe Entity TreeTable expression', () => {
  let fixture: ComponentFixture<FileSizePipeTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FileSizePipe, FileSizePipeTestHostComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileSizePipeTestHostComponent);
  });

  it('renders IEC values and the existing zero fallback', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('0 B');

    fixture.componentInstance.value = 265318;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('259.1 KiB');
  });
});
