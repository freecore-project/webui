import { NO_ERRORS_SCHEMA } from '@angular/core';
import { _CdkPrivateStyleLoader, _VisuallyHiddenLoader } from '@angular/cdk/private';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { StorageService } from '../../../../../services';
import { VdevComponent } from './vdev.component';

// the internal development record: the vdev type on the kit select -- the options the disk count allows, the closed
// field in the option's words, onTypeChange after the model, one id per vdev.
describe('vdev type select (the internal development record)', () => {
  let fixture: ComponentFixture<VdevComponent>;
  let manager: any;
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VdevComponent],
      imports: [FormsModule, NoopAnimationsModule, NgxDatatableModule, TranslateModule.forRoot(), ...HlmCheckboxImports, ...HlmSelectImports],
      providers: [{ provide: StorageService, useValue: { tableSorter: (rows: any[]) => rows, convertBytestoHumanReadable: (n: number) => `${n}` } }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    TestBed.inject(_CdkPrivateStyleLoader).load(_VisuallyHiddenLoader); // the app has it from start-up
    manager = {
      isNew: true, vdevs: { data: [{}] }, selected: [], first_data_vdev_type: 'stripe', swapondrive: 2,
      removeDisk: jasmine.createSpy('removeDisk'), getCurrentLayout: jasmine.createSpy('getCurrentLayout'),
    };
    fixture = TestBed.createComponent(VdevComponent);
    Object.assign(fixture.componentInstance, { manager, group: 'data', index: 0 });
    fixture.nativeElement.style.cssText = 'display:block; width:900px';
    fixture.detectChanges();
    const disks = ['ada1', 'ada2', 'ada3'].map((devname) => ({ devname, real_capacity: 10737418240, size: 10737418240, capacity: '10 GiB', details: [] }));
    fixture.componentInstance.disks = disks;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('offers the types three disks allow and switches through the kit select', async () => {
    const trigger = fixture.nativeElement.querySelector('#vdev__option-menu-data-0') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent.trim()).toBe('Stripe');
    expect((fixture.nativeElement.querySelector('label[for="vdev__option-menu-data-0"]') as HTMLElement).textContent.trim()).toBe('Type');
    expect(Math.round(trigger.getBoundingClientRect().height)).toBe(32);
    expect(Math.round(trigger.getBoundingClientRect().width)).toBe(200);

    trigger.click();
    fixture.detectChanges();
    await settle();
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.map((o) => o.textContent.trim())).toEqual(['Stripe', 'Mirror', 'Raid-z']);
    options[1].click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(fixture.componentInstance.type).toBe('mirror');
    expect(manager.getCurrentLayout).toHaveBeenCalled();
    expect(trigger.textContent.trim()).toBe('Mirror');
    expect(fixture.nativeElement.querySelector('mat-select, mat-checkbox')).toBeNull();
  });
});
