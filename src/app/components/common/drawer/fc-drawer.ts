import { FocusMonitor, FocusOrigin, FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { ESCAPE, hasModifierKey } from '@angular/cdk/keycodes';
import {
  afterNextRender, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, DOCUMENT,
  ElementRef, EventEmitter, forwardRef, inject, Injector, Input, NgZone, Output, signal, ViewEncapsulation,
} from '@angular/core';

export type FcDrawerMode = 'side' | 'over';
export type FcDrawerPosition = 'start' | 'end';

/**
 * the internal development record: a drawer off Material (`mat-drawer` / `mat-sidenav`), with the API the shell reads (`opened`,
 * `mode`, `toggle()`, `open()`, `close()`, `openedChange`) and what Material did:
 * - `side` (in the flow, under the content's margin, no backdrop, focus stays put) or `over` (above a backdrop,
 *   focus trapped while open).
 * - On opening over, the first tabbable element takes focus once the slide ends; on closing, the element focused
 *   before comes back if focus was inside (always after a backdrop click).
 * - Escape closes. The 400ms slide runs once the container's transitions are on; while closed and not sliding the
 *   drawer is hidden and its inner container display:none.
 * The look is the restated sidenav sheet at the end of freecore-ui.css (`.fc-drawer*`).
 */
@Component({
  selector: 'fc-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'fcDrawer',
  host: {
    class: 'fc-drawer fc-sidenav',
    '[attr.tabindex]': "mode !== 'side' ? '-1' : null",
    '[class.fc-drawer-end]': "position === 'end'",
    '[class.fc-drawer-over]': "mode === 'over'",
    '[class.fc-drawer-side]': "mode === 'side'",
    '[class.fc-drawer-opened]': 'opened',
    '[class.fc-drawer-animating]': 'animating()',
    '(keydown)': 'onKeydown($event)',
    '(transitionend)': 'onTransition($event)',
    '(transitioncancel)': 'onTransition($event)',
  },
  template: '<div class="fc-drawer-inner-container"><ng-content /></div>',
})
export class FcDrawerComponent {
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly doc = inject(DOCUMENT);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly container = inject(forwardRef(() => FcDrawerContainerComponent), { optional: true });
  private focusTrap: FocusTrap | null = null;
  private focusedBeforeOpen: HTMLElement | null = null;
  private openedVia: FocusOrigin | null = null;

  readonly openedState = signal(false);
  readonly modeState = signal<FcDrawerMode>('over');
  readonly animating = signal(false);

  /** Emits after the slide (or at once without transitions) with the new state, as MatDrawer's did. */
  @Output() readonly openedChange = new EventEmitter<boolean>(true);

  @Input() position: FcDrawerPosition = 'start';

  @Input()
  get mode(): FcDrawerMode {
    return this.modeState();
  }
  set mode(value: FcDrawerMode) {
    this.modeState.set(value === 'side' ? 'side' : 'over');
    this.updateFocusTrap();
  }

  @Input({ transform: booleanAttribute })
  get opened(): boolean {
    return this.openedState();
  }
  set opened(value: boolean) {
    this.toggle(value);
  }

  constructor() {
    this.openedChange.subscribe((opened) => {
      if (opened) {
        this.focusedBeforeOpen = this.doc.activeElement as HTMLElement;
        this.takeFocus();
      } else if (this.focusWithin()) {
        this.restoreFocus(this.openedVia || 'program');
      }
    });
    afterNextRender(() => {
      this.focusTrap = this.focusTrapFactory.create(this.element);
      this.updateFocusTrap();
    }, { injector: this.injector });
    inject(DestroyRef).onDestroy(() => this.focusTrap?.destroy());
  }

  open(openedVia?: FocusOrigin): Promise<'open' | 'close'> {
    return this.toggle(true, openedVia);
  }

  close(): Promise<'open' | 'close'> {
    return this.toggle(false);
  }

  toggle(isOpen = !this.opened, openedVia?: FocusOrigin): Promise<'open' | 'close'> {
    if (isOpen && openedVia) this.openedVia = openedVia;
    const result = this.setOpen(isOpen, !isOpen && this.focusWithin(), this.openedVia || 'program');
    if (!isOpen) this.openedVia = null;
    return result;
  }

  /** The backdrop's click (MatDrawer._closeViaBackdropClick): focus always goes back. */
  closeViaBackdrop(): void {
    this.setOpen(false, true, 'mouse');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.keyCode === ESCAPE && !hasModifierKey(event)) {
      this.close();
      event.stopPropagation();
      event.preventDefault();
    }
  }

  onTransition(event: TransitionEvent): void {
    if (event.target !== this.element) return;
    if (event.type === 'transitionend') this.animating.set(false);
    this.openedChange.emit(this.opened);
  }

  private setOpen(isOpen: boolean, restoreFocus: boolean, origin: FocusOrigin): Promise<'open' | 'close'> {
    if (isOpen === this.opened) return Promise.resolve(isOpen ? 'open' : 'close');
    this.openedState.set(isOpen);
    if (this.container?.transitions()) {
      if (this.animating()) {
        this.animating.set(false);
        this.simulateSlide();
      } else {
        this.animating.set(true);
      }
    } else {
      this.simulateSlide();
    }
    if (!isOpen && restoreFocus) this.restoreFocus(origin);
    this.updateFocusTrap();
    return new Promise((resolve) => {
      const sub = this.openedChange.subscribe((open) => { sub.unsubscribe(); resolve(open ? 'open' : 'close'); });
    });
  }

  /** No transition will run (the container's transitions are not on yet): report the change on the next turn. */
  private simulateSlide(): void {
    setTimeout(() => this.openedChange.emit(this.opened));
  }

  private takeFocus(): void {
    if (!this.focusTrap || this.mode === 'side') return; // Material: a side drawer's autoFocus is 'dialog'
    afterNextRender(() => {
      const options = this.animating() ? { preventScroll: true } : undefined;
      if (!this.focusTrap.focusInitialElement(options)) this.element.focus(options);
    }, { injector: this.injector });
  }

  private restoreFocus(origin: FocusOrigin): void {
    if (this.mode === 'side') return;
    if (this.focusedBeforeOpen) {
      this.focusMonitor.focusVia(this.focusedBeforeOpen, origin);
    } else {
      this.element.blur();
    }
    this.focusedBeforeOpen = null;
  }

  private focusWithin(): boolean {
    const active = this.doc.activeElement;
    return !!active && this.element.contains(active);
  }

  private updateFocusTrap(): void {
    if (this.focusTrap) this.focusTrap.enabled = this.opened && this.mode !== 'side';
  }
}

