import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { of, Subject } from 'rxjs';
import { CoreService } from 'app/core/services/core.service';
import { StorageService, SystemGeneralService, WebSocketService } from '../../../services';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DialogService } from '../../../services/dialog.service';
import { UpdateComponent } from './update.component';

// the internal development record: the real Update Settings section with the daily check and the Train select on the
// kit. ngOnInit (the middleware reads) is stubbed and the trains it would load are set by hand.
describe('Update page settings controls (the internal development record)', () => {
  let fixture: ComponentFixture<UpdateComponent>;
  let component: UpdateComponent;
  let ws: { call: jasmine.Spy };
  let dialogService: jasmine.SpyObj<DialogService>;
  const trains = {
    'FreeCORE-15.0-Nightlies': { description: 'FreeCORE 15.0 nightly builds' },
    'FreeCORE-15.1-Nightlies': { description: 'FreeCORE 15.1 nightly builds' },
    'FreeCORE-15.1-STABLE': { description: 'FreeCORE 15.1 release candidates [prerelease]' },
  };
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    ws = { call: jasmine.createSpy('call').and.returnValue(of(true)) };
    dialogService = jasmine.createSpyObj('DialogService', ['confirm', 'errorReport']);
    await TestBed.configureTestingModule({
      declarations: [UpdateComponent],
      imports: [FormsModule, NoopAnimationsModule, TranslateModule.forRoot(),
        ...HlmCheckboxImports, ...HlmFieldImports, ...HlmLabelImports, ...HlmSelectImports],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate'), url: '/system/update' } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: WebSocketService, useValue: ws },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        { provide: SystemGeneralService, useValue: { updateRunning: of('false') } },
        { provide: AppLoaderService, useValue: {} },
        { provide: DialogService, useValue: dialogService },
        { provide: StorageService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: CoreService, useValue: { register: () => of(), unregister: () => undefined, emit: () => undefined } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    document.body.classList.add('fc-ui', 'ix-blue');
    spyOn(UpdateComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(UpdateComponent);
    component = fixture.componentInstance;
    Object.assign(component, {
      autoCheck: true, train: 'FreeCORE-15.1-STABLE', selectedTrain: 'FreeCORE-15.1-STABLE', fullTrainList: trains,
      trains: Object.keys(trains).map((name) => ({ name, description: trains[name].description })),
    });
    fixture.nativeElement.style.cssText = 'display:block; width:1100px';
    await settle();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
    fixture.destroy();
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  const q = <T extends HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector) as T;

  it('draws the daily check as the #394 row and writes the model before toggleAutoCheck() reads it', async () => {
    expect(fixture.nativeElement.querySelector('mat-checkbox, mat-form-field, mat-select')).toBeNull();
    const box = q<HTMLButtonElement>('#autocheck');
    expect(box.getAttribute('role')).toBe('checkbox');
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(q('label[for="autocheck"]').textContent.trim()).toBe('Check for Updates Daily and Download if Available');
    const cell = q('.checkbox-row .checkbox-cell').getBoundingClientRect();
    expect([Math.round(cell.width), Math.round(cell.height)]).toEqual([32, 32]);
    expect(getComputedStyle(q('.checkbox-row .checkbox-label')).paddingLeft).toBe('6px');

    box.click();
    await settle();
    expect(component.autoCheck).toBeFalse();
    expect(ws.call).toHaveBeenCalledWith('update.set_auto_download', [false]);
  });

  it('shows the train as "name - description" in the closed 32px field under its label and lists every train', async () => {
    const trigger = q<HTMLButtonElement>('#train-selector');
    expect(trigger.textContent.trim()).toBe('FreeCORE-15.1-STABLE - FreeCORE 15.1 release candidates [prerelease]');
    expect(q('label[for="train-selector"]').textContent.trim()).toBe('Train');
    const style = getComputedStyle(trigger);
    expect(Math.round(trigger.getBoundingClientRect().height)).toBe(32);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopLeftRadius).toBe('6px');
    expect(style.fontSize).toBe('13px');
    // the 20px the Material field reserved under its box stays, so the status line keeps its gap
    const field = q('.train-field');
    expect(getComputedStyle(field).marginBottom).toBe('20px');
    expect(Math.round(trigger.getBoundingClientRect().top - field.getBoundingClientRect().top)).toBe(20);

    trigger.click();
    await settle();
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).map((o) => o.textContent.trim());
    expect(options).toEqual([
      'FreeCORE-15.0-Nightlies - FreeCORE 15.0 nightly builds',
      'FreeCORE-15.1-Nightlies - FreeCORE 15.1 nightly builds',
      'FreeCORE-15.1-STABLE - FreeCORE 15.1 release candidates [prerelease]',
    ]);
  });

  it('puts the shown train back when a switch is cancelled', async () => {
    // The confirm answers after the pick has rendered, as the real dialog's afterClosed() does.
    const answer = new Subject<boolean>();
    dialogService.confirm.and.returnValue(answer);
    const trigger = q<HTMLButtonElement>('#train-selector');
    trigger.click();
    await settle();
    document.querySelectorAll<HTMLElement>('[role="option"]')[1].click();
    await settle();
    expect(trigger.textContent.trim()).toBe('FreeCORE-15.1-Nightlies - FreeCORE 15.1 nightly builds');
    answer.next(false);
    await settle();
    expect(dialogService.confirm).toHaveBeenCalledTimes(1);
    expect(component.train).toBe('FreeCORE-15.1-STABLE');
    expect(trigger.textContent.trim()).toBe('FreeCORE-15.1-STABLE - FreeCORE 15.1 release candidates [prerelease]');
  });
});
