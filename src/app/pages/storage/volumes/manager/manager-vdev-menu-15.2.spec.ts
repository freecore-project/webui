import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';

// the internal development record: the pool manager's Add Vdev menu on the helm dropdown-menu -- the #404 outline
// trigger with the caret, the rich rows (glyph + title + description) on auto-height items with the
// page's own sheet in the cascade. Only the Data row keeps the menu open; a one-shot row (cache, log,
// spare, special, dedup) disables itself after one add and so closes the menu like the old one did.
// A stand-in host mirrors manager.component.html's markup.
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIconModule, TranslateModule, CommonDirectivesModule, ...HlmButtonImports, ...HlmDropdownMenuImports],
  styleUrls: ['./manager.component.css'],
  template: `
    <div class="button-bar">
      <div><button hlmBtn variant="outline" type="button" [hlmDropdownMenuTrigger]="menu" class="menu-toggle" id="pool-manager__add-vdev-button" [disabled]="noDisks"
        ix-auto ix-auto-type="button" ix-auto-identifier="add_vdev_type">
        <span>Add Vdev <mat-icon class="menu-caret" aria-hidden="true">expand_more</mat-icon></span>
      </button></div>
    </div>
    <ng-template #menu>
      <hlm-dropdown-menu class="vdev-menu">
        <button class="tbl vdev-option" id="pool-manager__add-data-button" [disabled]="false" (triggered)="added.push('data')" hlmDropdownMenuItem keepOpen type="button">
          <div class="tr">
            <div class="td icon"><mat-icon role="img">database</mat-icon></div>
            <div class="td"><h3>Data</h3><p><span>Normal vdev type, used for primary storage operations. ZFS pools always have at least one DATA vdev.</span></p></div>
          </div>
        </button>
        <button class="tbl vdev-option" id="pool-manager__add-cache-button" [disabled]="added.includes('cache')" (triggered)="added.push('cache')" hlmDropdownMenuItem type="button">
          <div class="tr">
            <div class="td icon"><mat-icon role="img">speed</mat-icon></div>
            <div class="td"><h3>Cache</h3><p><span>ZFS L2ARC read-cache that can be used with fast devices to accelerate read operations.</span></p></div>
          </div>
        </button>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
class VdevMenuHostComponent {
  noDisks = false;
  added: string[] = [];
}

describe('pool manager Add Vdev menu (the internal development record)', () => {
  let fixture: ComponentFixture<VdevMenuHostComponent>;
  let overlay: OverlayContainer;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));
  const panel = (): HTMLElement => overlay.getContainerElement().querySelector('hlm-dropdown-menu.vdev-menu') as HTMLElement;
  const escape = (): KeyboardEvent => new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });

  async function open(): Promise<{ trigger: HTMLButtonElement; rows: HTMLButtonElement[] }> {
    const trigger = fixture.nativeElement.querySelector('#pool-manager__add-vdev-button') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return { trigger, rows: Array.from(panel().querySelectorAll<HTMLButtonElement>('.vdev-option')) };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VdevMenuHostComponent, TranslateModule.forRoot()] }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(VdevMenuHostComponent);
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:800px; z-index:1';
    fixture.detectChanges();
  });

  afterEach(() => overlay.ngOnDestroy());

  it('draws the outline trigger with the caret and opens rich auto-height rows that wrap inside a bounded panel', async () => {
    const trigger = fixture.nativeElement.querySelector('#pool-manager__add-vdev-button') as HTMLButtonElement;
    expect(trigger.getAttribute('ix-auto')).toBe('button__add_vdev_type');
    expect(trigger.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(trigger).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(trigger).paddingRight).toBe('8px');
    const caret = trigger.querySelector('.menu-caret') as HTMLElement;
    expect([caret.getBoundingClientRect().width, caret.getBoundingClientRect().height]).toEqual([16, 16]);
    const { rows } = await open();
    const p = panel();
    expect(p).not.toBeNull();
    expect(rows.map((r) => r.id)).toEqual(['pool-manager__add-data-button', 'pool-manager__add-cache-button']);
    expect(rows[0].getAttribute('role')).toBe('menuitem');
    expect(rows[0].getBoundingClientRect().height).toBeGreaterThan(48); // title + wrapped description, not the 32px row
    expect(getComputedStyle(rows[0]).paddingTop).toBe('12px');
    expect(getComputedStyle(rows[0]).marginRight).toBe('0px'); // no page button margin reaches the panel (#417 dropped the 5px rule)
    expect(rows[0].getBoundingClientRect().right).toBeLessThanOrEqual(p.getBoundingClientRect().right - 4); // inside the panel's 4px padding
    expect(getComputedStyle(rows[0].querySelector('h3')).fontWeight).toBe('500');
    expect(getComputedStyle(rows[0].querySelector('p')).whiteSpace).toBe('normal');
    expect(p.getBoundingClientRect().width).toBeLessThanOrEqual(320); // the panel wraps its descriptions
    const desc = rows[0].querySelector('p') as HTMLElement;
    expect(desc.getBoundingClientRect().height).toBeGreaterThan(parseFloat(getComputedStyle(desc).fontSize) * 2); // at least two lines
    const glyph = rows[0].querySelector('.td.icon mat-icon') as HTMLElement;
    expect([glyph.getBoundingClientRect().width, glyph.getBoundingClientRect().height]).toEqual([24, 24]); // a rich row's glyph keeps its box
    expect(getComputedStyle(glyph).color).toBe('rgb(151, 166, 174)');
    expect(rows[1].disabled).toBeFalse();
    fixture.componentInstance.noDisks = true;
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#pool-manager__add-vdev-button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('keeps the menu open for repeated Data adds and returns focus to the trigger on Escape', async () => {
    const { trigger, rows } = await open();
    rows[0].click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.added).toEqual(['data']);
    expect(panel()).not.toBeNull(); // keepOpen: several data vdevs in one go
    rows[0].click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.added).toEqual(['data', 'data']);
    document.activeElement.dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes after a one-shot row and shows it disabled on the next open', async () => {
    const first = await open();
    first.rows[1].click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.added).toEqual(['cache']);
    expect(panel()).toBeNull(); // the row disables itself, so it must not keep the menu open
    expect(document.activeElement).toBe(first.trigger);
    const second = await open();
    expect(second.rows[1].disabled).toBeTrue();
    expect(second.rows[1].getAttribute('data-disabled')).toBe('');
    expect(getComputedStyle(second.rows[1]).opacity).toBe('0.4');
    expect(document.activeElement).toBe(second.rows[0]); // the key manager skips the disabled row
    document.activeElement.dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
  });
});
