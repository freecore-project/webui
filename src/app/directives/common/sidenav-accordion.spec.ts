import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SideNavAccordionDirective } from './sidenav-accordion.directive';

// the internal development record: the sidebar's accordion on the list off Material. It finds an item's sub-menu through the
// item's mirrored content layers (.fc-nav-item__content > .fc-nav-item__text > .fc-nav-list, Material's
// .mdc-list-item__content > .mat-mdc-list-item-unscoped-content > mat-nav-list until #485), marks the item
// has-submenu, toggles it open on a click outside the sub-menu, and keeps one parent open (the MDC list spec's
// accordion cases, list-mdc.spec, carried over).
@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="fc-nav-list" role="list">
      <div class="fc-nav-item" sideNavAccordion id="plain-item" role="listitem">
        <span class="fc-nav-item__content"><span class="fc-nav-item__text"><a id="plain-trigger">Dashboard</a></span></span>
      </div>
      <div class="fc-nav-item" sideNavAccordion id="accordion-item" role="listitem">
        <span class="fc-nav-item__content"><span class="fc-nav-item__text">
          <a id="parent-trigger">Parent</a>
          <div class="fc-nav-list sub-menu" role="list"><div class="fc-nav-item" role="listitem"><a href="#child">Child</a></div></div>
        </span></span>
      </div>
      <div class="fc-nav-item" sideNavAccordion id="second-accordion-item" role="listitem">
        <span class="fc-nav-item__content"><span class="fc-nav-item__text">
          <a id="second-parent-trigger">Second parent</a>
          <div class="fc-nav-list sub-menu" role="list"><div class="fc-nav-item" role="listitem"><a href="#second-child">Second child</a></div></div>
        </span></span>
      </div>
    </div>
  `,
})
class AccordionHostComponent {}

describe('sidebar accordion (the internal development record)', () => {
  let fixture: ComponentFixture<AccordionHostComponent>;
  const q = (sel: string): HTMLElement => fixture.nativeElement.querySelector(sel);
  const click = (target: HTMLElement): void => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [AccordionHostComponent, SideNavAccordionDirective] }).compileComponents();
    fixture = TestBed.createComponent(AccordionHostComponent);
    fixture.detectChanges();
  });

  it('marks an item with a nested sub-menu as has-submenu, and only that kind', () => {
    expect(q('#accordion-item').classList).toContain('has-submenu');
    expect(q('#second-accordion-item').classList).toContain('has-submenu');
    expect(q('#plain-item').classList).not.toContain('has-submenu');
  });

  it('toggles a parent open, ignores clicks inside its sub-menu, and keeps one parent open', () => {
    const first = q('#accordion-item');
    const second = q('#second-accordion-item');
    click(q('#parent-trigger'));
    expect(first.classList).toContain('open');
    const child = first.querySelector('a[href="#child"]') as HTMLElement;
    child.addEventListener('click', (event) => event.preventDefault(), { once: true });
    click(child);
    expect(first.classList).toContain('open');
    click(q('#parent-trigger'));
    expect(first.classList).not.toContain('open');
    click(q('#parent-trigger'));
    click(q('#second-parent-trigger'));
    expect(first.classList).not.toContain('open');
    expect(second.classList).toContain('open');
    click(q('#plain-trigger'));
    expect(q('#plain-item').classList).not.toContain('open');
  });
});
