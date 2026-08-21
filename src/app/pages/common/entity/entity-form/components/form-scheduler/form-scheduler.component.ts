import {
  Component, OnInit, OnChanges, ViewChild, ElementRef, QueryList, Renderer2,
  ChangeDetectorRef, SimpleChanges, HostListener, AfterViewInit, AfterViewChecked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { FieldConfig } from '../../models/field-config.interface';
import { Field } from '../../models/field.interface';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { T } from 'app/translate-marker';
import { LocaleService } from 'app/services/locale.service';

import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import moment from 'moment-timezone';
import * as parser from 'cron-parser';
import { WebSocketService } from 'app/services/ws.service';
import { EntityUtils } from '../../../utils';
import globalHelptext from '../../../../../../helptext/global-helptext';

interface CronPreset {
  label: string;
  value: string;
  description?: string;
}

interface CronDate {
  value: any;
  done: boolean;
}

/** the internal development record: one cell of the template month grid. */
interface CalendarDay {
  day: number;
  iso: string;
  label: string;
  scheduled: boolean;
  today: boolean;
}

@Component({
  standalone: false,
  selector: 'form-scheduler',
  templateUrl: './form-scheduler.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-scheduler.component.css', '../dynamic-field/dynamic-field.css'],
})
export class FormSchedulerComponent implements Field, OnInit, OnChanges, AfterViewInit,
  AfterViewChecked {
  // Basic form-select props
  config: FieldConfig;
  group: UntypedFormGroup;
  fieldShow: string;
  disablePrevious: boolean;
  ngDateFormat: string;
  helptext = globalHelptext;
  timezone: string;

  @ViewChild('preview', { static: false, read: ElementRef }) schedulePreview: ElementRef;

  // the internal development record: the preview month as a template grid -- built from activeDate, the
  // scheduled days a Set of ISO dates the cron parser produced (mat-month-view and the attribute
  // hack that painted its cells are gone).
  readonly weekLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  calendarWeeks: (CalendarDay | null)[][] = [];
  calendarTitle = '';
  private scheduledDays = new Set<string>();

  /** The select trigger's id, tied to the label's `for`. */
  get inputId(): string {
    return this.config.id || `${this.config.name}-select`;
  }

  private control: any;

  isOpen = false;
  /** The Custom item's sentinel value; never reaches the control (see ngOnInit). */
  readonly CUSTOM = '__custom__';
  formControl = new UntypedFormControl();
  private _currentValue: string;
  get currentValue() {
    return this.group.controls[this.config.name].value;
  }

  private _minutes = '0';
  private _hours = '*';
  private _days = '*';
  // Validity
  validMinutes = true;
  validHours = true;
  validDays = true;

  private _jan: boolean;
  private _feb: boolean;
  private _mar: boolean;
  private _apr: boolean;
  private _may: boolean;
  private _jun: boolean;
  private _jul: boolean;
  private _aug: boolean;
  private _sep: boolean;
  private _oct: boolean;
  private _nov: boolean;
  private _dec: boolean;

  private _sun = false;
  private _mon = false;
  private _tue = false;
  private _wed = false;
  private _thu = false;
  private _fri = false;
  private _sat = false;

  // private _monthsValues: boolean[] = [];
  private _months = '*';
  // private _daysOfWeekValues: boolean[] = [];
  private _daysOfWeek = '*';

  get minutes() { return this._minutes; }
  set minutes(val) {
    if (val !== '') {
      const string = '* ' + val + ' * * * *';
      try {
        parser.parseExpression(string);
        this.validMinutes = true;
        this._minutes = val;
        this.updateCronTab();
      } catch (err) {
        this.validMinutes = false;
      }
    } else {
      this.validMinutes = false;
    }
  }

  get hours() { return this._hours; }
  set hours(val) {
    if (val !== '' && val.indexOf(' ') === -1) {
      const string = '* * ' + val + ' * * *';
      try {
        parser.parseExpression(string);
        this.validHours = true;
        this._hours = val;
        this.updateCronTab();
      } catch (err) {
        this.validHours = false;
      }
    } else {
      this.validHours = false;
    }
  }

  get days() { return this._days; }
  set days(val) {
    if (val !== '') {
      const string = '* * * ' + val + ' * *';
      try {
        parser.parseExpression(string);
        this.validDays = true;
        this._days = val;
        this.updateCronTab();
      } catch (err) {
        this.validDays = false;
      }
    } else {
      this.validDays = false;
    }
  }

  get jan() { return this._jan; }
  set jan(val) { this._jan = val; this.formatMonths(); }
  get feb() { return this._feb; }
  set feb(val) { this._feb = val; this.formatMonths(); }
  get mar() { return this._mar; }
  set mar(val) { this._mar = val; this.formatMonths(); }
  get apr() { return this._apr; }
  set apr(val) { this._apr = val; this.formatMonths(); }
  get may() { return this._may; }
  set may(val) { this._may = val; this.formatMonths(); }
  get jun() { return this._jun; }
  set jun(val) { this._jun = val; this.formatMonths(); }
  get jul() { return this._jul; }
  set jul(val) { this._jul = val; this.formatMonths(); }
  get aug() { return this._aug; }
  set aug(val) { this._aug = val; this.formatMonths(); }
  get sep() { return this._sep; }
  set sep(val) { this._sep = val; this.formatMonths(); }
  get oct() { return this._oct; }
  set oct(val) { this._oct = val; this.formatMonths(); }
  get nov() { return this._nov; }
  set nov(val) { this._nov = val; this.formatMonths(); }
  get dec() { return this._dec; }
  set dec(val) { this._dec = val; this.formatMonths(); }

  get sun() { return this._sun; }
  set sun(val) { this._sun = val; this.formatDaysOfWeek(); }
  get mon() { return this._mon; }
  set mon(val) { this._mon = val; this.formatDaysOfWeek(); }
  get tue() { return this._tue; }
  set tue(val) { this._tue = val; this.formatDaysOfWeek(); }
  get wed() { return this._wed; }
  set wed(val) { this._wed = val; this.formatDaysOfWeek(); }
  get thu() { return this._thu; }
  set thu(val) { this._thu = val; this.formatDaysOfWeek(); }
  get fri() { return this._fri; }
  set fri(val) { this._fri = val; this.formatDaysOfWeek(); }
  get sat() { return this._sat; }
  set sat(val) { this._sat = val; this.formatDaysOfWeek(); }

  minDate;
  maxDate;
  currentDate;
  activeDate;
  generatedSchedule: any[] = [];
  generatedScheduleSubset = 0;
  protected beginTime;
  protected endTime;
  picker = false;
  private _textInput = '';
  crontab = 'custom';
  private _preset: CronPreset;// = { label:"Custom", value:"* * * * *"};
  presets: CronPreset[] = [
    {
      label: T('Hourly'),
      value: '0 * * * *',
      description: T('at the start of each hour'),
    },
    {
      label: T('Daily'),
      value: '0 0 * * *',
      description: T('at 00:00 (12:00 AM)'),
    },
    {
      label: T('Weekly'),
      value: '0 0 * * sun',
      description: T('on Sundays at 00:00 (12:00 AM)'),
    },
    {
      label: T('Monthly'),
      value: '0 0 1 * *',
      description: T('on the first day of the month at 00:00 (12:00 AM)'),
    },
  ];

  /** The trigger's text for a value: a preset as `Label (crontab) description`, anything else as Custom. */
  labelOf = (value: string): string => {
    if (value === null || value === undefined || value === '') { return ''; }
    const preset = this.presets.find((item) => item.value === value);
    if (preset) {
      const label = `${this.translate.instant(preset.label)} (${preset.value})`;
      return preset.description ? `${label} ${this.translate.instant(preset.description)}` : label;
    }
    return `${this.translate.instant(T('Custom'))} (${value})`;
  };

  presetLabel = (item: CronPreset): string => (item ? this.translate.instant(item.label) : '');

  /** The Custom item owns any crontab no preset owns; the presets match by value. */
  isSameValue = (itemValue: string, value: string): boolean => {
    if (itemValue === this.CUSTOM) {
      return !!value && value !== this.CUSTOM && !this.presets.some((item) => item.value === value);
    }
    return itemValue === value;
  };

  get textInput() {
    return this._textInput;
  }

  set textInput(val: string) {
    this._textInput = val;
  }

  get colorProxy() {
    return this.group.value[this.config.name];
  }

  set colorProxy(val: string) {
    this.group.controls[this.config.name].setValue(val);
  }

  get preset() {
    return this._preset;
  }

  set preset(p) {
    if (p.value == 'custom') {
      this.crontab = '0 0 * * *';
      this.convertPreset('0 0 * * *');
      this._preset = { label: T('Custom'), value: this.crontab };
    } else {
      this.crontab = p.value;
      this.convertPreset(p.value);
      this._preset = p;
    }

    if (this.minDate && this.maxDate) {
      this.generateSchedule();
    }
  }

  constructor(public translate: TranslateService, private renderer: Renderer2,
    private cd: ChangeDetectorRef, public overlay: Overlay,
    protected localeService: LocaleService, protected ws: WebSocketService) {
    // Set default value
    this.preset = this.presets[1];
    this._months = '*';

    this.ws.call('system.general.config').subscribe((res) => {
      this.timezone = res.timezone;
      moment.tz.setDefault(res.timezone);

      this.minDate = moment();
      this.maxDate = moment().endOf('month');
      this.currentDate = moment();

      this.activeDate = moment(this.currentDate);
      this.disablePrevious = true;
      this.buildCalendar();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.group) {
      // Change callback
    }
  }

  ngOnInit() {
    this.control = this.group.controls[this.config.name];
    this.control.valueChanges.subscribe((evt) => {
      if (evt === this.CUSTOM) {
        // the Custom item was picked: keep the crontab as the value and open the popup
        this.control.setValue(this.crontab);
        if (!this.isOpen) { this.togglePopup(); }
        return;
      }
      this.crontab = evt;
    });
    if (this.control.value) {
      this.control.setValue(new EntityUtils().parseDOW(this.control.value));
      this.crontab = this.control.value;
    }
    // 'E' adds the day abbreviation
    this.ngDateFormat = `E ${this.localeService.getAngularFormat()} Z`;
  }

  ngAfterViewInit() {
    this.cd.detectChanges();
    if (this.isOpen) { this.generateSchedule(); }
  }

  ngAfterViewChecked() {
    if (this.isOpen) {
      this.cd.detectChanges();
    }
  }

  onChangeOption(value: string) {
    if (value === this.CUSTOM) { return; }
    if (this.config.onChangeOption !== undefined && this.config.onChangeOption != null) {
      // the MatSelectChange shape form-select keeps (the internal development record)
      this.config.onChangeOption({ event: { value } });
    }
  }

  validPopup() {
    // Assigned to disabled attribute
    if (this.validMinutes === false || this.validHours === false || this.validDays === false) {
      return true;
    }
    return false;
  }

  onPopupSave() {
    this.togglePopup();
    if (this.formControl) {
      this.group.controls[this.config.name].setValue(this.crontab);
    }
  }

  backdropClicked(evt) {
    this.togglePopup();
  }

  togglePopup() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        this.convertPreset(this.crontab); // <-- Test
        this.generateSchedule();
        const popup = this.schedulePreview.nativeElement;// .querySelector('ul.schedule-preview');
        popup.addEventListener('scroll', this.onScroll.bind(this));
      }, 200);
    } else {
      const popup = this.schedulePreview?.nativeElement;// .querySelector('ul.schedule-preview');
      popup?.removeEventListener('scroll', this.onScroll);
    }
  }

  /** The overlay closed on its own (Escape): follow it, so the next Custom pick opens again. */
  onOverlayDetach() {
    if (this.isOpen) { this.togglePopup(); }
  }

  onScroll(e) {
    const el = this.schedulePreview.nativeElement;
    // the bottom, by the scroll box (fractional scrollTop, a horizontal bar) rather than by equality
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 1) {
      this.generateSchedule(true);
    }
  }

  setCalendar(direction) {
    if (!this.minDate || !this.maxDate) { return; }
    let newDate;
    if (direction == 'next') {
      newDate = moment(this.minDate).add(1, 'months');
    } else if (direction == 'previous' && !this.disablePrevious) {
      newDate = moment(this.minDate).subtract(1, 'months');
    } else {
      const message = 'Your argument is invalid';
      console.warn(message);
      return;
    }
    this.minDate = this.getMinDate(newDate);
    this.maxDate = moment(newDate).endOf('month');

    this.activeDate = moment(newDate);
    this.buildCalendar();
    this.generateSchedule();
  }

  private getMinDate(d) {
    const dt = moment(d).add(1, 'seconds');
    let newMinDate;
    const thisMonth = moment().month();
    const thisYear = moment().year();
    const dateMonth = moment(dt).month();
    const dateYear = moment(dt).year();
    if (thisMonth == dateMonth && thisYear == dateYear) {
      this.disablePrevious = true;
      newMinDate = moment();
    } else {
      this.disablePrevious = false;
      newMinDate = moment(dt).startOf('month');
    }
    return newMinDate;
  }

  // check if candidate schedule is between the beginTime and endTime
  isValidSchedule(schedule): boolean {
    const scheduleArray = schedule.toString().split(' ');
    const time = moment(scheduleArray[4], 'hh:mm:ss');
    if (this.beginTime && this.endTime) {
      return time.isBetween(this.beginTime, this.endTime, null, '[]');
    }
    return true;
  }

  private generateSchedule(nextSubset?: boolean) {
    // before system.general.config answers there is no month window and the day loop has no end
    if (!this.minDate || !this.maxDate) { return; }
    // get beginTime and endTime value;
    // config should define options with begin prop and end prop
    // e.g. options: ['schedule_begin', 'schedule_end']
    if (this.config.options) {
      this.beginTime = moment(this.group.controls[this.config.options[0]].value, 'hh:mm');
      this.endTime = moment(this.group.controls[this.config.options[1]].value, 'hh:mm');
    }

    const newSchedule = [];
    let adjusted: any;
    if (nextSubset) {
      adjusted = this.generatedSchedule[this.generatedSchedule.length - 1];
    } else {
      adjusted = moment(this.minDate).subtract(1, 'seconds').toDate();
    }

    const options = {
      currentDate: adjusted,
      endDate: this.maxDate, // max
      iterator: true,
    };

    const interval = parser.parseExpression(this.crontab, options);
    if (!nextSubset) {
      this.generatedScheduleSubset = 0;
    }
    const subsetEnd = this.generatedScheduleSubset + 128;
    // the internal development record: a page continues from the subset's end -- started at 0, the guarded
    // branch below never ran on a scroll page and the loop spun forever (the old scroll test's
    // exact equality had hidden it).
    let parseCounter = nextSubset ? this.generatedScheduleSubset : 0;
    while (true) {
      try {
        if (parseCounter == subsetEnd) {
          this.generatedScheduleSubset = parseCounter;
          break;
        }
        if (parseCounter >= this.generatedScheduleSubset && parseCounter < subsetEnd) {
          const obj: any = interval.next();
          if (this.isValidSchedule(obj.value)) {
            newSchedule.push(obj.value);
            parseCounter++;
          }
        }
      } catch (e) {
        console.warn(e);
        break;
      }
    }

    if (!nextSubset) {
      // Extra job so we can find days.
      const daySchedule = [];
      const spl = this.crontab.split(' ');
      // Modified crontab so we can find days;
      const crontabDays = '0 0 ' + ' ' + spl[1] + ' ' + spl[2] + ' ' + spl[3] + ' ' + spl[4];
      const intervalDays = parser.parseExpression(crontabDays, {
        currentDate: moment(this.minDate).subtract(1, 'seconds').toDate(),
        endDate: this.maxDate,
        iterator: true,
      });

      while (true) {
        try {
          const obj: any = intervalDays.next();
          daySchedule.push(obj.value);
        } catch (e) {
          // console.warn(e);
          break;
        }
      }
      this.scheduledDays = new Set(daySchedule.map((cronDate) => moment(cronDate.toDate()).format('YYYY-MM-DD')));
      this.buildCalendar();
    }

    if (nextSubset) {
      // Angular doesn't like mutated data
      const clone = Object.assign([], this.generatedSchedule);
      const combinedSchedule = clone.concat(newSchedule);
      this.generatedSchedule = combinedSchedule;
    } else {
      this.generatedSchedule = newSchedule;
    }
  }

  /** The grid for the active month: leading blanks to the first weekday, then every day, marked
   * scheduled from the parser's set and today from the system clock (moment's default zone). */
  buildCalendar() {
    if (!this.activeDate) { return; }
    const first = moment(this.activeDate).startOf('month');
    const today = moment().format('YYYY-MM-DD');
    this.calendarTitle = first.format('MMMM YYYY');
    const weeks: (CalendarDay | null)[][] = [];
    let week: (CalendarDay | null)[] = new Array(first.day()).fill(null);
    for (let day = 1; day <= first.daysInMonth(); day++) {
      const date = moment(first).date(day);
      const iso = date.format('YYYY-MM-DD');
      week.push({
        day, iso, label: date.format('MMM D, YYYY'), scheduled: this.scheduledDays.has(iso), today: iso === today,
      });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length) {
      while (week.length < 7) { week.push(null); }
      weeks.push(week);
    }
    this.calendarWeeks = weeks;
  }

  formatMonths() {
    const months = [this._jan, this._feb, this._mar, this._apr, this._may, this._jun, this._jul, this._aug, this._sep, this._oct, this._nov, this._dec];
    const months_str = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let rule = '';
    for (let i = 0; i < months.length; i++) {
      if (months[i]) {
        if (rule.length > 0 && i > 0) { rule += ','; }
        rule += months_str[i];
      }
    }
    if (rule.length == 0) {
      rule = '*';
    }
    this._months = rule;
    this.updateCronTab();
  }

  formatDaysOfWeek() {
    const dow = [this._sun, this._mon, this._tue, this._wed, this._thu, this._fri, this._sat];
    const dow_str = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    let rule = '';
    for (let i = 0; i < dow.length; i++) {
      if (dow[i]) {
        if (rule.length > 0 && i > 0) { rule += ','; }
        rule += dow_str[i];
      }
    }
    if (rule.length == 0) {
      rule = '*';
    }
    this._daysOfWeek = rule;
    this.updateCronTab();
  }

  updateMonthsFields(rule) {
    // the internal development record: every flag follows the rule -- the switch below only ever sets one, so a
    // preset picked after a month was ticked left that month checked while the crontab dropped it.
    this._jan = false;
    this._feb = false;
    this._mar = false;
    this._apr = false;
    this._may = false;
    this._jun = false;
    this._jul = false;
    this._aug = false;
    this._sep = false;
    this._oct = false;
    this._nov = false;
    this._dec = false;
    // Wild card
    if (rule == '*') {
      return;
    }

    // Assume a list and process it
    const list = rule.split(',');
    for (const i in list) {
      switch (list[i]) {
        case 'jan':
          this._jan = true;
          break;
        case 'feb':
          this._feb = true;
          break;
        case 'mar':
          this._mar = true;
          break;
        case 'apr':
          this._apr = true;
          break;
        case 'may':
          this._may = true;
          break;
        case 'jun':
          this._jun = true;
          break;
        case 'jul':
          this._jul = true;
          break;
        case 'aug':
          this._aug = true;
          break;
        case 'sep':
          this._sep = true;
          break;
        case 'oct':
          this._oct = true;
          break;
        case 'nov':
          this._nov = true;
          break;
        case 'dec':
          this._dec = true;
          break;
      }
    }
  }

  updateDaysOfWeekFields(rule) {
    this._sun = false;
    this._mon = false;
    this._tue = false;
    this._wed = false;
    this._thu = false;
    this._fri = false;
    this._sat = false;
    // Wild card
    if (rule == '*') {
      return;
    }

    // Assume a list and process it
    const list = rule.split(',');
    for (const i in list) {
      switch (list[i]) {
        case 'sun':
          this._sun = true;
          break;
        case 'mon':
          this._mon = true;
          break;
        case 'tue':
          this._tue = true;
          break;
        case 'wed':
          this._wed = true;
          break;
        case 'thu':
          this._thu = true;
          break;
        case 'fri':
          this._fri = true;
          break;
        case 'sat':
          this._sat = true;
          break;
      }
    }
  }

  updateCronTab(preset?) {
    this.crontab = '';
    if (!preset) {
      const result = this.minutes + ' ' + this.hours + ' ' + this.days + ' ' + this._months + ' ' + this._daysOfWeek;
      this.crontab = result;
    }
    if (this.minDate && this.maxDate) {
      this.generateSchedule();
    }
  }

  convertPreset(value) {
    const arr = value.split(' ');
    this._minutes = arr[0];
    this._hours = arr[1];
    this._days = arr[2];

    // Months
    this.updateMonthsFields(arr[3]);
    this._months = arr[3];

    // Days of Week
    this.updateDaysOfWeekFields(arr[4]);
    this._daysOfWeek = arr[4];
  }

  convertToUtcOffset(offset: number): string {
    // Convert offset in minutes (-420) to hours (-700) for Angular date pipe

    let tempOffset = ((offset / 60) * 100).toString();
    if (tempOffset[0] !== '-') {
      tempOffset = '+' + tempOffset;
    }
    // Pad to 5 characters (60 to +0060, etc)
    while (tempOffset.length < 5) {
      const tempStr = tempOffset.slice(1);
      tempOffset = tempOffset[0] + '0' + tempStr;
    }

    return tempOffset;
  }
}
