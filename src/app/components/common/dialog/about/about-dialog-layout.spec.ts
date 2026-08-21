import { OverlayContainer } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { CoreService } from '../../../../core/services/core.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { DialogService } from '../../../../services/dialog.service';
import { LocaleService } from '../../../../services/locale.service';
import { AboutModalDialog } from './about-dialog.component';

@Component({
  standalone: false,
  selector: 'about-dialog-layout-test-host',
  template: `
    <div class="wrapper">
      <div class="header" id="about-header"></div>
      <div class="content-wrapper" id="about-content">
        <div class="line-item">
          <div class="about-line-icon"></div>
          <div class="about-line-copy"></div>
        </div>
      </div>
    </div>
    <div mat-dialog-actions id="actions">
      <div class="copyright-txt about-actions-copyright">© 2026</div>
      <button hlmBtn variant="outline" type="button" id="about-close">Close</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./about-dialog.component.css'],
})
class AboutDialogLayoutTestHostComponent {}

describe('About dialog layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AboutDialogLayoutTestHostComponent, AboutModalDialog],
      imports: [CommonModule, MatDialogModule, MatIconModule, NoopAnimationsModule, TranslateModule.forRoot(), ...HlmButtonImports],
      providers: [
        { provide: LocaleService, useValue: { getCopyrightYearFromBuildTime: () => 2026 } },
        { provide: AppLoaderService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: CoreService, useValue: {} },
        { provide: PreferencesService, useValue: {} },
      ],
    }).compileComponents();
  }));

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('preserves the content-row sizing', () => {
    const fixture = TestBed.createComponent(AboutDialogLayoutTestHostComponent);
    fixture.detectChanges();

    const lineStyles = getComputedStyle(fixture.nativeElement.querySelector('.line-item'));
    expect(lineStyles.display).toBe('flex');
    expect(lineStyles.boxSizing).toBe('border-box');
    expect(lineStyles.flexDirection).toBe('row');

    expectPercentFlexChild(fixture.nativeElement.querySelector('.about-line-icon'), '10%');
    expectPercentFlexChild(fixture.nativeElement.querySelector('.about-line-copy'), '90%');
  });

  it('retains the MDC dialog-action wrapping parent', () => {
    TestBed.inject(MatDialog).open(AboutDialogLayoutTestHostComponent);

    const actions = document.querySelector('.cdk-overlay-container #actions');
    const actionsStyles = getComputedStyle(actions);
    expect(actionsStyles.display).toBe('flex');
    expect(actionsStyles.boxSizing).toBe('border-box');
    expect(actionsStyles.flexDirection).toBe('row');
    expect(actionsStyles.flexWrap).toBe('wrap');

    // the internal development record: no 45/55 split -- the copyright line takes the left edge (margin-right
    // auto) and the one outline button the right edge of the row.
    const actionsRect = actions.getBoundingClientRect();
    const copyright = actions.querySelector('.about-actions-copyright') as HTMLElement;
    const close = actions.querySelector('#about-close') as HTMLElement;
    expect(getComputedStyle(actions).paddingLeft).toBe('0px');
    expect(Math.round(copyright.getBoundingClientRect().left)).toBe(Math.round(actionsRect.left));
    expect(Math.round(close.getBoundingClientRect().right)).toBe(Math.round(actionsRect.right));
    expect(copyright.getBoundingClientRect().right).toBeLessThanOrEqual(close.getBoundingClientRect().left);
  });

  it('restores the legacy About inset without overflowing its MDC surface', () => {
    TestBed.inject(MatDialog).open(AboutDialogLayoutTestHostComponent, {
      panelClass: 'about-dialog-panel',
      width: '600px',
    });

    const pane = document.querySelector('.cdk-overlay-pane.about-dialog-panel') as HTMLElement;
    const surface = pane.querySelector('.mat-mdc-dialog-surface') as HTMLElement;
    const header = pane.querySelector('#about-header') as HTMLElement;
    const content = pane.querySelector('#about-content') as HTMLElement;
    const actions = pane.querySelector('#actions') as HTMLElement;
    const surfaceStyles = getComputedStyle(surface);
    const surfaceRect = surface.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();

    expect(surfaceStyles.padding).toBe('24px');
    expect(headerRect.left).toBeCloseTo(surfaceRect.left, 1);
    expect(headerRect.right).toBeCloseTo(surfaceRect.right, 1);
    expect(contentRect.left).toBeCloseTo(surfaceRect.left + 24, 1);
    expect(actionsRect.left).toBeGreaterThanOrEqual(surfaceRect.left + 24);
    expect(actionsRect.right).toBeLessThanOrEqual(surfaceRect.right - 24);
  });

  it('renders real About copy with smaller attribution that wraps within a narrow dialog', fakeAsync(() => {
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.classList.add('ix-blue');
    const ref = TestBed.inject(MatDialog).open(AboutModalDialog, {
      panelClass: 'about-dialog-panel', width: '600px', data: { systemType: 'FreeCORE' },
    });
    flush();
    const surface = overlay.querySelector<HTMLElement>('.mat-mdc-dialog-surface');
    const copy = Array.from(surface.querySelectorAll<HTMLElement>('.medium-font.about-line-copy'));
    const attribution = surface.querySelector<HTMLElement>('#fork-attribution');
    const help = surface.querySelector<HTMLElement>('.help');
    expect(copy.length).toBe(3);
    expect(copy[0].textContent).toContain('Setup, storage, sharing, jails, and maintenance');
    expect(copy[0].querySelector('a').textContent).toBe('docs.freecore.org');
    expect(attribution.textContent).toContain('FreeCORE is an independent fork');
    expect(attribution.textContent).toContain('FreeNAS and TrueNAS contributors');

    const checkText = (element: HTMLElement, size: string, lineHeight: string) => {
      expect(getComputedStyle(element).fontSize).toBe(size);
      expect(getComputedStyle(element).lineHeight).toBe(lineHeight);
    };
    const checkGeometry = () => {
      const surfaceRect = surface.getBoundingClientRect();
      [...copy, attribution].forEach((element) => {
        const rect = element.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(surfaceRect.left + 24);
        expect(rect.right).toBeLessThanOrEqual(surfaceRect.right - 24 + 1);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
      });
      copy.forEach((element) => checkText(element, '14px', '21px'));
      checkText(attribution, '12px', '18px');
      checkText(help, '18px', '27px');
      surface.querySelectorAll<HTMLElement>('.bullet-icon').forEach((icon) => {
        checkText(icon, '24px', '24px');
        expect(icon.getBoundingClientRect().width).toBe(24);
      });
    };
    checkGeometry();
    const wideAttributionHeight = attribution.getBoundingClientRect().height;
    ref.updateSize('320px');
    flush();
    checkGeometry();
    expect(attribution.getBoundingClientRect().height).toBeGreaterThan(wideAttributionHeight);
    ref.close();
    flush();
  }));
});

function expectPercentFlexChild(element: Element, maxWidth: string): void {
  const styles = getComputedStyle(element);

  expect(styles.flexGrow).toBe('1');
  expect(styles.flexShrink).toBe('1');
  expect(styles.flexBasis).toBe('100%');
  expect(styles.boxSizing).toBe('border-box');
  expect(styles.maxWidth).toBe(maxWidth);
}
