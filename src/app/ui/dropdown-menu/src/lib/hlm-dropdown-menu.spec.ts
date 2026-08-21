import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';

// the host is Eager on purpose: this app's components default to OnPush, and the spec writes
// plain fields
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...HlmDropdownMenuImports],
  template: `
    <button id="trigger" type="button" [hlmDropdownMenuTrigger]="menu">Actions</button>
    <div style="display:flex; justify-content:flex-end; width: 600px">
      <button id="end" type="button" [hlmDropdownMenuTrigger]="menu" align="end">Actions</button>
    </div>
    <span id="glyph" role="button" tabindex="0" [hlmDropdownMenuTrigger]="empty">calendar</span>
    <ng-template #empty>
      <hlm-dropdown-menu id="empty-menu">
        <hlm-dropdown-menu-label>Upcoming</hlm-dropdown-menu-label>
        <div class="row">2026-09-19</div>
      </hlm-dropdown-menu>
    </ng-template>
    <ng-template #menu>
      <hlm-dropdown-menu>
        <hlm-dropdown-menu-label>Group</hlm-dropdown-menu-label>
        <button id="edit" hlmDropdownMenuItem type="button" (triggered)="edits = edits + 1"><span class="material-icons">edit</span>Edit</button>
        <button id="stay" hlmDropdownMenuItem keepOpen type="button" (triggered)="stays = stays + 1">Select All</button>
        <button id="off" hlmDropdownMenuItem type="button" [disabled]="true">Locked</button>
        <button id="danger" hlmDropdownMenuItem variant="destructive" type="button">Delete</button>
        <hlm-dropdown-menu-separator />
        <div id="check" hlmDropdownMenuCheckbox [checked]="checked" (triggered)="checked = !checked">Column</div>
        <a id="link" hlmDropdownMenuItem href="#portal" target="_blank" (click)="onLink($event)">Portal</a>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
class MenuHostComponent {
  edits = 0;
  stays = 0;
  checked = true;
  links = 0;
  onLink(event: Event): void {
    event.preventDefault(); // no navigation in karma; the click itself is what is under test
    this.links += 1;
  }
}

// the internal development record: the M1 menu -- the #354 panel (bg2, the --line hairline, 6px, 4px padding,
// no shadow), 32px rows at 13px fg1 with 12px sides and a 16px fg2 glyph, the label in the
// table-header voice (24px, 11/500 uppercase fg2), the separator a hairline reaching the panel's
// border, disabled rows at .4, the destructive tier in red. Fallback ladder (no theme service in
// karma): bg2 #171E24, line #2A353D, fg1 #DCE3E6, fg2 #97A6AE, red #E3625A.
describe('hlm-dropdown-menu (the internal development record)', () => {
  let fixture: ComponentFixture<MenuHostComponent>;
  let overlay: OverlayContainer;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const panel = (): HTMLElement => overlay.getContainerElement().querySelector('hlm-dropdown-menu') as HTMLElement;
  const item = (id: string): HTMLElement => panel().querySelector(`#${id}`) as HTMLElement;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));
  const escape = (): KeyboardEvent => new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
  // Tailwind's `shadow-none` computes to its five transparent layers, not `none`
  const noShadow = (value: string): boolean => value === 'none' || value.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?/g, '') === '';
  // the focus surface follows :focus-visible (the keyboard walk), never a bare :focus (a mouse open)
  const paintFollowsFocusVisible = (el: HTMLElement): boolean => (getComputedStyle(el).backgroundColor.includes('/ 0.05)')) === el.matches(':focus-visible');

  async function open(trigger = 'trigger'): Promise<HTMLElement> {
    q(`#${trigger}`).focus();
    q(`#${trigger}`).click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return panel();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MenuHostComponent] }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(MenuHostComponent);
    // pinned to the viewport's top-left: other specs leave the karma page tall or short, and CDK
    // flips or pushes a panel that would not fit below its trigger
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:800px; z-index:1';
    fixture.detectChanges();
  });

  afterEach(() => overlay.ngOnDestroy());

  it('marks the trigger as a menu button and opens the #354 panel under it', async () => {
    const trigger = q('#trigger');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
    const p = await open();
    expect(p).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(p.getAttribute('role')).toBe('menu');
    expect(p.getAttribute('data-slot')).toBe('dropdown-menu');
    const s = getComputedStyle(p);
    expect(s.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(s.color).toBe('rgb(220, 227, 230)');
    expect(s.borderTopWidth).toBe('1px');
    expect(s.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(s.borderTopLeftRadius).toBe('6px');
    expect(s.paddingTop).toBe('4px');
    expect(s.paddingLeft).toBe('4px');
    expect(noShadow(s.boxShadow)).toBeTrue();
    expect(p.getBoundingClientRect().width).toBeGreaterThanOrEqual(144); // min-w-36
    const tr = trigger.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    expect(Math.round(pr.top - tr.bottom)).toBe(4); // side offset: spacing(1)
    expect(Math.round(pr.left - tr.left)).toBe(0); // align start
    expect(p.getAttribute('data-side')).toBe('bottom');
  });

  it('aligns the panel to the trigger end when asked', async () => {
    const p = await open('end');
    const tr = q('#end').getBoundingClientRect();
    expect(Math.round(p.getBoundingClientRect().right - tr.right)).toBe(0);
  });

  it('draws 32px rows at 13px fg1 with 12px sides, the glyph 16px fg2, the label and separator in their voices', async () => {
    const p = await open();
    const edit = item('edit');
    expect(edit.getAttribute('role')).toBe('menuitem');
    expect(edit.getAttribute('data-slot')).toBe('dropdown-menu-item');
    expect(edit.getBoundingClientRect().height).toBe(32);
    expect(edit.getBoundingClientRect().width).toBe(p.getBoundingClientRect().width - 10);
    const s = getComputedStyle(edit);
    expect(s.fontSize).toBe('13px');
    expect(s.color).toBe('rgb(220, 227, 230)');
    expect(s.paddingLeft).toBe('12px');
    expect(s.paddingRight).toBe('12px');
    expect(document.activeElement).toBe(edit); // CDK focuses the first row on open ...
    expect(paintFollowsFocusVisible(edit)).toBeTrue(); // ... and only a keyboard focus paints it
    expect(getComputedStyle(item('stay')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(s.borderTopLeftRadius).toBe('4px');
    expect(s.display).toBe('flex');
    expect(s.columnGap).toBe('8px');
    const glyph = edit.querySelector('.material-icons') as HTMLElement;
    expect(getComputedStyle(glyph).fontSize).toBe('16px');
    expect(getComputedStyle(glyph).color).toBe('rgb(151, 166, 174)');
    expect([glyph.getBoundingClientRect().width, glyph.getBoundingClientRect().height]).toEqual([16, 16]); // the icon box shrinks with the glyph
    expect(Math.round(glyph.getBoundingClientRect().top - edit.getBoundingClientRect().top)).toBe(8); // centred in the 32px row
    expect(getComputedStyle(p).maxHeight).not.toBe('none'); // a tall menu scrolls inside the viewport
    const label = p.querySelector('hlm-dropdown-menu-label') as HTMLElement;
    expect(label.getBoundingClientRect().height).toBe(24);
    expect(getComputedStyle(label).fontSize).toBe('11px');
    expect(getComputedStyle(label).fontWeight).toBe('500');
    expect(getComputedStyle(label).textTransform).toBe('uppercase');
    expect(getComputedStyle(label).letterSpacing).toBe('0.4px');
    expect(getComputedStyle(label).color).toBe('rgb(151, 166, 174)');
    expect(getComputedStyle(label).paddingLeft).toBe('12px');
    const separator = p.querySelector('hlm-dropdown-menu-separator') as HTMLElement;
    expect(separator.getBoundingClientRect().height).toBe(1);
    expect(getComputedStyle(separator).backgroundColor).toBe('rgb(42, 53, 61)');
    expect(Math.round(separator.getBoundingClientRect().left - p.getBoundingClientRect().left)).toBe(1);
    expect(Math.round(separator.getBoundingClientRect().width)).toBe(Math.round(p.getBoundingClientRect().width) - 2);
    expect(getComputedStyle(separator).marginTop).toBe('4px');
  });

  it('dims a disabled row to .4 and paints the destructive tier red', async () => {
    await open();
    const off = item('off');
    expect(getComputedStyle(off).opacity).toBe('0.4');
    expect(getComputedStyle(off).pointerEvents).toBe('none');
    expect(off.hasAttribute('disabled')).toBeTrue();
    expect(off.getAttribute('aria-disabled')).toBe('true');
    expect(getComputedStyle(item('danger')).color).toBe('rgb(227, 98, 90)');
    expect(item('danger').getAttribute('data-variant')).toBe('destructive');
  });

  it('acts and closes on a plain row, stays open on a keepOpen row and a checkbox row, and returns focus on Escape', async () => {
    await open();
    item('stay').click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.stays).toBe(1);
    expect(panel()).not.toBeNull();
    const check = item('check');
    expect(check.getAttribute('role')).toBe('menuitemcheckbox');
    expect(check.getAttribute('aria-checked')).toBe('true');
    expect(check.hasAttribute('data-checked')).toBeTrue();
    check.click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.checked).toBeFalse();
    expect(check.getAttribute('aria-checked')).toBe('false');
    expect(check.hasAttribute('data-checked')).toBeFalse();
    expect(panel()).not.toBeNull();
    item('edit').click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.edits).toBe(1);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(q('#trigger'));
    const p = await open();
    p.dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    expect(q('#trigger').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(q('#trigger'));
  });

  it('focuses the first row on open and walks the rows with the arrow keys, skipping the disabled row as the mat-menu did', async () => {
    const p = await open();
    const focused = (): string => document.activeElement && document.activeElement.id;
    const down = (): void => { p.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true })); fixture.detectChanges(); };
    expect(focused()).toBe('edit');
    down();
    expect(focused()).toBe('stay');
    down();
    expect(focused()).toBe('danger'); // 'off' is skipped
    down();
    expect(focused()).toBe('check');
    down();
    expect(focused()).toBe('link'); // an anchor row walks like a button row
    down();
    expect(focused()).toBe('edit'); // wraps
    expect(item('edit').getAttribute('tabindex')).toBe('0');
    expect(item('stay').getAttribute('tabindex')).toBe('-1');
    expect(paintFollowsFocusVisible(item('edit'))).toBeTrue();
    expect(paintFollowsFocusVisible(item('stay'))).toBeTrue();
  });

  it('opens from the keyboard with the first row focused, and hovering a row moves focus to it', async () => {
    const trigger = q('#trigger');
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    expect(document.activeElement.id).toBe('edit');
    item('stay').dispatchEvent(new MouseEvent('mouseenter'));
    expect(document.activeElement.id).toBe('stay');
    item('off').dispatchEvent(new MouseEvent('mouseenter')); // a disabled row does not take the hover focus
    expect(document.activeElement.id).toBe('stay');
  });

  it('closes on Escape from the trigger when the menu has no focusable row (a widget panel), and stops the key there', async () => {
    const glyph = q('#glyph');
    expect(glyph.getAttribute('role')).toBe('button');
    glyph.focus();
    glyph.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    const p = panel();
    expect(p).not.toBeNull();
    expect(p.querySelector('.row').textContent).toBe('2026-09-19');
    expect(document.activeElement).toBe(glyph); // nothing inside to focus
    expect(glyph.getAttribute('aria-expanded')).toBe('true');
    const bodyKeys: string[] = [];
    const listener = (e: KeyboardEvent): void => { bodyKeys.push(e.key); };
    document.body.addEventListener('keydown', listener);
    document.activeElement.dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    document.body.removeEventListener('keydown', listener);
    expect(panel()).toBeNull();
    expect(glyph.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(glyph);
    expect(bodyKeys).toEqual([]); // the overlay dispatcher (a dialog beneath) never sees it
    // Space on the non-button trigger toggles without scrolling the page
    const space = new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true, cancelable: true });
    glyph.dispatchEvent(space);
    fixture.detectChanges();
    await settle();
    expect(space.defaultPrevented).toBeTrue();
    expect(panel()).not.toBeNull();
    document.activeElement.dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    // Escape from inside the panel (a row focused) also stops at the panel
    const p2 = await open();
    const inner: string[] = [];
    const listener2 = (e: KeyboardEvent): void => { inner.push(e.key); };
    document.body.addEventListener('keydown', listener2);
    (document.activeElement as HTMLElement).dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    document.body.removeEventListener('keydown', listener2);
    expect(p2.isConnected).toBeFalse();
    expect(inner).toEqual([]);
  });
  // the internal development record: Space on an anchor row clicks it (CDK only dispatches a native click for
  // Enter on an `A`, so Space merely dismissed the menu), and the page does not scroll.
  it('clicks an anchor row on Space, closes and returns focus to the trigger', async () => {
    await open();
    const link = item('link') as HTMLAnchorElement;
    expect(link.getAttribute('role')).toBe('menuitem');
    expect(link.target).toBe('_blank');
    link.focus();
    expect(document.activeElement).toBe(link);
    const space = new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true, cancelable: true });
    link.dispatchEvent(space);
    fixture.detectChanges();
    await settle();
    expect(space.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.links).toBe(1);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(q('#trigger'));
    // Enter on the anchor goes the native way and is not doubled by the override
    await open();
    const link2 = item('link') as HTMLAnchorElement;
    link2.focus();
    link2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.links).toBe(1); // a synthetic Enter is not trusted, so CDK triggers without a click
    expect(panel()).toBeNull();
  });
});