/** the internal development record: the drawer's sibling content (`mat-sidenav-content`); the layout sets its margin itself. */
@Component({
  selector: 'fc-drawer-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'fc-drawer-content fc-sidenav-content' },
  template: '<ng-content />',
})
export class FcDrawerContentComponent {}

/**
 * the internal development record: the drawer container (`mat-sidenav-container`): the backdrop first (shown while an over drawer
 * is open, a click closes the over drawers), then the drawers and the content in template order (the end drawer
 * last, where Material moved it); the slide transitions switch on 200ms after start-up, so the first paint does
 * not animate.
 */
@Component({
  selector: 'fc-drawer-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'fc-drawer-container fc-sidenav-container', '[class.fc-drawer-transition]': 'transitions()' },
  template: `
    @if (hasBackdrop()) {
      <div class="fc-drawer-backdrop" (click)="onBackdropClick()" [class.fc-drawer-shown]="showingBackdrop()"></div>
    }
    <ng-content />
  `,
})
export class FcDrawerContainerComponent {
  readonly drawers = contentChildren(FcDrawerComponent);
  readonly transitions = signal(false);
  readonly hasBackdrop = computed(() => this.drawers().some((d) => d.modeState() !== 'side'));
  readonly showingBackdrop = computed(() => this.drawers().some((d) => d.openedState() && d.modeState() !== 'side'));

  constructor() {
    inject(NgZone).runOutsideAngular(() => setTimeout(() => this.transitions.set(true), 200));
  }

  onBackdropClick(): void {
    this.drawers().filter((d) => d.mode !== 'side').forEach((d) => d.closeViaBackdrop());
  }
}

export const FC_DRAWER = [FcDrawerContainerComponent, FcDrawerComponent, FcDrawerContentComponent] as const;
