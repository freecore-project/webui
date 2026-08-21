import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, of, Subject } from 'rxjs';
import { MaterialModule } from '../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../directives/common/common-directives.module';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DialogService } from '../../../services/dialog.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationsService } from '../../../services/notifications.service';
import { SystemGeneralService } from '../../../services/system-general.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { WebSocketService } from '../../../services/ws.service';
import { AboutModalDialog } from '../dialog/about/about-dialog.component';
import { TopbarComponent } from './topbar.component';

// the internal development record: the shell's two menus -- Settings (account) and Power -- on the helm
// dropdown-menu, rendered from the REAL topbar template: the triggers stay the shell's icon buttons,
// the panels align to the trigger's end, the rows keep their ids/ix-auto hooks (the old-ui-test
// selenium suite finds `button[name='power-log-out']`), About opens its dialog through `(triggered)`,
// Escape returns focus, and nothing Material (nor the #308 spacer rows) is left in the menus.
describe('topbar menus (the internal development record)', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let overlay: OverlayContainer;
  let ws: any;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const tooltip = (): HTMLElement | null => overlay.getContainerElement().querySelector('[role="tooltip"]');
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const panel = (): HTMLElement => overlay.getContainerElement().querySelector('hlm-dropdown-menu.topbar-menu') as HTMLElement;
  const escape = (): KeyboardEvent => new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });

  async function open(trigger: string): Promise<HTMLElement> {
    q(trigger).focus();
    q(trigger).click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return panel();
  }

  beforeEach(async () => {
    ws = { subscribe: () => EMPTY, call: () => of(null), logout: jasmine.createSpy('logout'), unsubscribe: () => undefined };
    await TestBed.configureTestingModule({
      declarations: [TopbarComponent],
      imports: [MaterialModule, NoopAnimationsModule, RouterModule, TranslateModule.forRoot(), CommonDirectivesModule, ...HlmButtonImports, ...HlmDropdownMenuImports, ...HlmTooltipImports],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: { themesMenu: [], currentTheme: () => ({ name: 'ix-blue' }) } },
        { provide: NotificationsService, useValue: { getNotificationList: () => [], getNotifications: () => of([]) } },
        { provide: WebSocketService, useValue: ws },
        { provide: LanguageService, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: SystemGeneralService, useValue: { updateRunningNoticeSent: new Subject() } },
        { provide: AppLoaderService, useValue: {} },
      ],
    }).compileComponents();
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(TopbarComponent);
    // the harness's CoreService stub emits `{}` on register; the topbar reads `evt.data.*`, so a silent bus stands in
    (fixture.componentInstance as any).core = { register: () => new Subject(), emit: () => undefined, unregister: () => undefined };
    fixture.componentInstance.sidenav = { opened: false };
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; width:100%; z-index:1'; // the viewport's width, so the end-aligned panels are not pushed
    fixture.detectChanges();
  });

  afterEach(() => {
    overlay.ngOnDestroy();
    fixture.destroy();
  });

  it('opens the Settings menu at the trigger end with the account rows and their hooks', async () => {
    const trigger = q('[ix-auto="button__settings"]');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.classList).toContain('topbar-button-right');
    const p = await open('[ix-auto="button__settings"]');
    expect(p).not.toBeNull();
    expect(Math.round(p.getBoundingClientRect().right - trigger.getBoundingClientRect().right)).toBe(0);
    const rows = Array.from(p.querySelectorAll<HTMLButtonElement>('[role=menuitem]'));
    expect(rows.map((r) => r.getAttribute('name'))).toEqual(['settings-change-password', 'settings-preferences', 'settings-api', 'settings-about']);
    expect(rows.map((r) => r.getAttribute('ix-auto'))).toEqual(['option__Change Password', 'option__Preferences', 'option__API', 'option__About']);
    for (const row of rows) {
      expect(row.getBoundingClientRect().height).withContext(row.name).toBe(32);
      const glyph = row.querySelector('mat-icon') as HTMLElement;
      expect([glyph.getBoundingClientRect().width, glyph.getBoundingClientRect().height]).withContext(row.name).toEqual([16, 16]);
    }
    expect(p.querySelector('.hidden-button, [mat-menu-item], .mat-mdc-menu-item')).toBeNull();
    (document.activeElement as HTMLElement).dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens About from its row through the menu trigger and closes the menu', async () => {
    const dialog = TestBed.inject(MatDialog);
    const opened = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(null) } as any);
    const trigger = q('[ix-auto="button__settings"]');
    const p = await open('[ix-auto="button__settings"]');
    (p.querySelector('button[name="settings-about"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await settle();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened.calls.mostRecent().args[0]).toBe(AboutModalDialog);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens the Power menu with the three rows and fires nothing by opening', async () => {
    const trigger = q('[ix-auto="button__power"]');
    const p = await open('[ix-auto="button__power"]');
    expect(p).not.toBeNull();
    expect(Math.round(p.getBoundingClientRect().right - trigger.getBoundingClientRect().right)).toBe(0);
    const rows = Array.from(p.querySelectorAll<HTMLButtonElement>('[role=menuitem]'));
    expect(rows.map((r) => r.getAttribute('name'))).toEqual(['power-log-out', 'power-restart', 'power-shut-down']);
    expect(rows.map((r) => r.getAttribute('ix-auto'))).toEqual(['option__Log Out', 'option__Restart', 'option__Shut Down']);
    expect(ws.logout).not.toHaveBeenCalled();
    (document.activeElement as HTMLElement).dispatchEvent(escape());
    fixture.detectChanges();
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(fixture.nativeElement.querySelector('mat-menu, .mat-mdc-menu-trigger, .hidden-button')).toBeNull();
  });

  // the internal development record: the shell's icon buttons carry the helm tooltip -- the brain's [role=tooltip]
  // panel in the CDK overlay, described to the trigger, above it by default and to the right of the
  // sidenav toggle; nothing Material renders for it.
  it('labels the shell buttons with the helm tooltip on hover and lets go on leave', async () => {
    fixture.nativeElement.style.top = '120px'; // headroom: the CDK flips a panel that would not fit above its trigger
    await fixture.whenStable(); // the brain wires its hover listeners in afterNextRender
    const trigger = q('#task-manager');
    expect(trigger.getAttribute('aria-label')).toBe('Task Manager'); // the aria-label stays beside the tooltip
    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); // mouse/pen only
    await wait(250); // >= the 150 ms show delay
    fixture.detectChanges();
    const p = tooltip();
    expect(p).not.toBeNull();
    expect(p.textContent.trim()).toBe('Task Manager');
    expect(p.getAttribute('data-state')).toBe('open');
    expect(p.getAttribute('data-side')).toBe('top');
    expect(trigger.getAttribute('aria-describedby')).toBe(p.id);
    expect(p.getBoundingClientRect().bottom).toBeLessThanOrEqual(trigger.getBoundingClientRect().top);
    expect(overlay.getContainerElement().querySelector('.mat-mdc-tooltip, .mat-mdc-tooltip-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mat-mdc-tooltip-trigger')).toBeNull();
    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await wait(150); // the 100 ms hide delay flips data-state to closed
    fixture.detectChanges(); // the brain schedules its detach in afterNextRender: a render must follow the close
    await wait(300); // the 100 ms exit fade + the animation wait
    fixture.detectChanges();
    expect(tooltip()).toBeNull();
    expect(trigger.hasAttribute('aria-describedby')).toBeFalse();
    // the sidenav toggle keeps its right-hand placement
    const toggle = q('#sidenavToggle');
    toggle.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await wait(250);
    fixture.detectChanges();
    const t = tooltip();
    expect(t).not.toBeNull();
    expect(t.textContent.trim()).toBe('Toggle Hide/Open');
    expect(t.getAttribute('data-side')).toBe('right');
    expect(t.getBoundingClientRect().left).toBeGreaterThanOrEqual(toggle.getBoundingClientRect().right);
    toggle.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await wait(150);
    fixture.detectChanges(); // the render that lets afterNextRender schedule the detach
    await wait(300);
    fixture.detectChanges();
    expect(tooltip()).toBeNull();
  });
});
