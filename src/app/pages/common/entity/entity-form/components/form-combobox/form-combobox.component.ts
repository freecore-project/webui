import { Component, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { BrnAutocompleteSearch } from '@spartan-ng/brain/autocomplete';
import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'form-combobox',
  styleUrls: ['form-combobox.component.scss', '../dynamic-field/dynamic-field.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './form-combobox.component.html',
})
export class FormComboboxComponent implements Field {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  textChanged: Subject<string> = new Subject<string>();

  /** the internal development record: the trigger lists every option until the user types again. */
  showAll = false;

  @ViewChild(BrnAutocompleteSearch) private autocomplete: BrnAutocompleteSearch<unknown>;

  /** The input's id, tied to the label's `for` (the config's own when set). */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }

  /** The search text mirrors the control: brain's search input writes `value` on writeValue but
   * leaves `search` at '', and its second effect then blanks the box -- so a pre-filled field
   * (NFS maproot user) would open empty. Binding `search` to the control closes that gap. */
  get searchText(): string {
    const value = this.group?.controls[this.config.name]?.value;
    return value === null || value === undefined ? '' : String(value);
  }

  /** What the list shows: every option from the trigger or while nothing is typed, else the search results. */
  get visibleOptions(): FieldConfig['options'] {
    const search = this.group?.controls[this.config.name]?.value;
    if (this.showAll || !search) {
      return this.config.options || [];
    }
    return this.config.searchOptions || [];
  }

  constructor(public translate: TranslateService) {
    this.textChanged
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((value) => this.updateSearchOptions(value));
  }

  toggleAll() {
    this.showAll = true;
    this.autocomplete?.toggle();
  }

  updateSearchOptions(value: string) {
    if (this.config.updater && this.config.parent) {
      if (this.config.updateLocal) {
        this.config.updater(value, this.config.parent, this.config);
      } else {
        this.config.updater(value, this.config.parent);
      }
    } else {
      value = (value || '').toLowerCase();
      const searchOptions = [];
      for (let i = 0; i < this.config.options.length; i++) {
        if (String(this.config.options[i].label).toLowerCase().includes(value)) {
          searchOptions.push(this.config.options[i]);
        }
      }
      this.config.searchOptions = searchOptions;
    }
  }

  searchChanged(text: string) {
    this.showAll = false;
    this.textChanged.next(text);
  }
}
