import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y';
import { ENTER, SPACE, hasModifierKey } from '@angular/cdk/keycodes';
import {
  computed, contentChildren, DestroyRef, Directive, effect, ElementRef, inject, untracked,
} from '@angular/core';
import { BrnCollapsible, BrnCollapsibleContent, injectBrnCollapsible } from '@spartan-ng/brain/collapsible';

let nextId = 0;

/**
 * the internal development record: the header of an expansion panel off Material (`mat-expansion-panel-header`). The panel is a
 * `brnCollapsible` (state, content id, `inert` body via `brnCollapsibleContent`); brain's own trigger only takes a
 * `<button>`, and a panel header holds block content (the Pools summary: divs and a `dl`), so the header is a
 * `button`-role element like Material's: one tab stop (none while disabled), `aria-expanded` / `aria-controls` /
 * `aria-disabled`, a click or Enter / Space toggles, any other key goes to the `fcAccordion` around it. The look is
 * the `.fc-expansion-*` block in freecore-ui.css. Declared before the accordion: its content query names this class.
 */
@Directive({
  selector: '[fcExpansionHeader]',
  standalone: true,
  exportAs: 'fcExpansionHeader',
  host: {
    role: 'button',
    class: 'fc-expansion-panel-header',
    '[attr.id]': 'id',
    '[attr.tabindex]': 'disabled ? -1 : 0',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'collapsible.contentId()',
    '[attr.aria-disabled]': 'disabled',
    '(click)': 'collapsible.toggle()',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'accordion?.headerFocused(this)',
  },
})
export class FcExpansionHeaderDirective implements FocusableOption {
  readonly id = `fc-expansion-header-${nextId++}`;
  readonly collapsible: BrnCollapsible = injectBrnCollapsible();
  readonly accordion = inject(FcAccordionDirective, { optional: true });
  readonly expanded = computed(() => this.collapsible.expanded());
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  /** The key manager skips a disabled header, as mat-accordion's did. */
  get disabled(): boolean {
    return this.collapsible.disabled();
  }

  focus(): void {
    this.element.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    if ((event.keyCode === ENTER || event.keyCode === SPACE) && !hasModifierKey(event)) {
      event.preventDefault();
      this.collapsible.toggle();
      return;
    }
    this.accordion?.onHeaderKeydown(event);
  }
}

/**
 * the internal development record: a group of expansion panels (`mat-accordion multi`): the panels open and close on their own;
 * Up / Down move focus between the headers, Home / End go to the first and last, wrapping at the ends.
 */
@Directive({
  selector: '[fcAccordion]',
  standalone: true,
  host: { class: 'fc-accordion' },
})
export class FcAccordionDirective {
  readonly headers = contentChildren(FcExpansionHeaderDirective, { descendants: true });
  private keyManager: FocusKeyManager<FcExpansionHeaderDirective> | null = null;

  constructor() {
    effect(() => {
      const headers = this.headers();
      untracked(() => {
        this.keyManager?.destroy();
        this.keyManager = new FocusKeyManager(headers).withWrap().withHomeAndEnd();
      });
    });
    inject(DestroyRef).onDestroy(() => this.keyManager?.destroy());
  }

  onHeaderKeydown(event: KeyboardEvent): void {
    this.keyManager?.onKeydown(event);
  }

  headerFocused(header: FcExpansionHeaderDirective): void {
    this.keyManager?.updateActiveItem(header);
  }
}

export const FC_EXPANSION = [FcAccordionDirective, FcExpansionHeaderDirective, BrnCollapsible, BrnCollapsibleContent] as const;
