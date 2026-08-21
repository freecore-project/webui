import { OverlayContainer } from '@angular/cdk/overlay';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BrnAutocompleteAnchor, BrnAutocompleteInput } from '@spartan-ng/brain/autocomplete';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormChipComponent } from './form-chip.component';

// the internal development record: the chip field composed by hand on spartan -- the #351 box holding badge
// chips and the token input; the array contract the consumers rely on. Fallback ladder: line
// #2A353D, bg1 #10151A, fg1 #DCE3E6, fg2 #97A6AE, red #E3625A.
describe('form-chip on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormChipComponent>;
  let component: FormChipComponent;
  let group: UntypedFormGroup;
  let overlay: OverlayContainer;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const input = (): HTMLInputElement => q('.form-chip-input') as HTMLInputElement;
  const chips = (): string[] => qa('.form-chip-row .form-chip-text').map((el) => el.textContent.trim());
  const items = (): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll('hlm-autocomplete-item')) as HTMLElement[];
  const flush = async (): Promise<void> => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const KEY_CODES = { Enter: 13, Backspace: 8, Delete: 46, ArrowDown: 40, Tab: 9, Escape: 27 };
  const key = (el: HTMLElement, k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    // the CDK key manager switches on keyCode, brain on key: send both
    const e = new KeyboardEvent('keydown', { key: k, keyCode: KEY_CODES[k], bubbles: true, cancelable: true, ...init } as KeyboardEventInit);
    el.dispatchEvent(e);
    return e;
  };
  const type = (text: string): void => { input().value = text; input().dispatchEvent(new Event('input', { bubbles: true })); };

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl([])): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'chip', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormChipComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), HlmAutocompleteImports, BrnAutocompleteAnchor, BrnAutocompleteInput, HlmBadgeImports, HlmFieldImports, HlmInputGroupImports, HlmLabelImports],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormChipComponent);
    component = fixture.componentInstance;
    overlay = TestBed.inject(OverlayContainer);
    fixture.nativeElement.style.width = '600px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
    fixture.nativeElement.style.fontFamily = '"IBM Plex Sans", sans-serif';
  });

  afterEach(() => overlay.ngOnDestroy());

  it('draws the #351 box at 32px when empty (72px pitch), labelled, with the hooks the pages key on', () => {
    mount({ name: 'nameservers', placeholder: 'Nameservers', required: true });
    const box = q('.form-chip-box');
    expect(q('label').textContent.trim()).toBe('Nameservers');
    expect(q('label').getAttribute('for')).toBe('nameservers-input');
    expect(input().id).toBe('nameservers-input');
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(box.getAttribute('ix-auto')).toBe('input__Nameservers');
    expect(box.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(16, 21, 26)');
    expect(getComputedStyle(box).borderTopLeftRadius).toBe('6px');
    expect(q('hlm-field').getBoundingClientRect().height).toBe(72);
    expect(q('mat-chip-grid')).toBeNull();
    expect(q('mat-form-field')).toBeNull();
  });

  it('renders each value as a 20px chip on the #218 tokens with a remove glyph, and grows to a second row', () => {
    mount({ name: 'aliases', placeholder: 'Aliases' }, new UntypedFormControl(['one', 'two']));
    expect(chips()).toEqual(['one', 'two']);
    const chip = q('.form-chip-row');
    const style = getComputedStyle(chip);
    expect(chip.getAttribute('data-slot')).toBe('badge');
    expect(chip.getBoundingClientRect().height).toBe(20);
    expect(style.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(style.color).toBe('rgb(220, 227, 230)');
    expect(style.fontWeight).toBe('400');
    expect(style.fontSize).toBe('12px');
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(10);
    expect(getComputedStyle(q('.form-chip-remove')).color).toBe('rgb(151, 166, 174)');
    expect(q('.form-chip-box').getBoundingClientRect().height).toBe(32);
    group.controls.aliases.setValue(Array.from({ length: 12 }, (_, i) => `a-long-alias-value-${i}`));
    fixture.detectChanges();
    expect(chips().length).toBe(12);
    expect(q('.form-chip-box').getBoundingClientRect().height).toBeGreaterThan(32);
  });

  it('adds on Enter and on blur (plain branch), in place into the control\'s own array, and removes by the glyph', () => {
    const list = ['a'];
    mount({ name: 'aliases', placeholder: 'Aliases' }, new UntypedFormControl(list));
    let changes = 0;
    group.controls.aliases.valueChanges.subscribe(() => changes++);
    type(' b ');
    const e = key(input(), 'Enter');
    fixture.detectChanges();
    expect(e.defaultPrevented).toBeTrue();
    expect(list).toEqual(['a', 'b']); // the same array object, mutated in place
    expect(group.controls.aliases.value).toBe(list);
    expect(changes).toBe(1);
    expect(input().value).toBe('');
    type('c');
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(list).toEqual(['a', 'b', 'c']);
    expect(group.controls.aliases.touched).toBeTrue();
    (qa('.form-chip-remove')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(list).toEqual(['a', 'c']);
    expect(chips()).toEqual(['a', 'c']);
    expect(changes).toBe(3);
  });

  it('Backspace on an empty input focuses the last chip; Backspace or Delete on the chip removes it; a held key does neither', () => {
    mount({ name: 'aliases', placeholder: 'Aliases', id: 'selected-entries_chiplist' } as Partial<FieldConfig>, new UntypedFormControl(['a', 'b', 'a']));
    expect(input().id).toBe('selected-entries_chiplist'); // config.id wins, as on the quota forms
    input().focus();
    key(input(), 'Backspace', { repeat: true });
    expect(document.activeElement).toBe(input()); // auto-repeat clearing a typo stops at the chips
    key(input(), 'Backspace');
    fixture.detectChanges();
    expect(chips()).toEqual(['a', 'b', 'a']); // nothing removed yet
    const last = qa('.form-chip-row')[2];
    expect(document.activeElement).toBe(last);
    key(last, 'Backspace', { repeat: true });
    fixture.detectChanges();
    expect(chips()).toEqual(['a', 'b', 'a']);
    key(last, 'Backspace');
    fixture.detectChanges();
    expect(chips()).toEqual(['b', 'a']); // indexOf: the first equal value goes, as before
    expect(document.activeElement).toBe(input());
    key(qa('.form-chip-row')[0], 'Delete');
    fixture.detectChanges();
    expect(chips()).toEqual(['a']);
    expect(group.controls.aliases.value).toEqual(['a']);
  });

  it('a disabled field commits nothing on Enter or blur and keeps focus off the chips', () => {
    mount({ name: 'aliases', placeholder: 'Aliases' }, new UntypedFormControl(['a']));
    group.controls.aliases.disable();
    fixture.detectChanges();
    input().value = 'x';
    key(input(), 'Enter');
    input().dispatchEvent(new Event('blur'));
    key(input(), 'Backspace');
    fixture.detectChanges();
    expect(group.controls.aliases.value).toEqual(['a']);
    expect(document.activeElement).not.toBe(qa('.form-chip-row')[0]);
  });

  it('paints a chip the quota forms mark .chip-warn in red, and the mark dies with its chip on removal', () => {
    fixture.nativeElement.classList.add('fc-ui');
    document.documentElement.style.setProperty('--red', '#e3625a');
    try {
      const list = ['bogus', 'root'];
      mount({ name: 'searched_entries', placeholder: 'User', autocomplete: true, searchOptions: [] } as Partial<FieldConfig>, new UntypedFormControl(list));
      qa('.form-chip-row')[0].classList.add('chip-warn'); // what user-quota-form does from outside
      expect(getComputedStyle(qa('.form-chip-row')[0]).backgroundColor).toBe('rgb(227, 98, 90)');
      expect(getComputedStyle(qa('.form-chip-row')[0].querySelector('.form-chip-remove')).color).toBe('rgb(255, 255, 255)');
      (qa('.form-chip-remove')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(chips()).toEqual(['root']);
      expect(q('.form-chip-row.chip-warn')).toBeNull(); // views are keyed by value, the mark did not shift
    } finally {
      document.documentElement.style.removeProperty('--red');
    }
  });

  it('follows the control: disabled hides the input and the remove glyphs; invalid + touched paints the box red', () => {
    mount({ name: 'aliases', placeholder: 'Aliases', required: true }, new UntypedFormControl(['a'], Validators.required));
    group.controls.aliases.disable();
    fixture.detectChanges();
    expect(q('.form-chip-box').classList).toContain('form-chip-disabled');
    expect(input().disabled).toBeTrue();
    expect(q('.form-chip-remove')).toBeNull();
    group.controls.aliases.enable();
    group.controls.aliases.setValue([]);
    group.controls.aliases.markAsTouched();
    fixture.detectChanges();
    expect(q('.form-chip-remove')).toBeNull();
    expect(getComputedStyle(q('.form-chip-box')).borderTopColor).toBe('rgb(227, 98, 90)');
    expect(q('form-errors').textContent.trim().length).toBeGreaterThan(0);
  });

  it('lists server-side errors and warnings as the shared line', () => {
    mount({ name: 'aliases', placeholder: 'Aliases', hasErrors: true, errors: 'Bad host.', warnings: 'Slow.' } as Partial<FieldConfig>);
    expect(qa('.form-error-line').map((l) => l.textContent.trim())).toEqual(['Bad host.', 'Slow.']);
    expect(getComputedStyle(q('.form-chip-box')).borderTopColor).toBe('rgb(227, 98, 90)');
  });

  describe('autocomplete branch (the quota forms)', () => {
    const options = [{ label: 'root', value: 'root' }, { label: 'admin', value: 'admin' }, { label: 'operator', value: 'operator' }];

    const expanded = (): boolean => component['autocomplete'].isExpanded();

    it('feeds the updater on typing, commits the typed text on Enter with no highlighted suggestion, clears and closes; blur commits nothing', async () => {
      const list = [];
      const updater = jasmine.createSpy('updater');
      const parent = {};
      mount({ name: 'searched_entries', placeholder: 'User', autocomplete: true, updater, parent, searchOptions: [] } as Partial<FieldConfig>, new UntypedFormControl(list));
      type('ad');
      await flush();
      expect(updater).toHaveBeenCalledWith('ad', parent);
      // no matches yet: the panel is open but draws nothing
      expect(expanded()).toBeTrue();
      const content = overlay.getContainerElement().querySelector('hlm-autocomplete-content') as HTMLElement;
      expect(content.hasAttribute('data-empty')).toBeTrue();
      expect(getComputedStyle(content).display).toBe('none');
      component.config.searchOptions = options.filter((o) => o.label.includes('ad'));
      await flush();
      expect(items().map((i) => i.textContent.trim())).toEqual(['admin']);
      expect(items()[0].getAttribute('ix-auto')).toBe('option__admin');
      expect(getComputedStyle(content).display).not.toBe('none');
      // blur does not commit in this branch (a mouse pick blurs the input first)
      input().dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(list).toEqual([]);
      expect(input().value).toBe('ad');
      expect(group.controls.searched_entries.touched).toBeTrue();
      key(input(), 'Enter');
      await flush();
      expect(list).toEqual(['ad']); // the typed text, not the un-highlighted suggestion
      expect(group.controls.searched_entries.value).toBe(list);
      expect(input().value).toBe('');
      expect(chips()).toEqual(['ad']);
      expect(expanded()).toBeFalse();
    });

    it('ArrowDown then Enter picks the highlighted suggestion exactly once, by label, without setValue', async () => {
      const list = [];
      const labelled = [{ label: 'Admin', value: 'admin' }, { label: 'Operator', value: 'operator' }];
      mount({ name: 'searched_entries', placeholder: 'User', autocomplete: true, options: labelled, searchOptions: [] } as Partial<FieldConfig>, new UntypedFormControl(list));
      let changes = 0;
      group.controls.searched_entries.valueChanges.subscribe(() => changes++);
      type('a');
      await flush();
      expect(items().map((i) => i.textContent.trim())).toEqual(['Admin', 'Operator']);
      key(input(), 'ArrowDown');
      await flush();
      key(input(), 'Enter');
      await flush();
      expect(list).toEqual(['Admin']); // not 'a', not both
      expect(changes).toBe(0);
      expect(input().value).toBe('');
      expect(chips()).toEqual(['Admin']);
      expect(expanded()).toBeFalse();
    });

    it('pushes a mouse-picked suggestion\'s label in place without setValue and clears the text', async () => {
      const list = [];
      const labelled = [{ label: 'Operator', value: 'operator' }];
      mount({ name: 'searched_entries', placeholder: 'User', autocomplete: true, options: labelled, searchOptions: [] } as Partial<FieldConfig>, new UntypedFormControl(list));
      let changes = 0;
      group.controls.searched_entries.valueChanges.subscribe(() => changes++);
      type('op');
      await flush();
      expect(items().map((i) => i.textContent.trim())).toEqual(['Operator']);
      items()[0].click();
      await flush();
      expect(list).toEqual(['Operator']);
      expect(changes).toBe(0);
      expect(input().value).toBe('');
      expect(chips()).toEqual(['Operator']);
    });

    it('Tab with an open panel closes it without picking; Escape with a closed panel keeps the text', async () => {
      const list = [];
      mount({ name: 'searched_entries', placeholder: 'User', autocomplete: true, options, searchOptions: [] } as Partial<FieldConfig>, new UntypedFormControl(list));
      type('ad');
      await flush();
      key(input(), 'ArrowDown');
      await flush();
      key(input(), 'Tab');
      await flush();
      expect(expanded()).toBeFalse();
      expect(list).toEqual([]);
      expect(input().value).toBe('ad');
      key(input(), 'Escape');
      await flush();
      expect(input().value).toBe('ad');
    });
  });
});
