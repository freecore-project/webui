import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { of, Subject } from 'rxjs';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import {
  DialogService, JobService, StorageService, SystemGeneralService, WebSocketService,
} from '../../../../services';
import { LocaleService } from '../../../../services/locale.service';
import { TaskManagerComponent } from './task-manager.component';

// the internal development record: the Task Manager's job list on the dialog table voice -- the real component opened through
// MatDialog (the voice is keyed on the dialog container; <body> carries fc-ui), three jobs (fewer than 50: the case
// whose live updates used to throw on `data[49]`), a live job stream. The mat-table it replaced was a white block.
@Component({ standalone: false, template: '' })
class HostComponent {}

describe('Task Manager job list (the internal development record)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let live: Subject<{ fields: unknown }>;
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE', '--primary': '#4E93C4' };
  const job = (id: number, method: string, state: string, percent: number, extra: object = {}): object => ({
    id, method, state, progress: { percent }, time_started: { $date: 1790000000000 }, time_finished: null, error: null, logs_excerpt: null, ...extra,
  });
  const panel = (): HTMLElement => document.querySelector('.cdk-overlay-container .mat-mdc-dialog-container');
  const rows = (): HTMLTableRowElement[] => Array.from(panel().querySelectorAll('tbody tr.element-row'));
  const methods = (): string[] => rows().map((tr) => tr.cells[1].textContent.trim());
  const header = (label: string): HTMLElement => Array.from(panel().querySelectorAll('thead th')).find((th) => th.textContent.includes(label)) as HTMLElement;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.body.classList.add('fc-ui', 'ix-blue'); // what the shell marks
    live = new Subject();
    const jobs = [
      job(30, 'pool.scrub', 'RUNNING', 40),
      job(29, 'smb.configure', 'SUCCESS', 100),
      job(28, 'zfs.snapshot.create', 'FAILED', 20, { error: 'boom' }),
    ];
    await TestBed.configureTestingModule({
      declarations: [HostComponent, TaskManagerComponent],
      imports: [CommonModule, MatDialogModule, MatIconModule, NoopAnimationsModule, TranslateModule.forRoot(),
        CommonDirectivesModule, ...HlmButtonImports, ...HlmInputGroupImports, ...HlmProgressImports],
      providers: [
        { provide: WebSocketService, useValue: { call: () => of(jobs), subscribe: () => live } },
        { provide: SystemGeneralService, useValue: { getSysInfo: () => of({ timezone: 'UTC' }) } },
        { provide: LocaleService, useValue: { formatDateTime: () => '2026-09-21 12:00:00' } },
        { provide: JobService, useValue: {} },
        { provide: DialogService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: HttpClient, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    TestBed.inject(MatDialog).open(TaskManagerComponent, { width: '400px' });
    await settle();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('lists the jobs in a native table on the dialog table voice, not a white Material block', () => {
    const table = panel().querySelector('table.fc-dialog-table') as HTMLElement;
    expect(table).not.toBeNull();
    expect(panel().querySelector('mat-table, .mat-mdc-table')).toBeNull();
    expect(getComputedStyle(table).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(methods()).toEqual(['pool.scrub', 'smb.configure', 'zfs.snapshot.create']);
    const th = header('Method');
    expect(th.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(th).textTransform).toBe('uppercase');
    expect(getComputedStyle(th).color).toBe('rgb(151, 166, 174)');
    expect(header('State').getBoundingClientRect().width).toBe(74);
    expect(header('Progress').getBoundingClientRect().width).toBe(166);
    const first = rows()[0];
    expect(first.getBoundingClientRect().height).toBe(40);
    expect(getComputedStyle(first.cells[1]).color).toBe('rgb(220, 227, 230)');
    expect(first.cells[1].getAttribute('title')).toBe('pool.scrub');
    expect(getComputedStyle(first.cells[1]).textOverflow).toBe('ellipsis');
    expect(first.cells[2].textContent).toContain('40.00%');
    expect(first.cells[2].querySelector('hlm-progress').getAttribute('aria-valuenow')).toBe('40');
  });

  it('filters on the job fields as MatTableDataSource did', async () => {
    const input = panel().querySelector('input[hlmInputGroupInput]') as HTMLInputElement;
    const type = async (text: string): Promise<void> => {
      input.value = text;
      input.dispatchEvent(new KeyboardEvent('keyup'));
      await settle();
    };
    await type('SMB');
    expect(methods()).toEqual(['smb.configure']);
    await type('failed'); // the state field
    expect(methods()).toEqual(['zfs.snapshot.create']);
    await type('');
    expect(methods().length).toBe(3);
  });

  it('sorts by a header like MatSort -- ascending, descending, off -- and Progress sorts by the percent', async () => {
    const sort = async (label: string): Promise<void> => {
      (header(label).querySelector('button.fc-dialog-table-sort') as HTMLButtonElement).click();
      await settle();
    };
    expect(header('Method').getAttribute('aria-sort')).toBe('none');
    await sort('Method');
    expect(methods()).toEqual(['pool.scrub', 'smb.configure', 'zfs.snapshot.create']);
    expect(header('Method').getAttribute('aria-sort')).toBe('ascending');
    await sort('Method');
    expect(methods()).toEqual(['zfs.snapshot.create', 'smb.configure', 'pool.scrub']);
    expect(header('Method').getAttribute('aria-sort')).toBe('descending');
    await sort('Method');
    expect(header('Method').getAttribute('aria-sort')).toBe('none');
    expect(methods()).toEqual(['pool.scrub', 'smb.configure', 'zfs.snapshot.create']); // load order again
    await sort('Progress');
    expect(methods()).toEqual(['zfs.snapshot.create', 'pool.scrub', 'smb.configure']); // 20, 40, 100
  });

  it('opens a job\'s detail by click, Enter or Space', async () => {
    rows()[0].click();
    await settle();
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
    const detail = rows()[0].nextElementSibling as HTMLTableRowElement;
    expect(detail.classList).toContain('task-manager-detail-row');
    expect(detail.textContent).toContain('RUNNING');
    expect(getComputedStyle(detail.cells[0]).whiteSpace).toBe('normal');
    rows()[0].click();
    await settle();
    expect(panel().querySelector('.task-manager-detail-row')).toBeNull();
    rows()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
    expect(panel().querySelector('.task-manager-detail-row').textContent).toContain('boom');
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows()[2].dispatchEvent(space);
    await settle();
    expect(space.defaultPrevented).toBeTrue();
    expect(panel().querySelector('.task-manager-detail-row')).toBeNull();
  });

  it('updates live with fewer than 50 jobs: in place, appended, and nothing older than the list', async () => {
    rows()[0].click(); // an open detail survives an update of its job
    await settle();
    live.next({ fields: job(30, 'pool.scrub', 'RUNNING', 75) });
    await settle();
    expect(rows()[0].cells[2].textContent).toContain('75.00%');
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
    live.next({ fields: job(31, 'pool.dataset.create', 'SUCCESS', 100) });
    await settle();
    expect(methods()).toEqual(['pool.scrub', 'smb.configure', 'zfs.snapshot.create', 'pool.dataset.create']);
    live.next({ fields: job(27, 'older.job', 'SUCCESS', 100) });
    await settle();
    expect(methods().length).toBe(4);
  });
});
