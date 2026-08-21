import { Pipe, PipeTransform } from '@angular/core';
import { DocsService } from '../../../../../../services/docs.service';

@Pipe({
  standalone: false,
  name: 'docreplace',
})
export class TooltipDocReplacePipe implements PipeTransform {
  constructor(public docsService: DocsService) {}
  transform(message): string {
    return this.docsService.docReplace(message);
  }
}
