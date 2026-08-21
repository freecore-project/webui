import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { ENTER, SPACE, hasModifierKey } from '@angular/cdk/keycodes';
import {
  afterNextRender, afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, Directive,
  effect, ElementRef, inject, input, signal, untracked, viewChild, ViewEncapsulation,
} from '@angular/core';

let nextId = 0;

/** Material's paginator timing: a held arrow starts repeating after 650ms, then pages every 100ms. */
const REPEAT_DELAY = 650;
const REPEAT_INTERVAL = 100;

/**
 * the internal development record: the pane a tab bar controls (`[panel]` on the bar) -- `role="tabpanel"`, labelled by the
 * active tab, as `mat-tab-nav-panel` was.
 */
@Directive({
  selector: '[fcTabNavPanel]',
  standalone: true,
  exportAs: 'fcTabNavPanel',
  host: { role: 'tabpanel', '[attr.id]': 'id()', '[attr.aria-labelledby]': 'activeTabId()' },
})
export class FcTabNavPanelDirective {
  readonly id = input(`fc-tab-nav-panel-${nextId++}`);
  readonly activeTabId = signal<string | null>(null);
}

/**
 * the internal development record: a link on an `fcTabNav` bar (see FcTabNavComponent). Declared first: the bar's content
 * query names this class when the bar's definition is built.
 */
