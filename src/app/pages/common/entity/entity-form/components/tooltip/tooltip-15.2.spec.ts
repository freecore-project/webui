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
