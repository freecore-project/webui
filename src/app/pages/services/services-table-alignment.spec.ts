import { CommonModule } from '@angular/common';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MaterialModule } from '../../appMaterial.module';
import { CommonDirectivesModule } from '../../directives/common/common-directives.module';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
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

describe('Services table row alignment', () => {
  let fixture: ComponentFixture<ServicesTableComponent>;
  let typographyFixture: ComponentFixture<ServicesTypographyHostComponent>;

  beforeEach(async () => {
    document.body.classList.add('ix-blue', 'fc-ui'); // the internal development record: measured on the shell's 40px geometry

    await TestBed.configureTestingModule({
      declarations: [ServicesTableComponent, ServicesTypographyHostComponent],
      imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxDatatableModule,
        TranslateModule.forRoot(),
        HlmButtonImports, HlmCheckboxImports, HlmSpinnerImports, HlmSwitchImports, HlmTooltipImports, CommonDirectivesModule,
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
    document.body.classList.remove('ix-blue', 'fc-ui');
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
      expect(row.getBoundingClientRect().height).toBe(40);
      row.querySelectorAll('button[role="checkbox"], .clickable, button[role="switch"], button.service-action')
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
    // the internal development record: the scroller is ngx's column model (columnGroupWidths.total) and the row is
    // laid out to it; under the shell ngx reserves its 8px scrollbar, and below the min-width sum the
    // DOM honours the inline min-widths the model ignores. What must hold: the scroller and the row
    // agree, the scroll extent covers the rendered cells, and header and body columns are the same.
    const rowCenter = root.querySelector('datatable-body-row .datatable-row-center') as HTMLElement;
    const shellScrollbar = 8; // the shell's ::-webkit-scrollbar width, which ngx reserves from the rows but not the scroller
    const scrollerOverRow = scroller.getBoundingClientRect().width - rowCenter.getBoundingClientRect().width;
    expect(scrollerOverRow).toBeGreaterThanOrEqual(-1);
    expect(scrollerOverRow).toBeLessThanOrEqual(shellScrollbar + 1);
    expect(Math.abs(body.scrollWidth - Math.max(body.clientWidth, columnsWidth))).toBeLessThanOrEqual(1);
    // Header and body columns stay the same widths (a flex cell must not grow to its content).
    const headers = root.querySelectorAll('datatable-header-cell');
    cells.forEach((cell, index) => expect(Math.abs(cell.getBoundingClientRect().width - headers[index].getBoundingClientRect().width)).toBeLessThanOrEqual(1));
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
    const netdataActions = root.querySelectorAll('datatable-body-row')[2].querySelectorAll('button.service-action');
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
    // the internal development record: the #352 box writes the row and hands the page the change; its cell clicks too
    const box = row.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    const before = fixture.componentInstance.data[2].enable;
    box.click();
    expect(fixture.componentInstance.data[2].enable).toBe(!before);
    expect(fixture.componentInstance.conf.enableToggle).toHaveBeenCalledWith({ checked: !before }, fixture.componentInstance.data[2]);
    (row.querySelector('.checkbox-cell') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.data[2].enable).toBe(before);
    // the S1 switch: 32x18 on the hairline, its thumb 14px; display-only (out of the tab order,
    // hidden from readers) behind the overlay, which is the accessible switch
    const sw = row.querySelector('button[role="switch"]:not(.clickable)') as HTMLButtonElement;
    expect([Math.round(sw.getBoundingClientRect().width), Math.round(sw.getBoundingClientRect().height)]).toEqual([32, 18]);
    expect(sw.querySelector('brn-switch-thumb').getBoundingClientRect().width).toBe(14);
    expect(sw.getAttribute('data-state')).toBe(fixture.componentInstance.data[2].state === 'RUNNING' ? 'checked' : 'unchecked');
    expect(sw.tabIndex).toBe(-1);
    expect(sw.id).toBe('slide-toggle__Netdata_Running-button');
    expect(sw.closest('hlm-switch').getAttribute('aria-hidden')).toBe('true');
    const overlay = row.querySelector('.clickable') as HTMLElement;
    expect(overlay.getAttribute('role')).toBe('switch');
    expect(overlay.tabIndex).toBe(0);
    expect(overlay.getAttribute('aria-checked')).toBe(String(fixture.componentInstance.data[2].state === 'RUNNING'));
    expect(overlay.getAttribute('aria-label')).toBe('Netdata Running');
    expect(getComputedStyle(overlay).cursor).toBe('pointer');
    const or = overlay.getBoundingClientRect();
    const sr = sw.getBoundingClientRect();
    expect(Math.abs(or.left - sr.left) + Math.abs(or.right - sr.right) + Math.abs(or.top - sr.top) + Math.abs(or.bottom - sr.bottom)).toBeLessThanOrEqual(1);
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.conf.toggle).toHaveBeenCalledTimes(2);
    // the hooks sit on laid-out wrappers
    expect(row.querySelector('.service-toggle').getAttribute('ix-auto')).toBe('slider__Netdata_Running');
    expect(row.querySelector('.checkbox-cell').getAttribute('ix-auto')).toBe('checkbox__Netdata_Start Automatically');
    expect(box.getAttribute('aria-label')).toBe('Netdata Start Automatically');
    expect(box.id).toBe('checkbox__Netdata-input');
    expect([Math.round(row.querySelector('.checkbox-cell').getBoundingClientRect().width), Math.round(row.querySelector('.checkbox-cell').getBoundingClientRect().height)]).toEqual([32, 32]);
    expect(getComputedStyle(row.querySelector('.checkbox-cell')).cursor).toBe('pointer');
    expect(root.querySelector('mat-slide-toggle, mat-checkbox, .mat-mdc-icon-button, mat-spinner, .mdc-switch, .mdc-checkbox')).toBeNull();
    const actions = row.querySelectorAll('button.service-action');
    expect(actions.length).toBe(2);
    (actions[0] as HTMLElement).click();
    (actions[1] as HTMLElement).click();
    expect(fixture.componentInstance.conf.editService).toHaveBeenCalledOnceWith('netdata');
    expect(fixture.componentInstance.conf.openNetdataPortal).toHaveBeenCalledTimes(1);
    actions.forEach((a: HTMLElement) => {
      expect([Math.round(a.getBoundingClientRect().width), Math.round(a.getBoundingClientRect().height)]).toEqual([32, 32]);
      expect(a.querySelector('.mat-icon').getBoundingClientRect().width).toBe(20);
      expect(getComputedStyle(a).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });
  });

  it('follows a failed autostart write back and swaps the switch for a 20px spinner while a service changes state (the internal development record)', async () => {
    const root = await resizeTable(1000);
    const row = root.querySelectorAll('datatable-body-row')[2] as HTMLElement;
    const data = fixture.componentInstance.data[2];
    // the page flips row.enable back when service.update answers false
    fixture.componentInstance.conf.enableToggle.and.callFake((_event: any, service: any) => {
      Promise.resolve().then(() => { service.enable = !service.enable; });
    });
    const before = data.enable;
    const box = row.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    box.click();
    fixture.detectChanges();
    expect(data.enable).toBe(!before);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(data.enable).toBe(before);
    expect(box.getAttribute('data-state')).toBe(before ? 'checked' : 'unchecked');
    expect(box.getAttribute('aria-checked')).toBe(String(before));
    // in flight: the spinner stands in for the switch and its overlay
    fixture.componentInstance.conf.toggle.and.callFake((r: any) => { r.onChanging = true; });
    (row.querySelector('.clickable') as HTMLElement).click();
    fixture.detectChanges();
    const spinner = row.querySelector('hlm-spinner.service-spinner') as HTMLElement;
    expect(spinner).not.toBeNull();
    expect([Math.round(spinner.getBoundingClientRect().width), Math.round(spinner.getBoundingClientRect().height)]).toEqual([20, 20]);
    expect(getComputedStyle(spinner).fontSize).toBe('20px');
    const rr = row.getBoundingClientRect();
    const sr = spinner.getBoundingClientRect();
    expect(Math.abs((sr.top + sr.height / 2) - (rr.top + rr.height / 2))).toBeLessThanOrEqual(2);
    expect(row.querySelector('button[role="switch"], .clickable')).toBeNull();
    expect(root.querySelector('mat-spinner')).toBeNull();
    data.onChanging = false;
    fixture.detectChanges();
    expect(row.querySelector('button[role="switch"]:not(.clickable)')).not.toBeNull();
  });

  it('centers the name and every row control within two pixels', () => {
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('datatable-body-row');

    rows.forEach((row) => {
      const controls: [string, HTMLElement][] = [
        ['name', row.querySelector('[id^="row-name__"]')],
        ['switch', row.querySelector('button[role="switch"]')],
        ['checkbox', row.querySelector('button[role="checkbox"]')],
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
