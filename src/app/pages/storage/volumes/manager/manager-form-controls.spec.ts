import { _CdkPrivateStyleLoader, _VisuallyHiddenLoader } from '@angular/cdk/private';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { of, Subject } from 'rxjs';
import { DialogService, StorageService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { ManagerComponent } from './manager.component';

// the internal development record: the real pool manager template with its form controls on the kit. Lifecycle hooks
// that talk to the middleware are stubbed; the state they would load is set by hand. The dialog service is
// the component's own provider, so it is overridden there.
describe('pool manager form controls (the internal development record)', () => {
  let fixture: ComponentFixture<ManagerComponent>;
  let component: ManagerComponent;
  let dialog: jasmine.SpyObj<DialogService>;
  const disk = (devname: string, i: number): any => ({
    devname, type: 'SSD', capacity: '10 GiB', real_capacity: 10737418240, size: 10737418240, details: [], serial: `S${i}`,
  });

  beforeEach(async () => {
    dialog = jasmine.createSpyObj('DialogService', ['confirm', 'errorReport', 'Info']);
    await TestBed.configureTestingModule({
      declarations: [ManagerComponent],
      imports: [FormsModule, NoopAnimationsModule, NgxDatatableModule, TranslateModule.forRoot(),
        ...HlmCheckboxImports, ...HlmInputImports, ...HlmLabelImports, ...HlmSelectImports],
      providers: [
        { provide: WebSocketService, useValue: { call: () => of([]), job: () => new Subject() } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: AppLoaderService, useValue: { open: () => undefined, close: () => undefined } },
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: MatDialog, useValue: { open: () => undefined } },
        { provide: StorageService, useValue: { tableSorter: (rows: any[]) => rows } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(ManagerComponent, { set: { providers: [{ provide: DialogService, useValue: dialog }] } })
      .compileComponents();
    document.body.classList.add('fc-ui', 'ix-blue');
    // The app has .cdk-visually-hidden from start-up (CDK's a11y services load it); a bare TestBed does not.
    TestBed.inject(_CdkPrivateStyleLoader).load(_VisuallyHiddenLoader);
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  function render(prepare?: (manager: ManagerComponent) => void): void {
    spyOn(ManagerComponent.prototype, 'ngOnInit');
    spyOn(ManagerComponent.prototype, 'ngAfterViewInit');
    fixture = TestBed.createComponent(ManagerComponent);
    component = fixture.componentInstance;
    const disks = ['ada1', 'ada2', 'ada3'].map(disk);
    Object.assign(component, {
      disks: [...disks], temp: [...disks], original_disks: [...disks], suggestable_disks: [...disks],
      encryption_algorithm_options: [{ label: 'AES-256-GCM', value: 'AES-256-GCM' }, { label: 'AES-128-CCM', value: 'AES-128-CCM' }],
    });
    prepare?.(component);
    fixture.nativeElement.style.cssText = 'display:block; width:1200px';
    fixture.detectChanges();
  }

  const q = <T extends HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector) as T;
  // Material's box is its native input, the kit's is the button; either way it is the box, not the label.
  const box = (row: string): HTMLElement => q(`${row} input[type="checkbox"], ${row} button[role="checkbox"]`);
  const settle = (): void => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  it('asks before Force turns on when the box itself is ticked', fakeAsync(() => {
    render((manager) => { manager.has_savable_errors = true; });
    dialog.confirm.and.returnValue(of(true));
    box('.forceCreateCheckbox').click();
    settle();
    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    expect(component.force).toBeTrue();
  }));

  it('keeps Force off when its warnings are cancelled, and unticks it without a dialog', fakeAsync(() => {
    render((manager) => { manager.has_savable_errors = true; });
    dialog.confirm.and.returnValue(of(false));
    box('.forceCreateCheckbox').click();
    settle();
    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    expect(component.force).toBeFalse();
    expect(box('.forceCreateCheckbox').getAttribute('aria-checked')).toBe('false');

    dialog.confirm.and.returnValue(of(true));
    box('.forceCreateCheckbox').click();
    settle();
    expect(component.force).toBeTrue();
    expect(box('.forceCreateCheckbox').getAttribute('aria-checked')).toBe('true');
    box('.forceCreateCheckbox').click();
    settle();
    expect(component.force).toBeFalse();
    expect(dialog.confirm).toHaveBeenCalledTimes(2);
  }));

  it('asks before encryption turns on, unticks on Cancel and offers the algorithm once confirmed', fakeAsync(() => {
    render();
    dialog.confirm.and.returnValue(of(false));
    box('.manager-encryption-layout').click();
    settle();
    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    expect(component.isEncrypted).toBeFalse();
    expect(box('.manager-encryption-layout').getAttribute('aria-checked')).toBe('false');
    expect(q('#pool-manager__encryption_algorithm-select')).toBeNull();

    dialog.confirm.and.returnValue(of(true));
    box('.manager-encryption-layout').click();
    settle();
    expect(component.isEncrypted).toBeTrue();
    const trigger = q('#pool-manager__encryption_algorithm-select');
    expect(trigger.textContent.trim()).toBe('AES-256-GCM');
    expect(q<HTMLLabelElement>('label[for="pool-manager__encryption_algorithm-select"]').textContent.trim()).toBe('Encryption Algorithm');
  }));

  it('selects disks through the kit boxes, one at a time and all at once', fakeAsync(() => {
    render();
    settle();
    const table = q('#pool-manager__disks-table');
    const rowBoxes = (): HTMLElement[] => Array.from(table.querySelectorAll<HTMLElement>('datatable-body button[role="checkbox"]'));
    expect(rowBoxes().length).toBe(3);
    expect(rowBoxes().map((b) => b.getAttribute('aria-label'))).toEqual(['ada1', 'ada2', 'ada3']);
    rowBoxes()[1].click();
    settle();
    expect(component.selected.map((d) => d.devname)).toEqual(['ada2']);
    expect(rowBoxes()[1].getAttribute('aria-checked')).toBe('true');

    const all = table.querySelector<HTMLElement>('datatable-header button[role="checkbox"]');
    expect(all.getAttribute('aria-label')).toBe('Select All');
    all.click();
    settle();
    expect(component.selected.length).toBe(3);
    all.click();
    settle();
    expect(component.selected.length).toBe(0);
  }));

  it('centres Name, Encryption and the algorithm on the Name box line, the box where the Material field kept it', fakeAsync(() => {
    render((manager) => { manager.isEncrypted = true; });
    settle();
    const row = q('.manager-new-pool-row-layout').getBoundingClientRect();
    const name = q('#pool-manager__name-input-field');
    const nameBox = name.getBoundingClientRect();
    expect(name.tagName).toBe('INPUT');
    expect([Math.round(nameBox.width), Math.round(nameBox.height)]).toEqual([202, 32]);
    expect(Math.round(nameBox.top - row.top)).toBe(20);
    expect(Math.round(row.height)).toBe(72);
    const middle = (el: Element): number => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    expect(middle(box('.manager-encryption-layout'))).toBeCloseTo(middle(name), 0);
    expect(middle(q('#pool-manager__encryption_algorithm-select'))).toBeCloseTo(middle(name), 0);
    expect(getComputedStyle(q('.manager-encryption-layout .checkbox-label')).paddingLeft).toBe('6px');
  }));

  it('filters on the kit inputs and names an invalid pattern in the error line', fakeAsync(() => {
    render();
    const filter = q<HTMLInputElement>('#pool-manager__nameFilter');
    expect(filter.tagName).toBe('INPUT');
    expect(filter.getAttribute('aria-label')).toBe('Filter disks by name');
    filter.value = '[';
    filter.dispatchEvent(new Event('input'));
    filter.dispatchEvent(new KeyboardEvent('keyup'));
    settle();
    const error = q('#filter-wrapper .form-error-line');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent.trim()).toBe('Invalid regex filter');
    expect(fixture.nativeElement.querySelector('mat-form-field, mat-checkbox, mat-select, mat-error, [matinput]')).toBeNull();
  }));
});
