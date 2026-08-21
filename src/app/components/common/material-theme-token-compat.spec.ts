import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const DARK_FOREGROUND = 'rgb(151, 166, 174)';
const FOREGROUND_STRONG = 'rgb(220, 227, 230)';
// the internal development record: the select, option and radio arms went with those components (#472); the bridge
// keeps dialogs, lists, menus and buttons.
const LIGHT_FOREGROUND = 'rgb(32, 43, 54)';
const SELECTED_FOREGROUND = 'rgb(255, 255, 255)';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div id="theme-host" class="ix-blue">
      <!-- the internal development record: the sidebar items were the last list items; the token bridge feeds the restated list
           sheet on .fc-nav-item (an item stand-in, as navigation.template.html draws it) -->
      <div class="fc-nav-list" role="list">
        <div class="fc-nav-item" role="listitem">
          <span class="fc-nav-item__content"><span class="fc-nav-item__text"><a>Network route</a></span></span>
        </div>
      </div>

      <!-- the internal development record: a menu built from an anchor must read the same as
           one built from a button. Open Portal is a real link, and fell back to
           MDC's light-theme ink among its grey siblings. -->
      <a id="menu-item-link" class="mat-mdc-menu-item" href="#portal">Open Portal</a>
      <button id="menu-item-button" class="mat-mdc-menu-item">Logs</button>

      <button id="unthemed-button" mat-button>Continue</button>
      <button id="primary-button" mat-button color="primary">Save</button>
      <button id="custom-primary-button" mat-button class="fn-theme-primary" disabled>Log in</button>
    </div>
  `,
})
class MaterialThemeTokenHostComponent {}

describe('Material runtime theme-token compatibility', () => {
  let fixture: ComponentFixture<MaterialThemeTokenHostComponent>;
  let host: HTMLElement;
  let overlayContainer: OverlayContainer;
  let overlayElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaterialThemeTokenHostComponent],
      imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialThemeTokenHostComponent);
    host = fixture.nativeElement.querySelector('#theme-host');
    overlayContainer = TestBed.inject(OverlayContainer);
    overlayElement = overlayContainer.getContainerElement();
    overlayElement.classList.add('ix-blue');
    setThemeForeground(DARK_FOREGROUND);
    setThemeSelection();
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('bridges list, icon, and unthemed-button colors', () => {
    const listItem = host.querySelector('.fc-nav-item') as HTMLElement;
    const listTitle = host.querySelector('.fc-nav-item__text') as HTMLElement;
    const unthemedButton = host.querySelector('#unthemed-button') as HTMLButtonElement;
    const primaryButton = host.querySelector('#primary-button') as HTMLButtonElement;
    const customPrimaryButton = host.querySelector('#custom-primary-button') as HTMLButtonElement;

    expect(getComputedStyle(listTitle).color).toBe(DARK_FOREGROUND);
    expect(getComputedStyle(unthemedButton).color).toBe(DARK_FOREGROUND);
    expect(primaryButton.classList).toContain('mat-primary');
    expect(getComputedStyle(primaryButton).color).not.toBe(DARK_FOREGROUND);
    expect(getComputedStyle(customPrimaryButton).color).toBe(SELECTED_FOREGROUND);
    // the internal development record: a hovered or focused list item keeps the theme foreground (it fell through to
    // MDC's rgba(0, 0, 0, .87)); these were asserted on select options until #473.
    expect(getComputedStyle(listItem).getPropertyValue('--mat-list-list-item-hover-label-text-color').trim()).toBe(DARK_FOREGROUND);
    expect(getComputedStyle(listItem).getPropertyValue('--mat-list-list-item-focus-label-text-color').trim()).toBe(DARK_FOREGROUND);
  });

  it('gives a menu item the theme foreground whether it is a button or a link', () => {
    // The palette colors menu *buttons* through a rule that never matches an
    // anchor, so Open Portal fell back to the MDC token. Overriding the token
    // covers both tags; assert the token, since what consumes it is Material's
    // own runtime-injected menu stylesheet.
    for (const id of ['#menu-item-link', '#menu-item-button']) {
      const item = host.querySelector<HTMLElement>(id);
      expect(getComputedStyle(item).getPropertyValue('--mat-menu-item-label-text-color').trim())
        .withContext(id).toBe(DARK_FOREGROUND);
    }
  });

  it('tracks a light-theme foreground change at runtime', () => {
    setThemeForeground(LIGHT_FOREGROUND);

    const listItem = host.querySelector('.fc-nav-item') as HTMLElement;
    const listTitle = host.querySelector('.fc-nav-item__text') as HTMLElement;
    const button = host.querySelector('#unthemed-button') as HTMLButtonElement;

    expect(getComputedStyle(listTitle).color).toBe(LIGHT_FOREGROUND);
    expect(getComputedStyle(listItem).getPropertyValue('--mat-list-list-item-hover-label-text-color').trim()).toBe(LIGHT_FOREGROUND);
    expect(getComputedStyle(button).color).toBe(LIGHT_FOREGROUND);
  });


  function setThemeForeground(color: string): void {
    (fixture.nativeElement as HTMLElement).style.setProperty('--fg2', color);
    host.style.setProperty('--fg2', color);
    overlayElement.style.setProperty('--fg2', color);
    // --fg1 is the stronger foreground of the ladder; set it with --fg2 as the theme service does.
    for (const el of [fixture.nativeElement as HTMLElement, host, overlayElement]) {
      el.style.setProperty('--fg1', FOREGROUND_STRONG);
    }
  }

  function setThemeSelection(): void {
    (fixture.nativeElement as HTMLElement).style.setProperty('--primary', 'rgb(0, 149, 213)');
    (fixture.nativeElement as HTMLElement).style.setProperty('--primary-txt', SELECTED_FOREGROUND);
    (fixture.nativeElement as HTMLElement).style.setProperty('--bg2', 'rgb(23, 30, 36)');
    host.style.setProperty('--primary', 'rgb(0, 149, 213)');
    host.style.setProperty('--primary-txt', SELECTED_FOREGROUND);
    host.style.setProperty('--bg2', 'rgb(23, 30, 36)');
    overlayElement.style.setProperty('--primary', 'rgb(0, 149, 213)');
    overlayElement.style.setProperty('--primary-txt', SELECTED_FOREGROUND);
    overlayElement.style.setProperty('--bg2', 'rgb(23, 30, 36)');
  }
});
