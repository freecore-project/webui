import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UntypedFormGroup, AbstractControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { BrnAutocomplete } from '@spartan-ng/brain/autocomplete';
import { Subscription } from 'rxjs';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';

/**
 * the internal development record: the chip field on spartan. The renderer owns the array: values are pushed
 * into the control's own array in place (the quota forms alias it) and `setValue` is called on
 * add and remove, exactly as the Material renderer did. Enter is the only separator; the plain
 * branch also commits on blur; Backspace on an empty input focuses the last chip, Backspace or
 * Delete on a focused chip removes it; a pick from the suggestions pushes the option's label
 * without `setValue` (as `selected()` did).
 */
@Component({
  standalone: false,
  selector: 'form-chip',
  templateUrl: './form-chip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../dynamic-field/dynamic-field.css', './form-chip.component.css'],
})
export class FormChipComponent implements Field, OnInit, OnDestroy {
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  chipLists: any[];
  /** The typed text of the autocomplete branch (brain's search). */
  chipText = '';

  @ViewChild('chipInput') chipInput: ElementRef<HTMLInputElement>;
  @ViewChild(BrnAutocomplete) private autocomplete: BrnAutocomplete<unknown>;

  private subscription: Subscription;
  /** Capture-phase keydown on the host: at the target, capturing listeners run before brain's own
   * (bubbling) Enter handler, so the decision "commit the typed text" vs "let brain pick the
   * highlighted suggestion" is taken first and brain never sees an Enter it should not act on. */
  private readonly captureKeydown = (event: KeyboardEvent) => {
    if (event.target !== this.chipInput?.nativeElement) return;
    this.onKeydown(event);
  };

  constructor(public translate: TranslateService, private host: ElementRef<HTMLElement>) {
    this.host.nativeElement.addEventListener('keydown', this.captureKeydown, true);
  }

  get control(): AbstractControl {
    return this.group.controls[this.config.name];
  }

  /** The token input's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-input`;
  }

  get disabled(): boolean {
    return !!this.control?.disabled;
  }

  get invalid(): boolean {
    return !!this.config['hasErrors'] || !!(this.control?.invalid && this.control?.touched);
  }

  ngOnInit() {
    this.chipLists = this.control.value || [];
    this.subscription = this.control.valueChanges.subscribe(() => {
      if (this.chipLists !== this.control.value && typeof this.control.value === 'object') {
        this.chipLists = this.control.value;
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.host.nativeElement.removeEventListener('keydown', this.captureKeydown, true);
  }

  /** Enter commits the typed text (unless brain has a highlighted suggestion to pick); Backspace on
   * an empty input hands focus to the last chip (not on key repeat -- a held Backspace clearing a
   * typo must stop at the chips, as Material's did). In the autocomplete branch, Tab with an open
   * panel closes it without picking and Escape with a closed panel keeps the text -- Material's
   * contract, which brain would otherwise turn into a pick and a wipe. */
  onKeydown(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter') {
      if (this.autocomplete?.isExpanded() && this.autocomplete.keyManager.activeItem) {
        return; // brain's own Enter handler picks it
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      this.commitTyped();
    } else if (event.key === 'Backspace' && !event.repeat && !input.value && this.chipLists.length && !this.disabled) {
      const rows = this.host.nativeElement.querySelectorAll<HTMLElement>('.form-chip-row');
      rows[rows.length - 1]?.focus();
    } else if (event.key === 'Tab' && this.autocomplete?.isExpanded()) {
      event.stopImmediatePropagation();
      this.autocomplete.close();
    } else if (event.key === 'Escape' && this.autocomplete && !this.autocomplete.isExpanded()) {
      event.stopImmediatePropagation();
    }
  }

  /** Backspace (not on repeat) or Delete on a focused chip removes it and returns focus to the input. */
  onChipKeydown(event: KeyboardEvent, item: any) {
    if (((event.key === 'Backspace' && !event.repeat) || event.key === 'Delete') && !this.disabled) {
      event.preventDefault();
      this.remove(item);
      this.chipInput?.nativeElement.focus();
    }
  }

  /** The typed text becomes a chip; an open suggestion panel closes with it. */
  commitTyped() {
    if (this.disabled) return;
    const input = this.chipInput?.nativeElement;
    const value = (input?.value || '').trim();
    if (value) {
      this.chipLists.push(value);
      this.control.setValue(this.chipLists);
    }
    this.clearText();
    this.autocomplete?.close();
  }

  remove(item: any): void {
    const index = this.chipLists.indexOf(item);
    if (index >= 0) {
      this.chipLists.splice(index, 1);
      this.control.setValue(this.chipLists);
    }
  }

  touch() {
    this.control.markAsTouched();
  }

  /** A suggestion was picked: its label joins the chips (in place, no setValue -- the quota forms
   * read the aliased array themselves) and the text clears. brain re-emits null on the clear. */
  onPick(value: unknown) {
    if (value === null || value === undefined) return;
    const option = (this.config.searchOptions || []).find((o) => o.value === value);
    this.chipLists.push(option ? option.label : value);
    this.clearText();
  }

  /** brain mirrors the typed text here (and '' on a clear); the suggestions are fed from the
   * input event itself, so a clear after a pick does not query the updater. */
  onSearch(text: string) {
    this.chipText = text;
  }

  private clearText() {
    if (this.chipInput) this.chipInput.nativeElement.value = '';
    this.chipText = '';
    this.autocomplete?.resetValue();
  }

  updateSearchOptions(value) {
    if (this.config.updater && this.config.parent) {
      if (this.config.updateLocal) {
        this.config.updater(value, this.config.parent, this.config);
      } else {
        this.config.updater(value, this.config.parent);
      }
    } else {
      value = (value || '').toLowerCase();
      const searchOptions = [];
      for (let i = 0; i < (this.config.options || []).length; i++) {
        if (this.config.options[i].label.toLowerCase().includes(value)) {
          searchOptions.push(this.config.options[i]);
        }
      }
      this.config.searchOptions = searchOptions;
    }
  }
}
