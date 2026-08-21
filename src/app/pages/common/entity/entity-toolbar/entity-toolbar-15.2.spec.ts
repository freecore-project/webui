import { OverlayContainer } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { Subject } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { EntityToolbarComponent } from './entity-toolbar.component';
import { ToolbarButtonComponent } from './components/toolbar-button/toolbar-button.component';
import { ToolbarMenuComponent } from './components/toolbar-menu/toolbar-menu.component';
import { ToolbarMultimenuComponent } from './components/toolbar-multimenu/toolbar-multimenu.component';

// the Reporting > Disk toolbar shape: two multimenus (one option carrying the custom multipath glyph)
@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="fc-ui ix-blue" style="display:block; width: 900px;">
      <entity-toolbar [conf]="conf" [target]="controller"></entity-toolbar>
    </div>
  `,
})
class ToolbarHostComponent {
  controller = new Subject<any>();
  messages: any[] = [];
  // the preselected value must be the option object itself (indexOf), as reportsdashboard passes it
  devices = [{ label: 'ada0', value: 'ada0' }, { label: 'ada1', value: 'ada1' }, { label: 'da0', value: 'da0', labelIcon: 'multipath', labelIconType: 'custom' }];
  conf = [
    { type: 'multimenu', name: 'devices', label: 'Devices', disabled: false, options: this.devices, value: [this.devices[0]] },
    { type: 'menu', name: 'period', label: 'Period', disabled: false, options: ['Hour', 'Day'] },
    { type: 'button', name: 'refresh', label: 'Refresh', disabled: false },
  ];
  // the toolbar relays every control change to its target as ToolbarChanged with the values map
  constructor() { this.controller.subscribe((m) => { if (m.name === 'ToolbarChanged') { this.messages.push({ ...m.data }); } }); }
}

// the internal development record: the Reporting toolbar on spartan -- the ghost trigger with the caret (the bar is
// the text tier: its tab picker sits beside these),
// the #407 menus (checkbox rows with a display-only #352 box in the multi-select, keep-open
// Select All), the toolbar button on the outline tier.
describe('15.2 entity toolbar (the internal development record)', () => {
  let fixture: ComponentFixture<ToolbarHostComponent>;
  let root: HTMLElement;
  let overlay: OverlayContainer;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7' };
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const line = 'rgb(42, 53, 61)';
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({
      declarations: [ToolbarHostComponent, EntityToolbarComponent, ToolbarButtonComponent, ToolbarMenuComponent, ToolbarMultimenuComponent],
      imports: [CommonModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmDropdownMenuImports],
      providers: [{ provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } }],
    }).compileComponents();
    const registry = TestBed.inject(MatIconRegistry);
    registry.addSvgIconLiteral('multipath', TestBed.inject(DomSanitizer).bypassSecurityTrustHtml('<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>'));
    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(ToolbarHostComponent);
    fixture.nativeElement.style.cssText = 'position:fixed; top:0; left:0; z-index:1';
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    overlay.ngOnDestroy();
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
  });

  it('draws the three controls on the ghost tier, the menu triggers ending in the 16px caret, no Material buttons', () => {
    const multi = root.querySelector<HTMLButtonElement>('#toolbar-multimenu__devices');
    const menu = root.querySelector<HTMLButtonElement>('#toolbar-menu__period');
    const button = root.querySelector<HTMLButtonElement>('#toolbar-button__refresh');
    [multi, menu, button].forEach((b) => {
      expect(b).not.toBeNull();
      expect(b.type).toBe('button');
      expect(b.getBoundingClientRect().height).toBe(32);
      expect(getComputedStyle(b).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(b).borderTopColor).toBe('rgba(0, 0, 0, 0)'); // ghost: no hairline
      expect(getComputedStyle(b).color).toBe(fg2);
      expect(getComputedStyle(b).fontSize).toBe('13px');
      expect(getComputedStyle(b).paddingLeft).toBe('14px');
    });
    expect(multi.textContent.replace(/\s+/g, ' ').trim()).toBe('Devices expand_more');
    expect(multi.getAttribute('aria-haspopup')).toBe('menu');
    [multi, menu].forEach((b) => {
      expect(getComputedStyle(b).paddingRight).toBe('8px');
      const caret = b.querySelector<HTMLElement>('.menu-caret');
      expect([caret.getBoundingClientRect().width, caret.getBoundingClientRect().height]).toEqual([16, 16]);
      expect(Math.abs((caret.getBoundingClientRect().top + caret.getBoundingClientRect().bottom) / 2 - (b.getBoundingClientRect().top + b.getBoundingClientRect().bottom) / 2)).toBeLessThanOrEqual(1);
    });
    expect(getComputedStyle(button).paddingRight).toBe('14px');
    expect(root.querySelector('.mat-mdc-button, mat-menu')).toBeNull();
    // the initial selection is announced once, as before
    expect(fixture.componentInstance.messages.length).toBe(1);
    expect(fixture.componentInstance.messages[0].devices).toEqual([{ label: 'ada0', value: 'ada0' }]);
  });

  it('opens the multi-select as checkbox rows with real boxes that stay open, Select All keep-open, the glyph at the row end', async () => {
    const host = fixture.componentInstance;
    const trigger = root.querySelector<HTMLButtonElement>('#toolbar-multimenu__devices');
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.toolbar-multimenu');
    expect(panel).not.toBeNull();
    expect(overlay.getContainerElement().querySelector('.mat-mdc-menu-panel')).toBeNull();
    const rows = Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'));
    expect(rows.map((r) => r.id)).toEqual(['toolbar-multimenu__devices__ada0', 'toolbar-multimenu__devices__ada1', 'toolbar-multimenu__devices__da0']);
    expect(rows.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(rows[0].getBoundingClientRect().height).toBe(32);
    const box = rows[0].querySelector<HTMLButtonElement>('.menu-box button[role="checkbox"]');
    expect([box.getBoundingClientRect().width, box.getBoundingClientRect().height]).toEqual([16, 16]);
    expect(box.getAttribute('data-state')).toBe('checked');
    expect(getComputedStyle(box).backgroundColor).toBe(fg1);
    expect(rows[0].querySelector('.menu-box').hasAttribute('inert')).toBeTrue();
    expect(panel.querySelector('[role="menuitemcheckbox"] mat-icon:not(.icon-suffix mat-icon)')).toBeNull(); // no check-circle glyphs
    const glyph = rows[2].querySelector<HTMLElement>('.icon-suffix mat-icon');
    expect(glyph).not.toBeNull();
    expect(glyph.querySelector('svg')).not.toBeNull(); // the custom multipath icon
    expect(glyph.getBoundingClientRect().width).toBe(16);
    expect(getComputedStyle(glyph).color).toBe(fg2);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(getComputedStyle(trigger).backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // the open trigger sits on the hover surface
    expect(Math.round(rows[2].getBoundingClientRect().right - glyph.getBoundingClientRect().right)).toBe(12); // at the row end, inside the 12px side
    const all = panel.querySelector<HTMLButtonElement>('#toolbar-multimenu__devices__all');
    expect(all.getAttribute('role')).toBe('menuitem');
    expect(all.textContent).toContain('Select All');
    // toggle ada1 on: stays open, announced
    rows[1].click();
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.toolbar-multimenu')).not.toBeNull();
    expect(rows[1].getAttribute('aria-checked')).toBe('true');
    expect(rows[1].querySelector('.menu-box button[role="checkbox"]').getAttribute('data-state')).toBe('checked'); // the display box follows
    expect(host.messages[host.messages.length - 1].devices).toEqual([{ label: 'ada0', value: 'ada0' }, { label: 'ada1', value: 'ada1' }]);
    all.click();
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.toolbar-multimenu')).not.toBeNull();
    expect(rows.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true']);
    expect(rows.map((r) => r.querySelector('.menu-box button[role="checkbox"]').getAttribute('data-state'))).toEqual(['checked', 'checked', 'checked']);
    expect(all.textContent).toContain('Unselect All');
    expect(all.querySelector('mat-icon').textContent.trim()).toBe('check_box_outline_blank');
    expect(host.messages[host.messages.length - 1].devices.length).toBe(3);
    all.click();
    fixture.detectChanges();
    await settle();
    expect(rows.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false']);
    expect(rows.map((r) => r.querySelector('.menu-box button[role="checkbox"]').getAttribute('data-state'))).toEqual(['unchecked', 'unchecked', 'unchecked']);
    expect(all.querySelector('mat-icon').textContent.trim()).toBe('select_all');
    expect(host.messages[host.messages.length - 1].devices).toEqual([]);
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens the single menu as plain rows that act and close, and the button announces its click', async () => {
    const host = fixture.componentInstance;
    const trigger = root.querySelector<HTMLButtonElement>('#toolbar-menu__period');
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu');
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('[hlmDropdownMenuItem]'));
    expect(items.map((i) => i.id)).toEqual(['toolbar-menu__period__Hour', 'toolbar-menu__period__Day']);
    expect(items.map((i) => i.textContent.trim())).toEqual(['Hour', 'Day']);
    expect(getComputedStyle(items[0]).color).toBe(fg1);
    items[1].click();
    fixture.detectChanges();
    await settle();
    expect(host.messages[host.messages.length - 1].period).toBe('Day');
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    root.querySelector<HTMLButtonElement>('#toolbar-button__refresh').click();
    expect(host.messages[host.messages.length - 1].refresh).toBeTrue();
  });

  it('opens from the keyboard with ArrowDown (the Select All row focused, Space keeps it open) and honours a disabled control', async () => {
    const host = fixture.componentInstance;
    const trigger = root.querySelector<HTMLButtonElement>('#toolbar-multimenu__devices');
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.toolbar-multimenu')).not.toBeNull();
    expect(document.activeElement.id).toBe('toolbar-multimenu__devices__all');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement.id).toBe('toolbar-multimenu__devices__ada0');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true }));
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.toolbar-multimenu')).not.toBeNull(); // a checkbox row keeps it open
    expect(root.querySelector('#toolbar-multimenu__devices').getAttribute('aria-expanded')).toBe('true');
    expect(host.messages[host.messages.length - 1].devices).toEqual([]); // ada0 was the one selected: toggled off
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    host.conf[1].disabled = true;
    fixture.detectChanges();
    const menu = root.querySelector<HTMLButtonElement>('#toolbar-menu__period');
    expect(menu.disabled).toBeTrue();
    menu.click();
    fixture.detectChanges();
    await settle();
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
  });
});
