import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { MaterialModule } from 'app/appMaterial.module';
import { CommonDirectivesModule } from 'app/directives/common/common-directives.module';
import { RestService, WebSocketService } from 'app/services';
import { EntityJobComponent } from './entity-job.component';

describe('15.2 job status presentation', () => {
  let fixture: ComponentFixture<EntityJobComponent>;
  let component: EntityJobComponent;
  let dialog: any;
  let ws: any;
  const find = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    dialog = { disableClose: true, addPanelClass: jasmine.createSpy('addPanelClass'), updateSize: () => {} };
    ws = { call: jasmine.createSpy('call').and.returnValue(of([])) };
    await TestBed.configureTestingModule({
      declarations: [EntityJobComponent],
      imports: [MaterialModule, CommonDirectivesModule, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: dialog }, { provide: MAT_DIALOG_DATA, useValue: { title: 'Snapshot' } },
        { provide: WebSocketService, useValue: ws }, { provide: RestService, useValue: {} }, { provide: HttpClient, useValue: {} }],
    }).compileComponents();
    fixture = TestBed.createComponent(EntityJobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not invent a percentage before a job reports progress', () => {
    expect(find('[role=progressbar]').hasAttribute('aria-valuenow')).toBeFalse();
    expect(find('[role=progressbar]').classList.contains('indeterminate')).toBeTrue();
  });

  it('renders reported zero and later progress, then returns to indeterminate when absent', () => {
    component.jobUpdate({ state: 'RUNNING', progress: { percent: 0 } });
    fixture.detectChanges();
    expect(find('[role=progressbar]').getAttribute('aria-valuenow')).toBe('0');
    component.jobUpdate({ state: 'RUNNING', progress: { percent: 42, description: 'Downloading' } });
    fixture.detectChanges();
    expect(find('[role=progressbar]').getAttribute('aria-valuenow')).toBe('42');
    component.jobUpdate({ state: 'RUNNING', progress: { description: 'Waiting' } });
    fixture.detectChanges();
    expect(find('[role=progressbar]').hasAttribute('aria-valuenow')).toBeFalse();
  });

  it('distinguishes download, installation, and failure from the real job method/state', () => {
    component.setCall('update.download');
    component.jobUpdate({ state: 'RUNNING', progress: { percent: 42 } });
    fixture.detectChanges();
    expect(find('h1').textContent).toContain('Downloading update');
    expect(dialog.addPanelClass).toHaveBeenCalledWith('fc-status-fullscreen');
    component.setCall('update.update');
    fixture.detectChanges();
    expect(find('h1').textContent).toContain('Installing update');
    component.jobUpdate({ state: 'FAILED', error: 'Verification failed' });
    fixture.detectChanges();
    expect(find('h1').textContent).toContain('Update failed');
    expect(find('[role=progressbar]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Verification failed');
    expect(find('[ix-auto-identifier=CLOSE]')).not.toBeNull();
  });

  it('retains optional logs and only offers Abort when enabled for a running job', () => {
    component.job = { id: 7, state: 'RUNNING' };
    component.showRealtimeLogs = true;
    component.realtimeLogs = 'Sample log line';
    fixture.detectChanges();
    expect(find('[ix-auto-identifier=ABORT]')).toBeNull();
    expect(find('pre').textContent).toContain('Sample log line');
    component.showAbortButton = true;
    fixture.detectChanges();
    find('[ix-auto-identifier=ABORT]').click();
    expect(ws.call).toHaveBeenCalledWith('core.job_abort', [7]);
    component.job.state = 'ABORTED';
    fixture.detectChanges();
    expect(find('[ix-auto-identifier=ABORT]')).toBeNull();
    expect(find('[ix-auto-identifier=CLOSE]')).not.toBeNull();
  });
});
