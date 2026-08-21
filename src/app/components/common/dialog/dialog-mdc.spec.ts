import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA, MatDialog, MatDialogModule,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

interface DialogTestData {
  title: string;
  message: string;
  result: string;
}

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="data.result">Close</button>
    </mat-dialog-actions>
  `,
})
class DialogTestComponent {
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: DialogTestData) {}
}

describe('MDC dialog', () => {
  let dialog: MatDialog;
  let overlayContainer: OverlayContainer;
  let overlayElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DialogTestComponent],
      imports: [MatButtonModule, MatDialogModule, NoopAnimationsModule],
    }).compileComponents();

    dialog = TestBed.inject(MatDialog);
    overlayContainer = TestBed.inject(OverlayContainer);
    overlayElement = overlayContainer.getContainerElement();
  });

  afterEach(() => {
    dialog.closeAll();
    overlayContainer.ngOnDestroy();
  });

  it('renders the MDC surface and content directives and returns the close result', fakeAsync(() => {
    const afterClosed = jasmine.createSpy('afterClosed');
    const dialogRef = dialog.open(DialogTestComponent, {
      data: {
        title: 'Dataset action',
        message: 'Dataset is ready',
        result: 'confirmed',
      },
      panelClass: 'dialog-mdc-test-panel',
    });
    dialogRef.afterClosed().subscribe(afterClosed);
    dialogRef.componentRef.changeDetectorRef.detectChanges();
    flush();

    const pane = overlayElement.querySelector('.cdk-overlay-pane') as HTMLElement;
    const container = pane.querySelector('mat-dialog-container') as HTMLElement;
    const surface = container.querySelector('.mdc-dialog__surface') as HTMLElement;
    const title = container.querySelector('[mat-dialog-title]') as HTMLElement;
    const content = container.querySelector('mat-dialog-content') as HTMLElement;
    const actions = container.querySelector('mat-dialog-actions') as HTMLElement;
    const closeButton = actions.querySelector('button') as HTMLButtonElement;

    expect(pane.classList).toContain('dialog-mdc-test-panel');
    expect(container.classList).toContain('mat-mdc-dialog-container');
    expect(container.classList).toContain('mdc-dialog');
    expect(surface.classList).toContain('mat-mdc-dialog-surface');
    expect(title.classList).toContain('mat-mdc-dialog-title');
    expect(title.classList).toContain('mdc-dialog__title');
    expect(title.textContent.trim()).toBe('Dataset action');
    expect(content.classList).toContain('mat-mdc-dialog-content');
    expect(content.classList).toContain('mdc-dialog__content');
    expect(content.textContent.trim()).toBe('Dataset is ready');
    expect(actions.classList).toContain('mat-mdc-dialog-actions');
    expect(actions.classList).toContain('mdc-dialog__actions');
    expect(actions.classList).toContain('mat-mdc-dialog-actions-align-end');
    expect(closeButton.classList).toContain('mat-mdc-button');

    closeButton.click();
    flush();

    expect(afterClosed).toHaveBeenCalledOnceWith('confirmed');
    expect(overlayElement.querySelector('mat-dialog-container')).toBeNull();
  }));

  it('honors disableClose for backdrop interaction', fakeAsync(() => {
    const afterClosed = jasmine.createSpy('afterClosed');
    const dialogRef = dialog.open(DialogTestComponent, {
      data: {
        title: 'Protected action',
        message: 'Explicit confirmation required',
        result: 'confirmed',
      },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe(afterClosed);
    dialogRef.componentRef.changeDetectorRef.detectChanges();
    flush();

    const backdrop = overlayElement.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    backdrop.click();
    flush();

    expect(dialog.openDialogs).toContain(dialogRef);
    expect(afterClosed).not.toHaveBeenCalled();

    dialogRef.disableClose = false;
    backdrop.click();
    flush();

    expect(afterClosed).toHaveBeenCalledOnceWith(undefined);
    expect(dialog.openDialogs).not.toContain(dialogRef);
  }));
});
