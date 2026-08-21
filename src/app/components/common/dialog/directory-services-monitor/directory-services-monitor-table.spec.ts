import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { of } from 'rxjs';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { WebSocketService } from '../../../../services';
import { DirectoryServicesMonitorComponent } from './directory-services-monitor.component';

// the internal development record: the monitor's status table on the dialog table voice -- opened for real through MatDialog
// (the voice is keyed on the dialog container; <body> carries fc-ui), read against the #354 voice on the dark
// ladder, and driven by click and keyboard. The mat-table it replaced rendered a white block in the dark panel.
@Component({ standalone: false, template: '' })
class HostComponent {}

describe('Directory Services Monitor table (the internal development record)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let navigate: jasmine.Spy;
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };
  const panel = (): HTMLElement => document.querySelector('.cdk-overlay-container .mat-mdc-dialog-container');
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue'); // what the shell marks
    navigate = jasmine.createSpy('navigate');
    await TestBed.configureTestingModule({
      declarations: [HostComponent, DirectoryServicesMonitorComponent],
      imports: [CommonModule, MatDialogModule, MatIconModule, NoopAnimationsModule, TranslateModule.forRoot(),
        CommonDirectivesModule, ...HlmButtonImports, ...HlmSpinnerImports],
      providers: [
        { provide: WebSocketService, useValue: { call: () => of({ activedirectory: 'HEALTHY', ldap: 'FAULTED', nis: 'DISABLED' }) } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    TestBed.inject(MatDialog).open(DirectoryServicesMonitorComponent, { width: '400px' });
    await settle();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('lists the services in a native table on the dialog table voice, not a white Material block', () => {
    const table = panel().querySelector('table.fc-dialog-table') as HTMLElement;
    expect(table).not.toBeNull();
    expect(panel().querySelector('mat-table, .mat-mdc-table')).toBeNull();
    expect(getComputedStyle(table).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const heads = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
    expect(heads.map((th) => th.textContent.trim())).toEqual(['', 'Name', 'State']);
    const th = getComputedStyle(heads[1]);
    expect(heads[1].getBoundingClientRect().height).toBe(32);
    expect(th.fontSize).toBe('11px');
    expect(th.textTransform).toBe('uppercase');
    expect(th.color).toBe('rgb(151, 166, 174)');
    expect(th.borderBottomColor).toBe('rgb(42, 53, 61)');
    const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows.map((tr) => Array.from(tr.cells).map((td) => td.textContent.trim()))).toEqual([
      ['check_circle', 'Active Directory', 'HEALTHY'], ['highlight_off', 'LDAP', 'FAULTED'], ['remove_circle', 'NIS', 'DISABLED'],
    ]);
    const td = getComputedStyle(rows[0].cells[1]);
    expect(rows[0].getBoundingClientRect().height).toBe(40);
    expect(td.fontSize).toBe('13px');
    expect(td.color).toBe('rgb(220, 227, 230)');
    // the panel's 24px edge on the first and last cells, the glyph column 74px wide
    expect(getComputedStyle(rows[0].cells[0]).paddingLeft).toBe('24px');
    expect(getComputedStyle(rows[0].cells[2]).paddingRight).toBe('24px');
    expect(heads[0].getBoundingClientRect().width).toBe(74);
  });

  it('opens a service by click, Enter and Space', async () => {
    const rows = Array.from(panel().querySelectorAll('table.fc-dialog-table tbody tr')) as HTMLElement[];
    rows[1].click();
    expect(navigate).toHaveBeenCalledWith(['/directoryservice/ldap']);
    expect(rows[0].tabIndex).toBe(0);
    rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/directoryservice/activedirectory']);
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows[2].dispatchEvent(space);
    expect(navigate).toHaveBeenCalledWith(['/directoryservice/nis']);
    expect(space.defaultPrevented).toBeTrue();
  });
});
