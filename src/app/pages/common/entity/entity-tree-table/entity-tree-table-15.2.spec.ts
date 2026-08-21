import { CommonModule } from '@angular/common';
import { Component, getDebugNode } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of } from 'rxjs';

import { MaterialModule } from '../../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { DialogService, WebSocketService } from '../../../../services';
import { EntityTreeTableComponent } from './entity-tree-table.component';
import { EntityTreeNode, EntityTreeTable } from './entity-tree-table.model';
import { FileSizePipe } from './filesize.pipe';

// the internal development record: the tree table on the list table's geometry once it is
// inside the shell scope. The component's own spec keeps measuring its 36px
// rows outside .fc-ui; this one mounts the real component under it and reads
// the shared rule -- 32px header, 40px rows, no stripes, one hairline.
@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue" style="display:block; width: 720px;">
      <entity-tree-table [conf]="conf" [expandRootNodes]="true"></entity-tree-table>
    </div>
  `,
})
class TreeHostComponent {
  nodes: EntityTreeNode[] = [
    { data: { name: 'tank', type: 'Filesystem', used: 98304, group_actions: true, actions: [
      { title: 'Dataset Actions', actions: [{ label: 'Edit Options', onClick: (row: any) => this.edited.push(row.name) }, { label: 'Delete Dataset', onClick: () => {} }, { label: 'Hidden', onClick: () => {}, isHidden: true }] },
      { title: 'Encryption Actions', actions: [{ label: 'Lock', onClick: () => {} }] },
      { title: 'Empty', actions: [] },
    ] }, children: [{ data: { name: 'tank/archive', type: 'Filesystem', used: 4096, actions: [{ label: 'Edit Options', onClick: () => {} }, { label: 'Delete Dataset', onClick: () => {} }] } }] },
    { data: { name: 'boot-pool', type: 'Filesystem', used: 2048 } },
  ];
  edited: string[] = [];
  // the Pools tree's root-dataset guard: the conf's clickAction disables a row (with a tooltip) when the menu opens
  clickAction = jasmine.createSpy('clickAction').and.callFake((row: any) => { if (row.group_actions) { const a = row.actions[0].actions[1]; a.disabled = true; a.matTooltip = 'Root dataset'; } });
  conf: EntityTreeTable = {
    columns: [{ name: 'Name', prop: 'name' }, { name: 'Type', prop: 'type' }, { name: 'Used', prop: 'used', filesizePipe: true }],
    tableData: this.nodes,
    clickAction: this.clickAction,
  };
}

describe('15.2 tree table (the internal development record)', () => {
  let fixture: ComponentFixture<TreeHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--accent': '#8FB4C7', '--primary': '#4E93C4' };
  const fg1 = 'rgb(220, 227, 230)';
  const fg2 = 'rgb(151, 166, 174)';
  const line = 'rgb(42, 53, 61)';
  const clear = 'rgba(0, 0, 0, 0)';

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({
      declarations: [TreeHostComponent, EntityTreeTableComponent, FileSizePipe],
      imports: [CommonModule, CommonDirectivesModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmDropdownMenuImports, HlmTooltipImports],
      providers: [
        { provide: WebSocketService, useValue: { call: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TreeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key));
  });

  it('draws a 32px uppercase header over a hairline and 40px rows in fg1 with 12px cells', () => {
    const header = root.querySelector('thead tr') as HTMLElement;
    const th = root.querySelector('thead th') as HTMLElement;
    expect(header.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(th).textTransform).toBe('uppercase');
    expect(getComputedStyle(th).fontSize).toBe('11px');
    expect(getComputedStyle(th).fontWeight).toBe('500');
    expect(getComputedStyle(th).color).toBe(fg2);
    expect(getComputedStyle(th).paddingLeft).toBe('12px');
    expect(getComputedStyle(th).borderBottomColor).toBe(line);

    const rows = Array.from(root.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    rows.forEach((row) => {
      const cell = row.querySelector('td') as HTMLElement;
      expect(row.getBoundingClientRect().height).withContext(row.textContent.trim()).toBe(40);
      expect(getComputedStyle(cell).color).toBe(fg1);
      expect(getComputedStyle(cell).fontSize).toBe('13px');
      expect(getComputedStyle(cell).paddingLeft).toBe('12px');
      expect(getComputedStyle(cell).borderBottomColor).toBe(line);
      expect(getComputedStyle(cell).borderLeftWidth).toBe('0px');
    });
  });

  it('keeps every row on the transparent surface, no stripes, with the toggler quiet', () => {
    const rows = Array.from(root.querySelectorAll('tbody tr')) as HTMLElement[];
    rows.forEach((row) => expect(getComputedStyle(row).backgroundColor).withContext(row.textContent.trim()).toBe(clear));
    expect(getComputedStyle(root.querySelector('table')).backgroundColor).toBe(clear);
    const toggler = root.querySelector('.entity-tree-table__toggler') as HTMLElement;
    expect(getComputedStyle(toggler).color).toBe(fg2);
    expect(getComputedStyle(toggler).borderTopLeftRadius).toBe('6px');
  });

  // the internal development record: the row menu is the #405 kebab on the #407 helm dropdown-menu (M1).
  it('draws the row kebab as a 32px ghost icon button centred in the actions column, no Material menu', () => {
    const rows = Array.from(root.querySelectorAll('tbody tr')) as HTMLElement[];
    const cell = rows[0].querySelector('.entity-tree-table__actions-column') as HTMLElement;
    const kebab = cell.querySelector('button.row-kebab') as HTMLButtonElement;
    expect(kebab).not.toBeNull();
    expect(kebab.id).toBe('actions_menu_button__tank');
    expect(kebab.getAttribute('ix-auto')).toBe('options__tank');
    expect(kebab.getAttribute('aria-haspopup')).toBe('menu');
    expect(kebab.getAttribute('aria-label')).toBe('Actions');
    expect(kebab.type).toBe('button');
    expect([kebab.getBoundingClientRect().width, kebab.getBoundingClientRect().height]).toEqual([32, 32]);
    expect(getComputedStyle(kebab).backgroundColor).toBe(clear);
    expect(getComputedStyle(kebab).color).toBe(fg2);
    expect(kebab.querySelector('mat-icon').getBoundingClientRect().width).toBe(20);
    const c = cell.getBoundingClientRect(); const k = kebab.getBoundingClientRect();
    expect(Math.abs((k.left + k.right) / 2 - (c.left + c.right) / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs((k.top + k.bottom) / 2 - (rows[0].getBoundingClientRect().top + rows[0].getBoundingClientRect().bottom) / 2)).toBeLessThanOrEqual(1);
    expect(rows[0].getBoundingClientRect().height).toBe(40);
    expect(rows[2].querySelector('.entity-tree-table__actions-column button')).toBeNull(); // no actions on boot-pool
    expect(root.querySelector('mat-menu, [matMenuTriggerFor]')).toBeNull();
    // the row-action dimming law (#405/#406): .5 until the row is hovered / the button focused
    expect(getComputedStyle(kebab).opacity).toBe('0.5');
    const hover = Array.from(document.styleSheets).flatMap((sheet) => { try { return Array.from(sheet.cssRules); } catch { return []; } }).find((rule) => (rule as CSSStyleRule).selectorText?.includes('.fc-ui .entity-tree-table tbody tr:hover .row-kebab')) as CSSStyleRule;
    expect(hover).toBeDefined();
    expect(hover.style.opacity).toBe('1');
    const focused = Array.from(document.styleSheets).flatMap((sheet) => { try { return Array.from(sheet.cssRules); } catch { return []; } }).find((rule) => (rule as CSSStyleRule).selectorText?.includes('.fc-ui .entity-tree-table .row-kebab:focus-visible')) as CSSStyleRule;
    expect(focused.style.opacity).toBe('1'); // (the 120ms transition makes a live read racy)
  });

  it('opens the grouped row menu with headings on separators, the conf guard disabling a row (tooltip kept) on open, and acts and closes', async () => {
    const overlay = TestBed.inject(OverlayContainer);
    const kebab = root.querySelector<HTMLButtonElement>('#actions_menu_button__tank');
    kebab.focus();
    kebab.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 200)); // past the 120ms opacity transition
    fixture.detectChanges();
    expect(fixture.componentInstance.clickAction).toHaveBeenCalledWith(fixture.componentInstance.nodes[0].data); // ran on the open event
    expect(kebab.getAttribute('aria-expanded')).toBe('true');
    expect(getComputedStyle(kebab).opacity).toBe('1'); // open: undimmed
    const panel = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.row-menu');
    expect(panel).not.toBeNull();
    expect(overlay.getContainerElement().querySelector('.mat-mdc-menu-panel')).toBeNull();
    expect(getComputedStyle(panel).backgroundColor).toBe('rgb(23, 30, 36)');
    expect(getComputedStyle(panel).borderTopColor).toBe(line);
    expect(panel.getBoundingClientRect().width).toBeGreaterThanOrEqual(200);
    const labels = Array.from(panel.querySelectorAll<HTMLElement>('hlm-dropdown-menu-label'));
    expect(labels.map((l) => l.textContent.trim())).toEqual(['Dataset Actions', 'Encryption Actions']); // the empty group draws nothing
    expect(labels[0].getBoundingClientRect().height).toBe(24);
    expect(getComputedStyle(labels[0]).textTransform).toBe('uppercase');
    expect(getComputedStyle(labels[0]).color).toBe(fg2);
    expect(panel.querySelectorAll('hlm-dropdown-menu-separator').length).toBe(1);
    expect(panel.children[0].tagName).toBe('HLM-DROPDOWN-MENU-LABEL');
    const wrappers = Array.from(panel.querySelectorAll<HTMLElement>('.row-menu-item'));
    expect(wrappers.map((w) => w.id)).toEqual(['action_button__tank_Edit Options', 'action_button__tank_Delete Dataset', 'action_button__tank_Lock']); // the hidden row is skipped
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('[hlmDropdownMenuItem]'));
    expect(items.map((i) => i.getAttribute('ix-auto'))).toEqual(['action__tank_Edit Options', 'action__tank_Delete Dataset', 'action__tank_Lock']);
    expect(items[0].getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(items[0]).fontSize).toBe('13px');
    expect(items[1].disabled).toBeTrue(); // disabled by the guard, before the first paint
    expect(getComputedStyle(items[1]).opacity).toBe('0.4');
    expect(getComputedStyle(wrappers[1]).display).toBe('block');
    await fixture.whenStable(); // the brain wires its hover listeners in afterNextRender
    wrappers[1].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); // the brain opens on mouse/pen hover only
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600)); // >= the 150 ms show delay
    fixture.detectChanges();
    const tip = overlay.getContainerElement().querySelector('[role="tooltip"]');
    expect(tip?.textContent.trim()).toBe('Root dataset');
    // the grouped row menu's default is 'left' (the ungrouped one is 'bottom'); the binding, not the CDK-resolved data-side
    expect(getDebugNode(wrappers[1]).injector.get(BrnTooltip).position()).toBe('left');
    wrappers[1].dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await new Promise((resolve) => setTimeout(resolve, 150)); // the hide delay
    fixture.detectChanges(); // the render that lets afterNextRender schedule the detach
    await new Promise((resolve) => setTimeout(resolve, 300)); // the exit fade
    fixture.detectChanges();
    expect(overlay.getContainerElement().querySelector('[role="tooltip"]')).toBeNull();
    expect(document.activeElement).toBe(items[0]);
    items[0].click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fixture.componentInstance.edited).toEqual(['tank']);
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    expect(document.activeElement).toBe(kebab);
    // the flat (ungrouped) child row: no headings
    const child = root.querySelector<HTMLButtonElement>('[id="actions_menu_button__tank/archive"]');
    child.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const flat = overlay.getContainerElement().querySelector<HTMLElement>('hlm-dropdown-menu.row-menu');
    expect(flat.querySelector('hlm-dropdown-menu-label')).toBeNull();
    expect(Array.from(flat.querySelectorAll('[hlmDropdownMenuItem]')).map((i) => i.getAttribute('ix-auto'))).toEqual(['action__tank/archive_Edit Options', 'action__tank/archive_Delete Dataset']);
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu')).toBeNull();
    // ArrowDown opens without a click (CDK): the guard still runs
    fixture.componentInstance.clickAction.calls.reset();
    kebab.focus();
    kebab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(overlay.getContainerElement().querySelector('hlm-dropdown-menu.row-menu')).not.toBeNull();
    expect(fixture.componentInstance.clickAction).toHaveBeenCalledTimes(1);
    overlay.ngOnDestroy();
  });
});
