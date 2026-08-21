import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { MatIconModule } from '@angular/material/icon';
import moment from 'moment-timezone';
import { of } from 'rxjs';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { LocaleService } from 'app/services/locale.service';
import { WebSocketService } from 'app/services/ws.service';
import { FieldConfig } from '../../models/field-config.interface';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

// the tooltip's doc-link pipe needs the docs service; the popup's help text is not under test
@Pipe({ standalone: false, name: 'docreplace' })
class DocReplaceStubPipe implements PipeTransform {
  transform(value: string): string { return value; }
}
import { FormSchedulerComponent } from './form-scheduler.component';

// the internal development record: the scheduler on spartan -- the preset select as the #351 field, the custom
// popup as a #354 surface with a template month grid. Karma has no theme service: sp tokens resolve
// on :root with the fallback palette (line #2A353D, bg1 #10151A, bg2 #171E24, fg1 #DCE3E6,
// fg2 #97A6AE, red #E3625A). The clock is pinned (moment.now) so the grid arithmetic is fixed:
// September 2026 starts on a Tuesday (2 leading blanks, 30 days, 5 rows), 'today' is the 16th.
describe('form-scheduler on spartan (the internal development record)', () => {
  const NOW = Date.parse('2026-09-16T12:00:00Z');
  let fixture: ComponentFixture<FormSchedulerComponent>;
  let component: FormSchedulerComponent;
  let group: UntypedFormGroup;
  let overlay: OverlayContainer;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const oq = (selector: string): HTMLElement => overlay.getContainerElement().querySelector(selector) as HTMLElement;
  const oqa = (selector: string): HTMLElement[] => Array.from(overlay.getContainerElement().querySelectorAll(selector));
  const trigger = (): HTMLButtonElement => q('button[data-slot="select-trigger"]') as HTMLButtonElement;
  const items = (): HTMLElement[] => oqa('hlm-select-content hlm-select-item');
  const popup = (): HTMLElement => oq('.advanced-date-picker');
  const settle = (ms = 300): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const tick = async (ms = 300): Promise<void> => { fixture.detectChanges(); await settle(ms); fixture.detectChanges(); };

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('0 0 * * *'), extra: Record<string, any> = {}): void => {
    const controls: Record<string, UntypedFormControl> = { [config.name]: control };
    Object.keys(extra).forEach((key) => { controls[key] = new UntypedFormControl(extra[key]); });
    group = new UntypedFormGroup(controls);
    component.config = { type: 'scheduler', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  const open = async (): Promise<void> => {
    trigger().click();
    await tick(50);
  };

  const openPopup = async (): Promise<void> => {
    await open();
    items().find((item) => /Custom/.test(item.textContent)).click();
    await tick(400); // togglePopup builds the preview 200ms after opening
  };

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await tick(50);
  };

  const key = (target: EventTarget, k: string, keyCode: number): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, keyCode, bubbles: true } as KeyboardEventInit));
  };

  const pin = (iso: string): void => {
    const at = Date.parse(iso);
    moment.now = () => at;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormSchedulerComponent, FormErrorsComponent, TooltipComponent, DocReplaceStubPipe, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [
        FormsModule, ReactiveFormsModule, OverlayModule, MatIconModule, TranslateModule.forRoot(),
        HlmButtonImports, HlmCheckboxImports, HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmLabelImports, HlmSelectImports, HlmSeparatorImports,
      ],
      providers: [
        { provide: WebSocketService, useValue: { call: () => of({ timezone: 'UTC' }) } },
        { provide: LocaleService, useValue: { getAngularFormat: () => 'yyyy-MM-dd HH:mm:ss' } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    moment.now = () => NOW;
    fixture = TestBed.createComponent(FormSchedulerComponent);
    component = fixture.componentInstance;
    overlay = TestBed.inject(OverlayContainer);
    fixture.nativeElement.style.width = '900px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
  });

  afterEach(() => {
    overlay.ngOnDestroy();
    moment.now = () => Date.now();
    moment.tz.setDefault();
  });

  it('renders the preset on the #351 box and lists the presets plus Custom, Material-free', async () => {
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    expect(q('label').textContent.trim()).toBe('Schedule');
    expect(q('label').getAttribute('for')).toBe('cron_picker-select');
    const t = trigger();
    expect(t.id).toBe('cron_picker-select');
    expect(t.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(t).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(t.textContent.replace(/\s+/g, ' ').trim()).toBe('Daily (0 0 * * *) at 00:00 (12:00 AM)');
    expect(q('hlm-select-trigger').getAttribute('title')).toBe('0 0 * * *');
    expect(q('[ix-auto="scheduler__Schedule"]')).not.toBeNull();
    expect(q('[ix-auto="select__Schedule"]')).not.toBeNull();
    expect(q('mat-form-field')).toBeNull();
    expect(q('mat-select')).toBeNull();
    await open();
    const list = items();
    expect(list.length).toBe(5);
    expect(list.map((item) => item.getBoundingClientRect().height)).toEqual([32, 32, 32, 32, 32]);
    expect(list[0].textContent).toContain('Hourly');
    expect(list[0].querySelector('em.crontab').textContent).toBe('(0 * * * *)');
    expect(list[0].querySelector('.preset-description').textContent.trim()).toBe('at the start of each hour');
    expect(list[4].textContent.replace(/\s+/g, ' ').trim()).toBe('Custom (0 0 * * *)');
    expect(getComputedStyle(list[0].querySelector('em.crontab')).color).toBe('rgb(151, 166, 174)');
    // one selected row: Daily owns the value, Custom does not
    expect(oqa('hlm-select-item[aria-selected="true"]').length).toBe(1);
    expect(list[1].getAttribute('aria-selected')).toBe('true');
    expect(oq('mat-option')).toBeNull();
  });

  it('writes a picked preset to the control and tells the consumer', async () => {
    const onChangeOption = jasmine.createSpy('onChangeOption');
    mount({ name: 'cron_picker', placeholder: 'Schedule', onChangeOption } as Partial<FieldConfig>);
    await open();
    items().find((item) => /Weekly/.test(item.textContent)).click();
    await tick(50);
    expect(group.controls.cron_picker.value).toBe('0 0 * * sun');
    expect(onChangeOption).toHaveBeenCalledWith({ event: { value: '0 0 * * sun' } });
    expect(trigger().textContent.replace(/\s+/g, ' ').trim()).toBe('Weekly (0 0 * * sun) on Sundays at 00:00 (12:00 AM)');
    expect(component.crontab).toBe('0 0 * * sun');
  });

  it('opens Custom as a fixed #354 surface with the month grid marked from the cron parser, Material-free', async () => {
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    await openPopup();
    const p = popup();
    expect(p).not.toBeNull();
    expect(component.isOpen).toBeTrue();
    const cs = getComputedStyle(p);
    expect(cs.position).toBe('fixed');
    expect(p.getBoundingClientRect().width).toBe(620);
    expect(cs.backgroundColor).toBe('rgb(23, 30, 36)');
    expect(cs.borderTopColor).toBe('rgb(42, 53, 61)');
    expect(cs.borderTopLeftRadius).toBe('6px');
    expect(cs.boxShadow).toBe('none');
    expect(p.querySelectorAll('mat-card, mat-month-view, mat-checkbox, mat-form-field, mat-select, mat-divider, .mat-mdc-button-base').length).toBe(0);
    expect(getComputedStyle(p.querySelector('.cron-fields')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    // the grid: September 2026 -- 5 rows of 7, 2 leading blanks, 36px cells, the 16th ringed, the 14
    // remaining days scheduled (daily)
    expect(p.querySelector('.calendar-month').textContent.trim()).toBe('September 2026');
    const cells = Array.from(p.querySelectorAll('.schedule-calendar tbody td'));
    expect(cells.length).toBe(35);
    expect(cells.slice(0, 3).map((c) => c.textContent.trim())).toEqual(['', '', '1']);
    expect(cells.filter((c) => c.textContent.trim()).length).toBe(30);
    expect(cells[2].getBoundingClientRect().width).toBe(36);
    expect(cells[2].getBoundingClientRect().height).toBe(36);
    const todayCell = p.querySelector('.schedule-calendar td.today');
    expect(todayCell.textContent.trim()).toBe('16');
    expect(todayCell.getAttribute('data-date')).toBe('2026-09-16');
    expect(getComputedStyle(todayCell.querySelector('.day')).borderTopColor).toBe('rgb(42, 53, 61)');
    const scheduled = Array.from(p.querySelectorAll('.schedule-calendar td.scheduled'));
    expect(scheduled.map((c) => c.textContent.trim())).toEqual(['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']);
    expect(getComputedStyle(scheduled[0].querySelector('.day')).backgroundColor).toBe('rgb(220, 227, 230)');
    expect(getComputedStyle(scheduled[0].querySelector('.day')).color).toBe('rgb(11, 15, 19)');
    expect(p.querySelectorAll('.schedule-calendar th').length).toBe(7);
    const nav = Array.from(p.querySelectorAll('.controls button')) as HTMLButtonElement[];
    expect(nav.map((b) => [b.getBoundingClientRect().width, b.getBoundingClientRect().height])).toEqual([[32, 32], [32, 32]]);
    expect(getComputedStyle(nav[0].querySelector('mat-icon')).fontSize).toBe('20px');
    expect(getComputedStyle(p.querySelector('.schedule-calendar th')).color).toBe('rgb(151, 166, 174)');
    // the list follows the parser
    expect(p.querySelectorAll('.schedule-list li').length).toBe(15);
    expect(p.querySelector('.time-zone-label').textContent).toContain('UTC');
    expect(p.querySelector('.schedule-list li:nth-child(2)').textContent.trim()).toBe('Thu 2026-09-17 00:00:00 +0000');
    // the cron column: presets select, three boxes, 19 cells, separators, Done
    expect(p.querySelectorAll('.cron-fields hlm-select').length).toBe(1);
    expect(p.querySelectorAll('.m-h-d-row hlm-input-group').length).toBe(3);
    expect(p.querySelector('.m-h-d-row hlm-input-group').getBoundingClientRect().height).toBe(32);
    expect(p.querySelectorAll('.check-grid hlm-checkbox[data-slot="checkbox"]').length).toBe(19);
    expect(p.querySelectorAll('.check-grid .checkbox-cell').length).toBe(19);
    expect((p.querySelector('.check-grid .checkbox-cell') as HTMLElement).getBoundingClientRect().height).toBe(32);
    expect(p.querySelectorAll('hlm-separator[data-slot="separator"]').length).toBe(6);
    expect(getComputedStyle(p.querySelector('h4.preview-label')).fontSize).toBe('15px');
    const done = p.querySelector('button[id$="-cron-done"]') as HTMLButtonElement;
    expect(done.disabled).toBeFalse();
    expect(getComputedStyle(done).backgroundColor).toBe('rgb(220, 227, 230)');
    // next month: October, every day scheduled, previous enabled; back: previous disabled again
    nav[1].click();
    await tick(50);
    expect(p.querySelector('.calendar-month').textContent.trim()).toBe('October 2026');
    expect(p.querySelectorAll('.schedule-calendar td.scheduled').length).toBe(31);
    expect(p.querySelector('.schedule-calendar td.today')).toBeNull();
    expect(nav[0].disabled).toBeFalse();
    nav[0].click();
    await tick(50);
    expect(p.querySelector('.calendar-month').textContent.trim()).toBe('September 2026');
    expect(nav[0].disabled).toBeTrue();
    // Escape closes the overlay and the field follows, so Custom opens it again
    key(document.body, 'Escape', 27);
    await tick(50);
    expect(popup()).toBeNull();
    expect(component.isOpen).toBeFalse();
    await openPopup();
    expect(popup()).not.toBeNull();
  });

  it('opens Custom from the keyboard and draws a Saturday-first six-row month and an empty last day', async () => {
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    await open();
    key(trigger(), 'End', 35);
    key(trigger(), 'Enter', 13);
    await tick(400);
    expect(component.isOpen).toBeTrue();
    expect(popup()).not.toBeNull();
    expect(group.controls.cron_picker.value).toBe('0 0 * * *');
    (popup().querySelector('button[id$="-cron-done"]') as HTMLButtonElement).click();
    await tick(50);
    // August 2026 starts on a Saturday: 6 blanks, 31 days, 6 rows
    pin('2026-08-15T12:00:00Z');
    fixture = TestBed.createComponent(FormSchedulerComponent);
    component = fixture.componentInstance;
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    await openPopup();
    let cells = Array.from(popup().querySelectorAll('.schedule-calendar tbody td'));
    expect(cells.length).toBe(42);
    expect(cells.slice(0, 7).map((c) => c.textContent.trim())).toEqual(['', '', '', '', '', '', '1']);
    expect(popup().querySelectorAll('.schedule-calendar td.scheduled').length).toBe(16);
    (popup().querySelector('button[id$="-cron-done"]') as HTMLButtonElement).click();
    await tick(50);
    // the last day of the month: nothing left to schedule, the list is the zone line alone
    pin('2026-09-30T12:00:00Z');
    fixture = TestBed.createComponent(FormSchedulerComponent);
    component = fixture.componentInstance;
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    await openPopup();
    cells = Array.from(popup().querySelectorAll('.schedule-calendar tbody td'));
    expect(cells.length).toBe(35);
    expect(popup().querySelectorAll('.schedule-calendar td.scheduled').length).toBe(0);
    expect(popup().querySelector('.schedule-calendar td.today').textContent.trim()).toBe('30');
    expect(popup().querySelectorAll('.schedule-list li').length).toBe(1);
    expect((popup().querySelector('.controls button:first-child') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('edits the crontab through the boxes and cells, flags an invalid field, and Done writes the control', async () => {
    mount({ name: 'cron_picker', placeholder: 'Schedule' });
    await openPopup();
    const p = popup();
    const hours = p.querySelector('#cron_picker-cron-hours') as HTMLInputElement;
    expect(hours.value).toBe('0');
    await type(hours, '6');
    expect(component.crontab).toBe('0 6 * * *');
    const mon = p.querySelectorAll('hlm-checkbox.weekday')[1].querySelector('button[role="checkbox"]') as HTMLButtonElement;
    mon.click();
    await tick(50);
    expect(component.crontab).toBe('0 6 * * mon');
    expect(mon.getAttribute('data-state')).toBe('checked');
    const mondays = Array.from(p.querySelectorAll('.schedule-calendar td.scheduled'));
    expect(mondays.map((c) => c.getAttribute('data-date'))).toEqual(['2026-09-21', '2026-09-28']);
    expect(p.querySelectorAll('.schedule-list li').length).toBe(3);
    expect(p.querySelector('.schedule-list li:nth-child(2)').textContent.trim()).toBe('Mon 2026-09-21 06:00:00 +0000');
    // the Custom row reads the live crontab
    expect(oq('hlm-select-content')).toBeNull();
    // a month cell narrows the grid to nothing this month; the popup's presets select resets it
    const jan = p.querySelectorAll('hlm-checkbox.month')[0].querySelector('button[role="checkbox"]') as HTMLButtonElement;
    jan.click();
    await tick(50);
    expect(component.crontab).toBe('0 6 * jan mon');
    expect(p.querySelectorAll('.schedule-calendar td.scheduled').length).toBe(0);
    (p.querySelector('.cron-presets button[data-slot="select-trigger"]') as HTMLButtonElement).click();
    await tick(50);
    const presetItems = oqa('hlm-select-content hlm-select-item');
    expect(presetItems.length).toBe(4);
    expect(presetItems[2].textContent.trim()).toBe('Weekly');
    presetItems[2].click();
    await tick(50);
    expect(component.crontab).toBe('0 0 * * sun');
    expect(jan.getAttribute('data-state')).toBe('unchecked');
    expect(mon.getAttribute('data-state')).toBe('unchecked');
    const sun = p.querySelectorAll('hlm-checkbox.weekday')[0].querySelector('button[role="checkbox"]');
    expect(sun.getAttribute('data-state')).toBe('checked');
    expect(hours.value).toBe('0');
    expect(Array.from(p.querySelectorAll('.schedule-calendar td.scheduled')).map((c) => c.textContent.trim())).toEqual(['20', '27']);
    await type(hours, '6');
    mon.click();
    (sun as HTMLButtonElement).click();
    await tick(50);
    expect(component.crontab).toBe('0 6 * * mon');
    // an invalid value paints the box red (after its 120ms transition) and holds Done; the control is untouched until Done
    await type(hours, 'x y');
    await settle(200);
    expect(component.validHours).toBeFalse();
    expect(getComputedStyle(hours.closest('hlm-input-group')).borderTopColor).toBe('rgb(227, 98, 90)');
    expect((p.querySelector('button[id$="-cron-done"]') as HTMLButtonElement).disabled).toBeTrue();
    await type(hours, '6');
    expect(component.validHours).toBeTrue();
    expect(group.controls.cron_picker.value).toBe('0 0 * * *');
    (p.querySelector('button[id$="-cron-done"]') as HTMLButtonElement).click();
    await tick(50);
    expect(group.controls.cron_picker.value).toBe('0 6 * * mon');
    expect(component.isOpen).toBeFalse();
    expect(popup()).toBeNull();
    expect(trigger().textContent.replace(/\s+/g, ' ').trim()).toBe('Custom (0 6 * * mon)');
    await open();
    expect(oqa('hlm-select-item[aria-selected="true"]').length).toBe(1);
    expect(oq('hlm-select-item.custom-option').getAttribute('aria-selected')).toBe('true');
    expect(oq('hlm-select-item.custom-option').textContent.replace(/\s+/g, ' ').trim()).toBe('Custom (0 6 * * mon)');
  });

  it('hides the Minutes box under noMinutes and filters the list by the begin/end options', async () => {
    mount({ name: 'smarttest_picker', placeholder: 'Schedule', noMinutes: true, options: ['begin', 'end'] } as Partial<FieldConfig>,
      new UntypedFormControl('0 6 * * *'), { begin: '08:00', end: '12:00' });
    expect(trigger().textContent.replace(/\s+/g, ' ').trim()).toBe('Custom (0 6 * * *)');
    await openPopup();
    const p = popup();
    expect(p.querySelectorAll('.m-h-d-row hlm-input-group').length).toBe(2);
    expect(p.querySelector('#smarttest_picker-cron-minutes')).toBeNull();
    expect(p.querySelector('h4.preview-label + tooltip, .section-head h4').textContent.replace(/\s+/g, ' ').trim()).toBe('Hours/Days');
    // 06:00 is outside 08:00-12:00, so nothing lists; 09:00 does, for the 14 days left
    expect(p.querySelectorAll('.schedule-list li').length).toBe(1);
    expect(p.querySelectorAll('.schedule-calendar td.scheduled').length).toBe(14);
    await type(p.querySelector('#smarttest_picker-cron-hours') as HTMLInputElement, '9');
    expect(p.querySelectorAll('.schedule-list li').length).toBe(15);
  });

  it('pages the preview list on scroll: 128 entries, then 128 more from where it stopped', async () => {
    mount({ name: 'cron_picker', placeholder: 'Schedule' }, new UntypedFormControl('0 * * * *'));
    await openPopup();
    const list = popup().querySelector('.schedule-list') as HTMLElement;
    expect(list.querySelectorAll('li').length).toBe(1 + 128);
    expect(list.querySelector('li:nth-child(2)').textContent.trim()).toBe('Wed 2026-09-16 12:00:00 +0000');
    list.scrollTop = list.scrollHeight;
    list.dispatchEvent(new Event('scroll'));
    await tick(50);
    expect(list.querySelectorAll('li').length).toBe(1 + 256);
    expect(list.querySelector('li:nth-child(129)').textContent.trim()).toBe('Mon 2026-09-21 19:00:00 +0000');
    expect(list.querySelector('li:nth-child(130)').textContent.trim()).toBe('Mon 2026-09-21 20:00:00 +0000');
  });
});