@Directive({
  selector: 'a[fcTabLink]',
  standalone: true,
  host: {
    class: 'fc-tab',
    '[attr.id]': 'id()',
    '[attr.data-state]': "active() ? 'active' : 'inactive'",
    '[attr.tabindex]': 'nav.focused() === this ? 0 : -1',
    '[attr.role]': "nav.panel() ? 'tab' : null",
    '[attr.aria-selected]': 'nav.panel() ? active() : null',
    '[attr.aria-controls]': 'nav.panel()?.id() ?? null',
    '[attr.aria-current]': "active() && !nav.panel() ? 'page' : null",
    '(focus)': 'nav.linkFocused(this)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class FcTabLinkDirective implements FocusableOption {
  readonly active = input(false, { transform: booleanAttribute });
  readonly id = input(`fc-tab-link-${nextId++}`);
  readonly nav = inject(FcTabNavComponent);
  readonly element: HTMLElement = inject(ElementRef).nativeElement;

  /** The key manager's move: focus without the browser's own scroll, then page the strip to the link. */
  focus(): void {
    this.element.focus({ preventScroll: true });
    this.nav.scrollToLink(this, 'smooth');
  }

  onKeydown(event: KeyboardEvent): void {
    // A tab that controls a panel opens on Space as on Enter (Material's tab link); a plain nav link is a link.
    if (event.keyCode === SPACE && this.nav.panel()) {
      event.preventDefault();
      this.element.click();
    }
  }
}

/**
 * the internal development record: a route tab bar off Material (`mat-tab-nav-bar`). The page keeps its anchors, their
 * `routerLink` / `routerLinkActive` and `ix-auto` hooks: `<nav fcTabNav>` around `<a fcTabLink [active]>`.
 * The look is the shell's tab vocabulary in freecore-ui.css (`.fc-tab-bar` / `.fc-tab`, shared with the
 * Applications tabs); `stretch` shares the free width out, `underline` draws the line under the active tab.
 *
 * What mat-tab-nav-bar did, kept: the arrow keys move focus along the bar (Home / End, wrapping) with one tab
 * stop -- the active link, or the one last focused; with a `[panel]` the bar is a `tablist` of `tab`s that
 * control it (`aria-selected`, Space opens the focused tab), without one it is a plain nav whose active link is
 * `aria-current="page"`. When the links are 5px or more wider than the bar, the paginator arrows show: a click
 * pages a third of the view, a held arrow repeats, an arrow at its end dims, and the active or focused link is
 * scrolled into view. (The strip scrolls natively under its hidden scrollbar, so a touch swipe moves it too.)
 */
@Component({
  selector: 'nav[fcTabNav]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'fcTabNav',
  host: {
    class: 'fc-tab-bar fc-tab-nav',
    '[class.fc-tab-bar--stretch]': 'stretch()',
    '[class.fc-tab-bar--underline]': 'underline()',
    '[class.fc-tab-nav--paginated]': 'paginated()',
    '[attr.role]': "panel() ? 'tablist' : null",
    '(mouseleave)': 'stopRepeat()',
  },
  template: `
    <div class="fc-tab-nav-pagination fc-tab-nav-pagination--before" [class.fc-tab-nav-pagination--disabled]="atStart()"
      (click)="stopRepeat(); page(-1)" (mousedown)="startRepeat(-1, $event)" (touchstart)="startRepeat(-1)" (touchend)="stopRepeat()">
      <div class="fc-tab-nav-chevron"></div>
    </div>
    <div #viewport class="fc-tab-nav-viewport" (keydown)="onKeydown($event)" (scroll)="updateEnds()">
      <div #list class="fc-tab-nav-list"><ng-content /></div>
    </div>
    <div class="fc-tab-nav-pagination fc-tab-nav-pagination--after" [class.fc-tab-nav-pagination--disabled]="atEnd()"
      (click)="stopRepeat(); page(1)" (mousedown)="startRepeat(1, $event)" (touchstart)="startRepeat(1)" (touchend)="stopRepeat()">
      <div class="fc-tab-nav-chevron"></div>
    </div>
  `,
})
export class FcTabNavComponent {
  readonly stretch = input(false, { transform: booleanAttribute });
  readonly underline = input(true, { transform: booleanAttribute });
  readonly panel = input<FcTabNavPanelDirective | null>(null);

  readonly links = contentChildren(FcTabLinkDirective, { descendants: true });
  /** The link that holds the bar's one tab stop. */
  readonly focused = signal<FcTabLinkDirective | null>(null);
  readonly paginated = signal(false);
  readonly atStart = signal(true);
  readonly atEnd = signal(true);

  private readonly activeIndex = computed(() => this.links().findIndex((link) => link.active()));
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly dir = inject(Directionality, { optional: true });
  private keyManager: FocusKeyManager<FcTabLinkDirective> | null = null;
  private repeat: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const links = this.links();
      untracked(() => {
        this.keyManager?.destroy();
        this.keyManager = new FocusKeyManager(links)
          .withHorizontalOrientation(this.dir?.value === 'rtl' ? 'rtl' : 'ltr').withHomeAndEnd().withWrap();
        this.keyManager.change.subscribe(() => this.focused.set(this.keyManager.activeItem ?? null));
      });
    });
    // The active link takes the tab stop (and labels the panel) whenever the route moves it.
    effect(() => {
      const index = this.activeIndex();
      const links = this.links();
      untracked(() => {
        const stop = links[Math.max(index, 0)] ?? null;
        this.keyManager?.updateActiveItem(stop);
        this.focused.set(stop);
        this.panel()?.activeTabId.set(index >= 0 ? links[index].id() : null);
      });
    });
    afterRenderEffect(() => {
      const index = this.activeIndex();
      this.paginated();
      untracked(() => {
        if (index >= 0) this.scrollToLink(this.links()[index], 'instant');
        this.updateEnds();
      });
    });
    // The bar or the strip resized (the window, a translation, a longer label): check the paginator again.
    const resize = new ResizeObserver(() => this.checkPagination());
    afterNextRender(() => {
      resize.observe(this.host);
      resize.observe(this.list().nativeElement);
    });
    inject(DestroyRef).onDestroy(() => {
      resize.disconnect();
      this.stopRepeat();
      this.keyManager?.destroy();
    });
  }

  /** A link took focus (click, Tab, or the arrow keys): it holds the tab stop now. */
  linkFocused(link: FcTabLinkDirective): void {
    this.keyManager?.updateActiveItem(link);
    this.focused.set(link);
  }

  onKeydown(event: KeyboardEvent): void {
    // Enter and Space belong to the link (Material's header left them alone when the focused link is the active one).
    if (hasModifierKey(event) || event.keyCode === ENTER || event.keyCode === SPACE) return;
    this.keyManager?.onKeydown(event);
  }

  /** Scroll the strip so the link is in view: its left edge to the view's, or its right edge to the view's right. */
  scrollToLink(link: FcTabLinkDirective, behavior: ScrollBehavior): void {
    const viewport = this.viewport().nativeElement;
    const before = link.element.offsetLeft;
    const after = before + link.element.offsetWidth;
    const start = viewport.scrollLeft;
    const end = start + viewport.clientWidth;
    if (before < start) {
      viewport.scrollTo({ left: before, behavior });
    } else if (after > end) {
      viewport.scrollTo({ left: start + Math.min(after - end, before - start), behavior });
    }
  }

  page(direction: -1 | 1): void {
    const viewport = this.viewport().nativeElement;
    viewport.scrollBy({ left: direction * viewport.clientWidth / 3, behavior: 'smooth' });
  }

  startRepeat(direction: -1 | 1, event?: MouseEvent): void {
    if (event && event.button !== 0) return;
    this.stopRepeat();
    this.repeat = setTimeout(() => {
      this.repeat = setInterval(() => {
        if (direction < 0 ? this.atStart() : this.atEnd()) {
          this.stopRepeat();
        } else {
          this.page(direction);
        }
      }, REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }

  stopRepeat(): void {
    if (this.repeat !== null) {
      clearTimeout(this.repeat);
      clearInterval(this.repeat);
      this.repeat = null;
    }
  }

  updateEnds(): void {
    const viewport = this.viewport().nativeElement;
    this.atStart.set(viewport.scrollLeft <= 0);
    this.atEnd.set(viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1);
  }

  private checkPagination(): void {
    const paginated = this.list().nativeElement.scrollWidth - this.host.offsetWidth >= 5;
    if (!paginated) this.viewport().nativeElement.scrollLeft = 0;
    this.paginated.set(paginated);
    this.updateEnds();
  }
}

export const FC_TAB_NAV = [FcTabNavComponent, FcTabLinkDirective, FcTabNavPanelDirective] as const;
