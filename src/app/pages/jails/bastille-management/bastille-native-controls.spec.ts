import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of, Subject } from 'rxjs';
import { DialogService, JobService, WebSocketService } from '../../../services';
import { EntityTableAddActionsComponent } from '../../common/entity/entity-table/entity-table-add-actions.component';
import { EntityTableService } from '../../common/entity/entity-table/entity-table.service';
import { BastilleManagementComponent } from './bastille-management.component';
import { MatCardModule } from '@angular/material/card';
import { CommonDirectivesModule } from '../../../directives/common/common-directives.module';

@Component({ standalone: false, selector: 'entity-table', template: '' })
class TableStubComponent {
  @Input() title: string;
  @Input() conf: any;
}

describe('Bastille native controls', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EntityTableAddActionsComponent, BastilleManagementComponent, TableStubComponent],
      imports: [
        CommonModule, NoopAnimationsModule, TranslateModule.forRoot(), MatButtonModule,
        MatIconModule, MatFormFieldModule, MatDialogModule, HlmProgressImports, MatCardModule, // the internal development record: the console-log loader
        CommonDirectivesModule, HlmButtonImports, HlmDropdownMenuImports, // the internal development record: the Actions menu is the helm dropdown-menu
        HlmTooltipImports, // the internal development record: the Add button's tooltip is the helm tooltip
      ],
      providers: [
        { provide: EntityTableService, useValue: { addActionsUpdater$: new Subject() } },
        { provide: DialogService, useValue: {} },
        { provide: JobService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: WebSocketService, useValue: { call: () => of({ content: '<script>alert(1)</script>', truncated: false }), sub: () => of() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
    TestBed.resetTestingModule();
  });

  it('keeps Add disabled when moving from a single button to the native Actions menu', () => {
    const fixture = TestBed.createComponent(EntityTableAddActionsComponent);
    const add = jasmine.createSpy('add');
    fixture.componentInstance.entity = {
      conf: { route_add: ['jails'], addBtnDisabled: true, title: 'Jails' },
      getAddActions: () => [{ label: 'Bastille Jails', onClick: () => {} }],
      doAdd: add,
    };
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.menu-toggle').click();
    fixture.detectChanges();
    const button: HTMLButtonElement = TestBed.inject(OverlayContainer).getContainerElement().querySelector('#add_action_button');
    expect(button.disabled).toBeTrue();
    button.click();
    expect(add).not.toHaveBeenCalled();
    fixture.componentInstance.entity.conf.addBtnDisabled = false;
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
  });

  it('renders console output as text in a standard dialog', () => {
    const fixture = TestBed.createComponent(BastilleManagementComponent);
    fixture.componentInstance.serviceConfig = { installed: true, configured: true, configuration_valid: true, enabled: true };
    fixture.detectChanges();
    fixture.componentInstance.showLogs({
      name: 'web', state: 'up', release: '15.0-RELEASE', ip4_addr: '', boot: true, operable: true,
    });
    fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('pre').textContent).toBe('<script>alert(1)</script>');
    expect(overlay.querySelector('script')).toBeNull();
  });
});
