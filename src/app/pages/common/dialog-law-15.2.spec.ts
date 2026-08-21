import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AppLoaderService } from '../../services/app-loader/app-loader.service';
import { StorageService } from '../../services/storage.service';
import { WebSocketService } from '../../services/ws.service';
import { DownloadKeyModalDialog } from '../../components/common/dialog/downloadkey/downloadkey-dialog.component';
import { ErrorDialog } from './error-dialog/error-dialog.component';
import { GeneralDialogComponent } from './general-dialog/general-dialog.component';
import { InfoDialog } from './info-dialog/info-dialog.component';

// the internal development record: the dialog law on the message dialogs that no other spec opens. Each is
// opened for real through MatDialog into the overlay (in scope because the shell marks <body>
// fc-ui) and read against the law: an h2 title in the 16/500 voice with its glyph on the line,
// no Material button in the action row, Cancel/Close on the outline tier and the one verb on
// the default tier rightmost, the mono pane only where the text is a listing, and the error
// dialog's 'More info...' as a <details> that widens the dialog while it is open (the revived
// behaviour -- the MDC container never carried the class the old DOM hack looked for).
// freecore-ui.css is a Karma global.
@Component({ standalone: false, template: '' })
class DialogHostComponent {}

describe('the dialog law on the message dialogs (the internal development record)', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let ref: MatDialogRef<unknown> | null;
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--red': '#E06C75', '--yellow': '#E5C07B' };
  const overlay = (): HTMLElement => document.querySelector('.cdk-overlay-container');
  const container = (): HTMLElement => overlay().querySelector('.mat-mdc-dialog-container');
  const actions = (): HTMLButtonElement[] => Array.from(container().querySelectorAll('.mat-mdc-dialog-actions button:not([role="checkbox"])'));
  const classes = (el: Element): string[] => Array.from(el.classList);
  const settle = async (): Promise<void> => { fixture.detectChanges(); await fixture.whenStable(); };
  const rest = (): void => { actions().forEach((b) => { b.style.transition = 'none'; }); (document.activeElement as HTMLElement | null)?.blur(); };

  const expectLaw = (title: string | null): void => {
    const c = container();
    const surface = c.querySelector('.mat-mdc-dialog-surface') as HTMLElement;
    expect(getComputedStyle(surface).borderTopLeftRadius).toBe('6px');
    expect(getComputedStyle(surface).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(surface).boxShadow).toBe('none');
    expect(c.querySelectorAll('h1').length).toBe(0);
    const h2 = c.querySelector('h2.mat-mdc-dialog-title') as HTMLElement;
    expect(h2).withContext('the title is an h2 carrying mat-dialog-title').not.toBeNull();
    if (title !== null) expect(h2.textContent.replace(/\s+/g, ' ').trim()).toContain(title);
    expect(getComputedStyle(h2).fontSize).toBe('16px');
    expect(getComputedStyle(h2).fontWeight).toBe('500');
    expect(getComputedStyle(h2).display).toBe('flex');
    expect(c.querySelectorAll('.mat-mdc-dialog-actions .mat-mdc-button, .mat-mdc-dialog-actions .mat-mdc-icon-button').length).toBe(0);
    actions().forEach((b) => {
      expect(b.getAttribute('type')).toBe('button');
      expect(b.getAttribute('data-slot')).toBe('button');
      expect(getComputedStyle(b).textTransform).toBe('none');
    });
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue');
    await TestBed.configureTestingModule({
      declarations: [DialogHostComponent, ErrorDialog, InfoDialog, GeneralDialogComponent, DownloadKeyModalDialog],
      imports: [MatDialogModule, MatIconModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmCheckboxImports, HlmLabelImports],
      providers: [
        { provide: WebSocketService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    ref = null;
  });

  afterEach(async () => {
    if (ref) { ref.close(); await settle(); }
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('error dialog: the yellow glyph on the title line, Close outline, Download Logs default rightmost, and More info... widens the dialog while open', async () => {
    const r = TestBed.inject(MatDialog).open(ErrorDialog, { width: '420px' });
    ref = r;
    r.componentInstance.title = 'Error';
    r.componentInstance.message = 'Something <b>failed</b>';
    r.componentInstance.backtrace = 'Traceback (most recent call last):\n  File "x.py"';
    r.componentInstance.logs = { id: 1, logs_path: '/tmp/x' };
    await settle();
    rest();
    expectLaw('Error');
    const glyph = container().querySelector('h2 .warning-icon') as HTMLElement;
    expect(glyph).not.toBeNull();
    expect(getComputedStyle(glyph).color).toBe('rgb(229, 192, 123)');
    expect(getComputedStyle(glyph).fontSize).toBe('20px');
    const [close, logs] = actions();
    expect(close.textContent.trim()).toBe('Close');
    expect(classes(close)).toContain('border-border');
    expect(logs.textContent.trim()).toBe('Download Logs');
    expect(classes(logs)).toContain('bg-primary');
    expect(logs.getBoundingClientRect().left).toBeGreaterThan(close.getBoundingClientRect().left);
    // the disclosure: folded at first, the pane hidden; opening it calls updateSize(800)
    const details = container().querySelector('details#err-bt-panel') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBeFalse();
    const pre = details.querySelector('pre#err-bt-text') as HTMLElement;
    expect(classes(pre)).toContain('fc-dialog-pre');
    expect(pre.checkVisibility()).withContext('the pane is folded away').toBeFalse();
    const size = spyOn(r, 'updateSize').and.callThrough();
    (details.querySelector('summary') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0)); // the toggle event is queued
    await settle();
    expect(details.open).toBeTrue();
    expect(r.componentInstance.isCloseMoreInfo).toBeFalse();
    expect(size).toHaveBeenCalledWith('800px');
    expect(pre.checkVisibility()).toBeTrue();
    expect(getComputedStyle(pre).fontFamily).toContain('IBM Plex Mono');
    expect(getComputedStyle(pre).fontSize).toBe('12px');
    expect(getComputedStyle(pre).backgroundColor).toBe('rgb(16, 21, 26)');
    (details.querySelector('summary') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(details.open).toBeFalse();
    expect(size).toHaveBeenCalledWith('420px');
  });

  it('info dialog: a sentence in the body voice, a listing in the mono pane, a lone outline Close', async () => {
    const r = TestBed.inject(MatDialog).open(InfoDialog, { width: '500px' });
    ref = r;
    r.componentInstance.title = 'Jails Started';
    r.componentInstance.info = 'Jails started.';
    r.componentInstance.icon = 'info';
    r.componentInstance.is_html = false;
    await settle();
    rest();
    expectLaw('Jails Started');
    expect(container().querySelector('.mat-mdc-dialog-content pre')).toBeNull();
    const body = container().querySelector('.mat-mdc-dialog-content > div') as HTMLElement;
    expect(body.textContent.trim()).toBe('Jails started.');
    expect(getComputedStyle(body).fontSize).toBe('13px');
    expect(actions().length).toBe(1);
    expect(actions()[0].textContent.trim()).toBe('Close');
    expect(classes(actions()[0])).toContain('border-border');
    r.componentInstance.info = 'line one\nline two';
    await settle();
    const pre = container().querySelector('.mat-mdc-dialog-content pre.fc-dialog-pre') as HTMLElement;
    expect(pre).withContext('multi-line text takes the mono pane').not.toBeNull();
    expect(getComputedStyle(pre).whiteSpace).toBe('pre-wrap');
  });

  it('general dialog: the confirm checkbox is the #394 row gating the default-tier verb, Cancel on outline', async () => {
    const r = TestBed.inject(MatDialog).open(GeneralDialogComponent, { width: '420px' });
    ref = r;
    r.componentInstance.conf = { title: 'Reset', message: 'Really?', icon: 'warning', confirmCheckbox: true, confirmBtnMsg: 'Reset', cancelBtnMsg: 'Cancel' } as GeneralDialogComponent['conf'];
    await settle();
    rest();
    expectLaw('Reset');
    const row = container().querySelector('.mat-mdc-dialog-actions .checkbox-row') as HTMLElement;
    expect(row).not.toBeNull();
    const box = row.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(box.id).toBe('general-dialog__confirm-checkbox');
    expect((row.querySelector('label.checkbox-label') as HTMLLabelElement).htmlFor).toBe('general-dialog__confirm-checkbox');
    expect(row.nextElementSibling.classList.contains('dialog-action-spacer')).toBeTrue();
    const [cancel, verb] = actions();
    expect(cancel.textContent.trim()).toBe('Cancel');
    expect(classes(cancel)).toContain('border-border');
    expect(verb.textContent.trim()).toBe('Reset');
    expect(classes(verb)).toContain('bg-primary');
    expect(verb.disabled).toBeTrue();
    box.click();
    await settle();
    expect(r.componentInstance.confirmed).toBeTrue();
    expect(verb.disabled).toBeFalse();
    expect(verb.getBoundingClientRect().left).toBeGreaterThan(cancel.getBoundingClientRect().left);
  });

  it('download key dialog: Done outline then the download verb default rightmost, the verb keeps the initial focus, no red slab', async () => {
    const r = TestBed.inject(MatDialog).open(DownloadKeyModalDialog, { disableClose: true });
    ref = r;
    r.componentInstance.new = true;
    await settle();
    expectLaw(null);
    const [done, download] = actions();
    expect(done.textContent.trim()).toBe('Done');
    expect(classes(done)).toContain('border-border');
    expect(download.textContent.trim()).toBe('Download Encryption Key');
    expect(classes(download)).toContain('bg-primary');
    expect(getComputedStyle(download).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(download.getBoundingClientRect().left).toBeGreaterThan(done.getBoundingClientRect().left);
    expect(document.activeElement).withContext('cdkFocusInitial keeps Enter on the verb, not on Done').toBe(download);
  });
});
