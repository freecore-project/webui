import { Pipe, PipeTransform } from '@angular/core';
import filesize from 'filesize';

type FileSizeOptions = Parameters<typeof filesize>[1];

@Pipe({
  standalone: false,
  name: 'filesize',
})
export class FileSizePipe implements PipeTransform {
  transform(value: number | number[], options?: FileSizeOptions): string | string[] {
    if (Array.isArray(value)) {
      return value.map((item) => FileSizePipe.transformOne(item, options));
    }

    return FileSizePipe.transformOne(value, options);
  }

  private static transformOne(value: number, options?: FileSizeOptions): string {
    return filesize(value, options);
  }
}
