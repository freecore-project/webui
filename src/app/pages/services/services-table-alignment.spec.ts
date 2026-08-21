import { CommonModule } from '@angular/common';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MaterialModule } from '../../appMaterial.module';
import { RestService, WebSocketService } from '../../services';
import { ServicesTableComponent } from './services-table.component';

@Component({
  standalone: false,
  template: '',
  styleUrls: [
  '../../../assets/styles/fonts.css',
  '../../../assets/iconfont/material-icons.css',
  ],
  })
class ServicesTypographyHostComponent {}

describe('Legacy Services table row alignment', () => {
  let fixture: ComponentFixture<ServicesTableComponent>;
  let typographyFixture: ComponentFixture<ServicesTypographyHostComponent>;
  let servicesHost: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    document.body.classList.add('ix-blue');
    servicesHost = document.createElement('services');
    document.body.appendChild(servicesHost);

    await TestBed.configureTestingModule({
      declarations: [ServicesTableComponent, ServicesTypographyHostComponent],
      imports: [
        CommonModule,
        FormsModule,
        NoopAnimationsModule,
        MaterialModule,
        NgxDatatableModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: Router, useValue: {} },
        { provide: RestService, useValue: {} },
        {
          provide: WebSocketService,
          useValue: { call: jasmine.createSpy('call').and.returnValue(of({ consolemsg: false })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    typographyFixture = TestBed.createComponent(ServicesTypographyHostComponent);
    typographyFixture.detectChanges();
    fixture = TestBed.createComponent(ServicesTableComponent);
    servicesHost.appendChild(fixture.nativeElement);
    fixture.componentInstance.conf = {
      showSpinner: false,
      toggle: jasmine.createSpy('toggle'),
      enableToggle: jasmine.createSpy('enableToggle'),
      editService: jasmine.createSpy('editService'),
      openNetdataPortal: jasmine.createSpy('openNetdataPortal'),
    };
    fixture.componentInstance.data = [
      {
        label: 'AFP',
        title: 'afp',
        state: 'STOPPED',
        enable: false,
      },
      {
        label: 'S.M.A.R.T.',
        title: 'smart',
        state: 'STOPPED',
        enable: true,
      },
      {
        label: 'Netdata',
        title: 'netdata',
        state: 'RUNNING',
        enable: true,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    typographyFixture?.destroy();
    servicesHost?.remove();
    document.body.classList.remove('ix-blue');
  });

  async function resizeTable(width: number): Promise<HTMLElement> {
    const root = fixture.nativeElement as HTMLElement;
    root.style.display = 'block';
    root.style.width = `${width}px`;
    root.style.font = '14px / 23px "IBM Plex Sans"';
    await document.fonts.ready;
    const table = fixture.debugElement.query(By.directive(DatatableComponent)).componentInstance;
    table.recalculate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return root;
  }

  function expectControlsInsideCells(root: HTMLElement): void {
    root.querySelectorAll('datatable-body-row').forEach((row: HTMLElement) => {
      expect(row.getBoundingClientRect().height).toBe(50);
      row.querySelectorAll('.mat-checkbox-frame, .mat-checkbox-ripple, .clickable, .mat-slide-toggle-bar, button[mat-icon-button]')
        .forEach((control: HTMLElement) => {
          const rect = control.getBoundingClientRect();
          const cell = control.closest('datatable-body-cell').getBoundingClientRect();
          expect(rect.left).withContext(control.outerHTML).toBeGreaterThanOrEqual(cell.left);
          expect(rect.right).withContext(control.outerHTML).toBeLessThanOrEqual(cell.right);
        });
    });
    root.querySelectorAll('datatable-header-cell').forEach((cell: HTMLElement) => {
      const label = cell.querySelector('.datatable-header-cell-label');
      const range = document.createRange();
      range.selectNodeContents(label);
      expect(range.getBoundingClientRect().right).withContext(label.textContent.trim()).toBeLessThanOrEqual(
        cell.getBoundingClientRect().right - parseFloat(getComputedStyle(cell).paddingRight),
      );
    });
  }

  async function waitForLayout(): Promise<void> {
    // ResizeObserver delivery follows layout; allow its recalculation to paint.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function expectScrollerMatchesColumns(root: HTMLElement): void {
    const body = root.querySelector('datatable-body') as HTMLElement;
    const scroller = root.querySelector('datatable-scroller');
    const cells = root.querySelectorAll('datatable-body-row')[0].querySelectorAll('datatable-body-cell');
    const columnsWidth = Array.from(cells).reduce((total, cell) => total + cell.getBoundingClientRect().width, 0);
    expect(Math.abs(scroller.getBoundingClientRect().width - columnsWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(body.scrollWidth - Math.max(body.clientWidth, columnsWidth))).toBeLessThanOrEqual(1);
  }

  it('keeps the horizontal scroll extent aligned with columns when shrinking and growing', async () => {
    const root = await resizeTable(1000);
    await waitForLayout();
    expectScrollerMatchesColumns(root);

    root.style.width = '474px';
    await waitForLayout();
    expectScrollerMatchesColumns(root);
    const body = root.querySelector('datatable-body') as HTMLElement;
    expect(body.scrollWidth).toBeGreaterThan(body.clientWidth);

    body.scrollLeft = body.scrollWidth - body.clientWidth;
    body.dispatchEvent(new Event('scroll'));
    await waitForLayout();
    const lastCell = root.querySelectorAll('datatable-body-row')[0].querySelectorAll('datatable-body-cell')[3];
    expect(Math.abs(lastCell.getBoundingClientRect().right - body.getBoundingClientRect().left - body.clientWidth))
      .toBeLessThanOrEqual(1);

    root.style.width = '1000px';
    await waitForLayout();
    expectScrollerMatchesColumns(root);
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
    expectControlsInsideCells(root);
  });

  it('preserves manually resized and reordered columns across container changes', async () => {
    const root = await resizeTable(1000);
    await waitForLayout();
    const table = fixture.componentInstance.datatable as DatatableComponent;
    const labelColumn = table.bodyComponent.columns.find((column) => column.prop === 'label');
    table.headerComponent.resize.emit({ column: labelColumn, newValue: 260 });
    fixture.detectChanges();
    await fixture.whenStable();
    table.headerComponent.reorder.emit({ column: table.bodyComponent.columns[0], prevValue: 0, newValue: 2 });
    fixture.detectChanges();
    await waitForLayout();
    const columnOrder = table.bodyComponent.columns.map((column) => column.prop);
    expect(columnOrder[2]).toBe('label');

    for (const width of [474, 1000, 474]) {
      root.style.width = `${width}px`;
      await waitForLayout();
      expect(table.bodyComponent.columns.map((column) => column.prop)).toEqual(columnOrder);
      expectScrollerMatchesColumns(root);
      if (width === 474) {
        expect(table.bodyComponent.columns.find((column) => column.prop === 'label').width).toBe(260);
      }
      expectControlsInsideCells(root);
    }
  });

  it('recalculates after its container changes without another window resize event', async () => {
    const root = await resizeTable(320);
    const body = root.querySelector('datatable-body') as HTMLElement;
    expect(body.clientWidth).toBeLessThanOrEqual(320);

    root.style.width = '800px';
    await waitForLayout();

    expect(body.clientWidth).toBeGreaterThanOrEqual(780);
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
    expectControlsInsideCells(root);
  });

  it('handles container changes while loading and observes the table created afterward', async () => {
    const conf = { ...fixture.componentInstance.conf, showSpinner: true };
    const data = fixture.componentInstance.data;
    fixture.destroy();
    fixture = TestBed.createComponent(ServicesTableComponent);
    servicesHost.appendChild(fixture.nativeElement);
    fixture.componentInstance.conf = conf;
    fixture.componentInstance.data = data;
    const root = fixture.nativeElement as HTMLElement;
    root.style.display = 'block';
    root.style.width = '320px';
    fixture.detectChanges();
    await waitForLayout();
    expect(root.querySelector('ngx-datatable')).toBeNull();
    expect(fixture.componentInstance.datatable).toBeUndefined();

    root.style.width = '800px';
    await waitForLayout();
    expect(root.querySelector('ngx-datatable')).toBeNull();

    conf.showSpinner = false;
    fixture.detectChanges();
    await waitForLayout();
    const table = fixture.debugElement.query(By.directive(DatatableComponent)).componentInstance;
    expect(fixture.componentInstance.datatable).toBe(table);
    const body = root.querySelector('datatable-body') as HTMLElement;
    expect(body.clientWidth).toBeGreaterThanOrEqual(780);

    root.style.width = '1000px';
    await waitForLayout();
    expect(body.clientWidth).toBeGreaterThanOrEqual(980);
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
  });

  it('disconnects its observer and window listener when destroyed', () => {
    const observer = (fixture.componentInstance as any).resizeObserver as ResizeObserver;
    const disconnect = spyOn(observer, 'disconnect').and.callThrough();
    const findPageSize = spyOn(fixture.componentInstance, 'findPageSize').and.callThrough();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('resize'));
    expect(findPageSize).not.toHaveBeenCalled();
  });

  it('keeps narrow-layout controls and headings intact with local horizontal scrolling', async () => {
    const root = await resizeTable(320);
    expectControlsInsideCells(root);
    const body = root.querySelector('datatable-body') as HTMLElement;
    expect(getComputedStyle(body).overflowX).toBe('auto');
    expect(body.scrollWidth).toBeGreaterThan(body.clientWidth);
    expect(root.querySelector('ngx-datatable').getBoundingClientRect().width).toBeLessThanOrEqual(320);

    body.scrollLeft = body.scrollWidth - body.clientWidth;
    body.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    fixture.detectChanges();
    const netdataActions = root.querySelectorAll('datatable-body-row')[2].querySelectorAll('button[mat-icon-button]');
    expect(netdataActions[1].getBoundingClientRect().right).toBeLessThanOrEqual(body.getBoundingClientRect().right);
    const headers = root.querySelectorAll('datatable-header-cell');
    const cells = root.querySelectorAll('datatable-body-row')[2].querySelectorAll('datatable-body-cell');
    expect(Math.abs(headers[3].getBoundingClientRect().left - cells[3].getBoundingClientRect().left)).toBeLessThanOrEqual(1);
  });

  it('preserves desktop sizing, running overlays, checkboxes and both Netdata actions', async () => {
    const root = await resizeTable(1000);
    expectControlsInsideCells(root);
    const body = root.querySelector('datatable-body') as HTMLElement;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);

    const row = root.querySelectorAll('datatable-body-row')[2] as HTMLElement;
    (row.querySelector('.clickable') as HTMLElement).click();
    expect(fixture.componentInstance.conf.toggle).toHaveBeenCalledOnceWith(fixture.componentInstance.data[2]);
    (row.querySelector('mat-checkbox input[type="checkbox"]') as HTMLInputElement).click();
    expect(fixture.componentInstance.conf.enableToggle).toHaveBeenCalled();
    expect(fixture.componentInstance.data[2].enable).toBeFalse();
    const actions = row.querySelectorAll('button[mat-icon-button]');
    expect(actions.length).toBe(2);
    (actions[0] as HTMLElement).click();
    (actions[1] as HTMLElement).click();
    expect(fixture.componentInstance.conf.editService).toHaveBeenCalledOnceWith('netdata');
    expect(fixture.componentInstance.conf.openNetdataPortal).toHaveBeenCalledTimes(1);
  });

  it('centers the name and every row control within two pixels', () => {
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('datatable-body-row');

    rows.forEach((row) => {
      const controls: [string, HTMLElement][] = [
        ['name', row.querySelector('[id^="row-name__"]')],
        ['switch', row.querySelector('.mat-slide-toggle-bar')],
        ['checkbox', row.querySelector('.mat-checkbox-frame')],
        ['action', row.querySelector('[id^="action-button__"]')],
      ];
      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.top + (rowRect.height / 2);

      controls.forEach(([label, control]) => {
        const rect = control.getBoundingClientRect();
        const delta = Math.abs((rect.top + (rect.height / 2)) - rowCenter);

        expect(delta).withContext(`${label} is ${delta}px away from the row center`).toBeLessThanOrEqual(2);
      });
    });
  });
});
