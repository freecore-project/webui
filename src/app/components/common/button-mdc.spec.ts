import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  standalone: false,
  template: `
    <div class="ix-blue">
      <button id="text" mat-button color="primary" (click)="clicks = clicks + 1">Text</button>
      <button id="raised" mat-raised-button color="accent">Raised</button>
      <button id="flat" mat-flat-button color="warn">Flat</button>
      <button id="outlined" mat-stroked-button>Outlined</button>
      <button id="with-icon" mat-button><mat-icon>arrow_drop_down</mat-icon>Menu</button>
      <button id="icon" mat-icon-button aria-label="Icon action">I</button>
      <button id="fab" mat-fab>F</button>
      <button id="mini-fab" mat-mini-fab disabled (click)="clicks = clicks + 1">M</button>
      <a id="anchor" mat-button href="#destination">Link</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../../assets/styles/material-reduction.css'],
})
class ButtonHostComponent {
  clicks = 0;
}

describe('MDC buttons', () => {
  let fixture: ComponentFixture<ButtonHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ButtonHostComponent],
      imports: [MatButtonModule, MatIconModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonHostComponent);
    fixture.detectChanges();
  });

  it('renders every supported button family with MDC host and label classes', () => {
    const text = fixture.nativeElement.querySelector('#text') as HTMLButtonElement;
    const raised = fixture.nativeElement.querySelector('#raised') as HTMLButtonElement;
    const flat = fixture.nativeElement.querySelector('#flat') as HTMLButtonElement;
    const outlined = fixture.nativeElement.querySelector('#outlined') as HTMLButtonElement;
    const icon = fixture.nativeElement.querySelector('#icon') as HTMLButtonElement;
    const fab = fixture.nativeElement.querySelector('#fab') as HTMLButtonElement;
    const miniFab = fixture.nativeElement.querySelector('#mini-fab') as HTMLButtonElement;
    const anchor = fixture.nativeElement.querySelector('#anchor') as HTMLAnchorElement;

    expect(text.classList).toContain('mat-mdc-button');
    expect(text.classList).toContain('mdc-button');
    expect(text.classList).toContain('mat-primary');
    expect(raised.classList).toContain('mat-mdc-raised-button');
    expect(raised.classList).toContain('mdc-button--raised');
    expect(flat.classList).toContain('mat-mdc-unelevated-button');
    expect(flat.classList).toContain('mdc-button--unelevated');
    expect(outlined.classList).toContain('mat-mdc-outlined-button');
    expect(outlined.classList).toContain('mdc-button--outlined');
    expect(icon.classList).toContain('mat-mdc-icon-button');
    expect(icon.classList).toContain('mdc-icon-button');
    expect(fab.classList).toContain('mat-mdc-fab');
    expect(fab.classList).toContain('mdc-fab');
    expect(miniFab.classList).toContain('mat-mdc-mini-fab');
    expect(miniFab.classList).toContain('mdc-fab--mini');
    expect(anchor.classList).toContain('mat-mdc-button');
    expect(text.querySelector('.mdc-button__label').textContent.trim()).toBe('Text');
  });

  it('preserves native click and disabled behavior', () => {
    const text = fixture.nativeElement.querySelector('#text') as HTMLButtonElement;
    const miniFab = fixture.nativeElement.querySelector('#mini-fab') as HTMLButtonElement;

    text.click();
    miniFab.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.clicks).toBe(1);
    expect(miniFab.disabled).toBe(true);
  });

  it('preserves legacy text-button padding without changing MDC touch targets', () => {
    const text = fixture.nativeElement.querySelector('#text') as HTMLButtonElement;
    const withIcon = fixture.nativeElement.querySelector('#with-icon') as HTMLButtonElement;
    const icon = fixture.nativeElement.querySelector('#icon') as HTMLButtonElement;
    const textStyles = getComputedStyle(text);
    const withIconStyles = getComputedStyle(withIcon);
    const textTouchTarget = text.querySelector('.mat-mdc-button-touch-target') as HTMLElement;
    const iconTouchTarget = icon.querySelector('.mat-mdc-button-touch-target') as HTMLElement;
    const iconStateLayer = icon.querySelector('.mat-mdc-button-persistent-ripple') as HTMLElement;

    expect(textStyles.paddingLeft).toBe('16px');
    expect(textStyles.paddingRight).toBe('16px');
    expect(withIconStyles.paddingLeft).toBe('16px');
    expect(withIconStyles.paddingRight).toBe('16px');
    expect(text.getBoundingClientRect().height).toBe(36);
    expect(textTouchTarget.getBoundingClientRect().height).toBe(48);
    expect(getComputedStyle(icon).paddingLeft).not.toBe('16px');
    expect(icon.getBoundingClientRect().width).toBe(36);
    expect(icon.getBoundingClientRect().height).toBe(36);
    expect(iconStateLayer.getBoundingClientRect().width).toBe(36);
    expect(iconStateLayer.getBoundingClientRect().height).toBe(36);
    expect(iconTouchTarget.getBoundingClientRect().width).toBe(48);
    expect(iconTouchTarget.getBoundingClientRect().height).toBe(48);
  });
});
