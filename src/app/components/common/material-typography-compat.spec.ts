import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  standalone: false,
  template: `
    <h1 mat-dialog-title>Configure Jail</h1>
    <mat-dialog-content>
      <p id="dialog-copy">Select a pool for jail storage.</p>
    </mat-dialog-content>
    <mat-dialog-actions><button mat-button mat-dialog-close>Close</button></mat-dialog-actions>
  `,
})
class TypographyDialogComponent {}

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <!-- the internal development record: the form-field, select, option, checkbox and radio arms went with those components (#472). -->
    <div class="ix-blue" id="typography-host" style="width: 640px; max-width: 100%;">
      <div id="buttons">
        <button mat-button>Cancel</button>
        <button mat-raised-button>Save</button>
        <button mat-flat-button>Apply</button>
        <button mat-stroked-button>Download</button>
      </div>

      <button mat-button #shortTrigger="matMenuTrigger" [matMenuTriggerFor]="shortMenu">Actions</button>
      <mat-menu #shortMenu="matMenu">
        <button mat-menu-item><span><mat-icon>check_box</mat-icon></span><span>State</span></button>
        <button mat-menu-item>Restart</button>
      </mat-menu>
      <button mat-button #longTrigger="matMenuTrigger" [matMenuTriggerFor]="longMenu">More Actions</button>
      <mat-menu #longMenu="matMenu">
        <button mat-menu-item><span><mat-icon>check_box</mat-icon></span><span>Apply the reviewed template and preserve all existing application data</span></button>
      </mat-menu>

      <table mat-table id="reference-table" [dataSource]="rows">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let row">{{ row.name }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="['name']"></tr>
        <tr mat-row *matRowDef="let row; columns: ['name'];"></tr>
      </table>
    </div>
  `,
})
class TypographyHostComponent {
  @ViewChild('shortTrigger', { static: true }) shortTrigger: MatMenuTrigger;
  @ViewChild('longTrigger', { static: true }) longTrigger: MatMenuTrigger;

  rows = [{ name: 'Existing Table Row' }];
}

describe('Material typography compatibility', () => {
  let fixture: ComponentFixture<TypographyHostComponent>;
  let host: HTMLElement;
  let overlayContainer: OverlayContainer;
  let overlay: HTMLElement;
  let dialog: MatDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TypographyHostComponent, TypographyDialogComponent],
      imports: [
        MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule,
        MatTableModule, NoopAnimationsModule,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TypographyHostComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    overlay = overlayContainer.getContainerElement();
    overlay.classList.add('ix-blue');
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
    host = fixture.nativeElement.querySelector('#typography-host');
  });

  afterEach(() => {
    dialog.closeAll();
    fixture.destroy();
    overlayContainer.ngOnDestroy();
  });

  // the internal development record: the tab half went with MatTabsModule (the tab bar is .fc-tab, pinned by fc-tab-nav.spec).
  it('uses normal tracking on 14px buttons', () => {
    host.querySelectorAll<HTMLElement>('#buttons .mdc-button__label').forEach((label) => {
      expectText(label, '14px');
    });
  });

  it('keeps the dialog body at 14px without resizing the title', fakeAsync(() => {
    const ref = dialog.open(TypographyDialogComponent, { width: '480px' });
    fixture.detectChanges();
    flush();
    expectText(overlay.querySelector('#dialog-copy'), '14px', '20px');
    const title = overlay.querySelector<HTMLElement>('[mat-dialog-title]');
    expect(getComputedStyle(title).fontSize).toBe('20px');
    expect(getComputedStyle(title).lineHeight).toBe('32px');
    ref.close();
    flush();
  }));

  it('renders compact 36px menu rows and gives a short menu its natural width', fakeAsync(() => {
    fixture.componentInstance.shortTrigger.openMenu();
    fixture.detectChanges();
    flush();
    const panel = overlay.querySelector<HTMLElement>('.mat-mdc-menu-panel');
    expect(panel.getBoundingClientRect().width).toBeGreaterThanOrEqual(112);
    expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(280);
    panel.querySelectorAll<HTMLElement>('.mat-mdc-menu-item').forEach((row) => {
      expectText(row.querySelector('.mat-mdc-menu-item-text'), '14px', '20px');
      expect(row.getBoundingClientRect().height).toBeCloseTo(36, 0);
    });
    fixture.componentInstance.shortTrigger.closeMenu();
    flush();
  }));

  it('lets a wrapped menu label grow without clipping text or widening the panel', fakeAsync(() => {
    fixture.componentInstance.longTrigger.openMenu();
    fixture.detectChanges();
    flush();
    const panel = overlay.querySelector<HTMLElement>('.mat-mdc-menu-panel');
    panel.style.width = '180px';
    panel.style.maxWidth = '180px';
    const row = panel.querySelector<HTMLElement>('.mat-mdc-menu-item');
    const label = row.querySelector<HTMLElement>('.mat-mdc-menu-item-text');
    expectText(label, '14px', '20px');
    expect(label.getBoundingClientRect().height).toBeGreaterThan(20);
    expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(180);
    expect(row.getBoundingClientRect().height).toBeGreaterThan(36);
    expectContained(label, row);
    expect(label.scrollHeight).toBeLessThanOrEqual(label.clientHeight + 1);
    fixture.componentInstance.longTrigger.closeMenu();
    flush();
  }));

  // the internal development record: the content-list half went with the last Material lists (the compat rule matched nothing).
  it('keeps the table typography', () => {
    expect(getComputedStyle(query('#reference-table td')).fontSize).toBe('14px');
    expect(getComputedStyle(query('#reference-table th')).fontSize).toBe('14px');
  });

  function query(selector: string): HTMLElement {
    return host.querySelector<HTMLElement>(selector);
  }

  function expectText(element: HTMLElement, fontSize: string, lineHeight?: string): void {
    const style = getComputedStyle(element);
    expect(style.fontSize).withContext(element.id || element.className).toBe(fontSize);
    expect(style.letterSpacing).withContext(element.id || element.className).toBe('normal');
    if (lineHeight) { expect(style.lineHeight).withContext(element.id || element.className).toBe(lineHeight); }
  }

  function expectContained(content: HTMLElement, container: HTMLElement): void {
    const inner = content.getBoundingClientRect();
    const outer = container.getBoundingClientRect();
    expect(inner.top).toBeGreaterThanOrEqual(outer.top - 1);
    expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + 1);
    expect(inner.left).toBeGreaterThanOrEqual(outer.left - 1);
    expect(inner.right).toBeLessThanOrEqual(outer.right + 1);
  }
});
