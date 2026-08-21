import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';

// the internal development record: the Reporting tab picker on the helm dropdown-menu -- a ghost hlmBtn with the
// #404 caret (the page's own scss carries the caret rules now that the shell's Material caret rules
// are gone) and #354 rows that navigate. A stand-in host mirrors reportsdashboard.html's picker.
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIconModule, TranslateModule, CommonDirectivesModule, ...HlmButtonImports, ...HlmDropdownMenuImports],
  styleUrls: ['./reportsdashboard.scss'],
  template: `
    <nav class="reports-toolbar">
      <div class="reports-dash-global-controls">
        <div>
          <button hlmBtn variant="ghost" type="button" [hlmDropdownMenuTrigger]="categoryMenu" class="menu-toggle" id="reports-tab-selector"
            ix-auto ix-auto-type="button" ix-auto-identifier="tab-selector">
            <span>{{ activeTab }} <mat-icon class="menu-caret" aria-hidden="true">expand_more</mat-icon></span>
          </button>
          <ng-template #categoryMenu>
            <hlm-dropdown-menu>
              @for (tab of allTabs; track tab) {
                <button hlmDropdownMenuItem type="button" (triggered)="navigateToTab(tab.value);"
                  ix-auto ix-auto-type="option" ix-auto-identifier="{{tab.label}}">
                  <span>{{tab.label | translate}}</span>
                </button>
              }
            </hlm-dropdown-menu>
          </ng-template>
        </div>
      </div>
    </nav>
  `,
})
class TabPickerHostComponent {
  activeTab = 'CPU';
  allTabs = [{ label: 'CPU', value: 'cpu' }, { label: 'Disk', value: 'disk' }];
  navigateToTab = jasmine.createSpy('navigateToTab');
}

describe('Reporting tab picker (the internal development record)', () => {
  let fixture: ComponentFixture<TabPickerHostComponent>;
  let overlay: OverlayContainer;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));
  const panel = (): HTMLElement => overlay.getContainerElement().querySelector('hlm-dropdown-menu') as HTMLElement;
  const trigger = (): HTMLButtonElement => fixture.nativeElement.querySelector('#reports-tab-selector') as HTMLButtonElement;

  async function open(): Promise<HTMLElement> {
    trigger().focus();
    trigger().click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return panel();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabPickerHostComponent, TranslateModule.forRoot()] }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(TabPickerHostComponent);
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:800px; z-index:1';
    fixture.detectChanges();
  });

  afterEach(() => overlay.ngOnDestroy());

  it('draws the ghost trigger with the 16px caret and 8px end padding', () => {
    const t = trigger();
    expect(t.getAttribute('ix-auto')).toBe('button__tab-selector');
    expect(t.getAttribute('aria-haspopup')).toBe('menu');
    expect(t.getBoundingClientRect().height).toBe(32);
    const s = getComputedStyle(t);
    expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(s.color).toBe('rgb(151, 166, 174)'); // ghost: fg2
    expect(s.paddingRight).toBe('8px');
    expect(s.borderTopColor).toBe('rgba(0, 0, 0, 0)'); // the ghost tier draws no hairline
    const caret = t.querySelector('.menu-caret') as HTMLElement;
    expect([caret.getBoundingClientRect().width, caret.getBoundingClientRect().height]).toEqual([16, 16]);
    expect(getComputedStyle(caret).opacity).toBe('0.8');
    const label = getComputedStyle(t.querySelector('span')); // inline-flex, blockified to flex inside the inline-flex button
    expect(label.alignItems).toBe('center');
    expect(label.columnGap).toBe('2px');
  });

  it('opens the categories as menu rows, navigates on a pick and returns focus to the trigger', async () => {
    const p = await open();
    expect(p).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const disk = p.querySelector('[ix-auto="option__Disk"]') as HTMLButtonElement;
    expect(disk.getAttribute('role')).toBe('menuitem');
    expect(disk.getBoundingClientRect().height).toBe(32);
    expect(p.querySelectorAll('[role=menuitem]').length).toBe(2);
    disk.click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.navigateToTab).toHaveBeenCalledOnceWith('disk');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    await open();
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(fixture.nativeElement.querySelector('mat-menu, .mat-mdc-menu-trigger')).toBeNull();
  });
});
