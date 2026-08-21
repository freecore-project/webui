import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { DocsService } from '../../../../../../services/docs.service';
import { TooltipDocReplacePipe } from './tooltip-docreplace';
import { TooltipComponent } from './tooltip.component';

// the internal development record: the help popover on the dialog surface. The real
// component pins var(--primary) !important on its own text box; under .fc-ui
// the #354 surface wins anyway. Theme rules in the cascade (host is ix-blue).
@Component({
  standalone: false,
  // The component looks for its form container (mat-card, or entity-form's div.form-card since
  // the internal development record); give it one of each.
  template: `
    <div class="fc-ui ix-blue" style="width: 640px;">
      <mat-card style="position: relative; display: block; padding: 24px;">
        <tooltip header="GUI SSL Certificate" message="The system uses a self-signed certificate."></tooltip>
      </mat-card>
      <entity-form>
        <div class="form-card" style="position: relative; display: block; padding: 24px;">
          <div class="dynamic-field has-tooltip" style="position: relative;">
            <tooltip id="in-form" header="Hostname" message="The host name."></tooltip>
          </div>
        </div>
      </entity-form>
    </div>
  `,
})
class TooltipHostComponent {}

describe('15.2 help popover (the internal development record)', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;
  let root: HTMLElement;
  const themeVars = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4', '--primary-txt': '#ffffff' };

  beforeEach(async () => {
    Object.entries(themeVars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({
      declarations: [TooltipHostComponent, TooltipComponent, TooltipDocReplacePipe],
      imports: [MatCardModule, MatIconModule, DragDropModule, TranslateModule.forRoot()],
      providers: [{ provide: DocsService, useValue: { docReplace: (text: string) => text } }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => Object.keys(themeVars).forEach((key) => document.documentElement.style.removeProperty(key)));

  it('opens on the bg2 surface with a hairline, fg1 header and fg2 message -- not the primary slab', () => {
    (root.querySelector('.tooltip-icon') as HTMLElement).click();
    fixture.detectChanges();
    const box = root.querySelector('.tooltiptext') as HTMLElement;
    const wrap = root.querySelector('.tooltip-container') as HTMLElement;
    expect(box.classList).toContain('show');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(23, 30, 36)');
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(wrap).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(root.querySelector('.tooltip-header-text')).color).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(root.querySelector('.tooltip-message')).color).toBe('rgb(151, 166, 174)');
  });

  it('draws a 10px caret on the panel surface with a hairline, not the 20px primary diamond (the internal development record)', () => {
    (root.querySelector('.tooltip-icon') as HTMLElement).click();
    fixture.detectChanges();
    const box = root.querySelector('.tooltiptext') as HTMLElement;
    const tail = getComputedStyle(box, '::before');
    expect(tail.width).toBe('10px');
    expect(tail.height).toBe('10px');
    expect(tail.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(tail.transform).not.toBe('none');
    const edges = [tail.borderTopWidth, tail.borderRightWidth, tail.borderBottomWidth, tail.borderLeftWidth].filter((w) => w === '1px');
    expect(edges.length).toBe(2);
    expect([tail.borderTopColor, tail.borderRightColor, tail.borderBottomColor, tail.borderLeftColor]).toContain('rgb(42, 53, 61)');
  });

  it('opens to the left when the panel would not fit between the glyph and the viewport edge (the internal development record)', () => {
    const tooltip = root.querySelector('.tooltip') as HTMLElement;
    const component = fixture.debugElement.query((el) => el.name === 'tooltip').componentInstance as TooltipComponent;
    const icon = root.querySelector('.tooltip-icon') as HTMLElement;
    // At the card's left edge the 458px span fits: right.
    icon.click();
    fixture.detectChanges();
    expect(component.positionString).toBe('right');
    icon.click();
    fixture.detectChanges();
    // Shifted to 200px from the viewport's right edge (relative, so offsetParent survives): left.
    tooltip.style.cssText = `position: relative; left: ${window.innerWidth - 200 - tooltip.getBoundingClientRect().left}px;`;
    icon.click();
    fixture.detectChanges();
    expect(component.positionString).toBe('left');
  });

  it('finds entity-form\'s div.form-card as its container and opens to the right where the panel fits (the internal development record)', () => {
    const host = root.querySelector('#in-form') as HTMLElement;
    const component = fixture.debugElement.query((el) => el.name === 'tooltip' && el.nativeElement.id === 'in-form').componentInstance as TooltipComponent;
    const icon = host.querySelector('.tooltip-icon') as HTMLElement;
    expect(component.findParent()).toBe(root.querySelector('entity-form .form-card'));
    expect(component.isWizard).toBeFalse();
    icon.click();
    fixture.detectChanges();
    expect(component.positionString).toBe('right');
    expect(host.querySelector('.tooltiptext').classList).toContain('right');
  });
});

// the internal development record: the side is measured against where the panel can be seen -- the content hold
// (it clips at the sidebar) or, in the overlays, the viewport -- not decided by finding a card.
@Component({
  standalone: false,
  template: `
    <div class="fc-ui ix-blue">
      <section class="fc-page" id="page-law" style="position: fixed; left: 0; top: 0; width: 100%;">
        <span>Retro Logo</span><tooltip id="pl-left" header="Retro Logo" message="Show the old logo."></tooltip>
      </section>
      <div class="rightside-content-hold" id="hold-narrow" style="position: fixed; left: 100px; top: 120px; width: 560px; height: 300px; overflow-x: hidden;">
        <div style="padding-left: 200px;"><tooltip id="narrowed" header="Name" message="Narrowed to the room on the wider side."></tooltip></div>
      </div>
      <div class="rightside-content-hold" id="hold-phone" style="position: fixed; left: 0; top: 440px; width: 300px; height: 200px; overflow-x: hidden;">
        <div style="padding-left: 150px;"><tooltip id="under" header="Enabled" message="Neither side has room: under the glyph."></tooltip></div>
      </div>
      <mat-dialog-container id="dialog" style="display: block; position: fixed; top: 300px; right: 20px; width: 260px;">
        <div style="text-align: right;"><tooltip id="in-dialog" header="Root Password" message="Opens where it fits, not forced right."></tooltip></div>
      </mat-dialog-container>
      <entity-wizard style="display: block; position: fixed; left: 0; top: 660px;">
        <div class="form-card"><tooltip id="in-wizard" header="Name" message="Stays in its step."></tooltip></div>
      </entity-wizard>
      <div class="rightside-content-hold" id="hold-short" style="position: fixed; left: 0; top: 0; width: 700px; height: 140px; overflow-x: hidden;">
        <div style="padding: 110px 0 0 40px;"><tooltip id="low" header="Shell" message="A long help text. A long help text. A long help text. A long help text. A long help text. A long help text. A long help text. A long help text."></tooltip></div>
      </div>
    </div>
  `,
})
class TooltipPlacementHostComponent {}

describe('help popover placement (the internal development record)', () => {
  let fixture: ComponentFixture<TooltipPlacementHostComponent>;
  let root: HTMLElement;
  const component = (id: string): TooltipComponent => fixture.debugElement.query((el) => el.name === 'tooltip' && el.nativeElement.id === id).componentInstance;
  const open = (id: string): HTMLElement => {
    (root.querySelector(`#${id} .tooltip-icon`) as HTMLElement).click();
    fixture.detectChanges();
    return root.querySelector(`#${id} .tooltiptext`) as HTMLElement;
  };
  const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TooltipPlacementHostComponent, TooltipComponent, TooltipDocReplacePipe],
      imports: [MatCardModule, MatIconModule, DragDropModule, TranslateModule.forRoot()],
      providers: [{ provide: DocsService, useValue: { docReplace: (text: string) => text } }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(TooltipPlacementHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('opens right on a page-law page with no card when there is room (the #416/#417/#419 regression)', () => {
    const panel = open('pl-left');
    expect(component('pl-left').positionString).toBe('right');
    expect(panel.classList).toContain('right');
  });

  it('narrows the panel to the wider side when neither side fits, inside the content hold', () => {
    const panel = open('narrowed');
    const hold = (root.querySelector('#hold-narrow') as HTMLElement).getBoundingClientRect();
    const r = panel.getBoundingClientRect();
    expect(component('narrowed').positionString).toBe('right');
    expect(r.left).toBeGreaterThanOrEqual(hold.left);
    expect(r.right).toBeLessThanOrEqual(hold.right - TooltipComponent.EDGE_MARGIN + 1);
  });

  it('opens under the glyph across the hold when even a narrowed panel would not fit (phone width)', () => {
    const panel = open('under');
    const hold = (root.querySelector('#hold-phone') as HTMLElement).getBoundingClientRect();
    const r = panel.getBoundingClientRect();
    expect(component('under').positionString).toBe('under');
    expect(r.left).toBeGreaterThanOrEqual(hold.left + TooltipComponent.EDGE_MARGIN - 1);
    expect(r.right).toBeLessThanOrEqual(hold.right - TooltipComponent.EDGE_MARGIN + 1);
  });

  it('gives a dialog the same fit test instead of forcing it right', () => {
    const panel = open('in-dialog');
    expect(component('in-dialog').positionOverride).toBeUndefined();
    expect(component('in-dialog').positionString).toBe('left');
    expect(panel.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  });

  it('keeps a wizard panel in its step: no position: fixed on the container', () => {
    open('in-wizard');
    expect(component('in-wizard').isWizard).toBeTrue();
    expect(getComputedStyle(root.querySelector('#in-wizard .tooltip-container')).position).not.toBe('fixed');
  });

  it('takes a closed panel out of the layout, and shows it when opened', () => {
    const panel = root.querySelector('#pl-left .tooltiptext') as HTMLElement;
    expect(getComputedStyle(panel).display).toBe('none');
    open('pl-left');
    expect(getComputedStyle(panel).display).not.toBe('none');
  });

  it('moves the panel up when it runs past the bottom of the hold, and the caret down with it', async () => {
    const panel = open('low');
    await frame();
    const hold = (root.querySelector('#hold-short') as HTMLElement).getBoundingClientRect();
    const r = panel.getBoundingClientRect();
    expect(r.bottom <= hold.bottom - TooltipComponent.EDGE_MARGIN + 1 || r.top <= hold.top + TooltipComponent.EDGE_MARGIN + 1).toBeTrue();
    expect(panel.style.getPropertyValue('--fc-tt-caret-top')).not.toBe('');
  });

  it('closes the other open panel: exactly one is shown', () => {
    open('pl-left');
    open('narrowed');
    expect(root.querySelectorAll('.tooltiptext.show').length).toBe(1);
  });
});
