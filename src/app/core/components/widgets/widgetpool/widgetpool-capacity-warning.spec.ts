import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, NEVER } from 'rxjs';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { WidgetPoolComponent } from 'app/core/components/widgets/widgetpool/widgetpool.component';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { MediaObserver } from '@angular/flex-layout';
import { ThemeService } from 'app/services/theme/theme.service';

// The real Pool card template and its scoped styles, with the shared card laws
// from egret_overrides.css as karma loads them. Only the data is a test double.
describe('Pool card capacity warning (#450)', () => {
  let fixture: ComponentFixture<WidgetPoolComponent>;

  beforeEach(waitForAsync(() => {
    const core = { register: () => NEVER, unregister: () => undefined, emit: () => undefined };
    const theme = { currentTheme: () => ({ accentColors: [] }) };
    spyOn<any>(CoreServiceInjector, 'get').and.callFake((token: unknown) => (token === ThemeService ? theme : core));
    TestBed.configureTestingModule({
      imports: [CoreComponents, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MediaObserver, useValue: { asObservable: () => new BehaviorSubject([{ mqAlias: 'md' }]) } },
      ],
    }).compileComponents();
  }));

  afterEach(() => fixture?.destroy());

  function render(usedPct: string): HTMLElement {
    fixture = TestBed.createComponent(WidgetPoolComponent);
    Object.assign(fixture.componentInstance, {
      poolState: {
        name: 'tank',
        status: 'ONLINE',
        healthy: true,
        is_decrypted: true,
        scan: null,
        topology: { data: [{ type: 'DISK', disk: 'da0', stats: { read_errors: 0, write_errors: 0, checksum_errors: 0 } }] },
      },
      volumeData: { used_pct: usedPct, used: 85, avail: 15 },
      diskSize: '15.0',
      diskSizeLabel: 'GiB',
    });
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.pool-body') as HTMLElement;
  }

  it('states the used value once and marks it in place at or above 80%', () => {
    for (const [usedPct, state] of [['80%', 'warn'], ['85%', 'warn'], ['90%', 'danger'], ['97%', 'danger']]) {
      const body = render(usedPct);
      const line = body.querySelector('.pool-usage-line') as HTMLElement;
      const marks = Array.from(line.querySelectorAll('.label-icon')) as HTMLElement[];

      // The warning qualifies the value; it does not repeat it on a second line.
      expect(body.textContent.match(new RegExp(usedPct, 'g')).length).withContext(`${usedPct} occurrences`).toBe(1);
      expect(body.querySelector('.pool-bar-note')).withContext(`${usedPct} note`).toBeNull();
      expect(marks.length).withContext(`${usedPct} marks`).toBe(1);
      expect(marks[0].parentElement.classList).toContain('pool-used');
      expect(marks[0].classList).withContext(`${usedPct} state`).toContain(state);
      expect(marks[0].textContent.trim()).toBe('warning');
      // Size comes from the shared .label-icon law; the card contributes placement only.
      expect(getComputedStyle(marks[0]).fontSize).toBe('16px');
      // Card geometry: the mark rides the existing line rather than adding a row.
      const used = line.querySelector('.pool-used').getBoundingClientRect();
      const free = line.children[1].getBoundingClientRect();
      expect(used.top).withContext(`${usedPct} stacked`).toBeLessThan(free.bottom);
      expect(free.top).withContext(`${usedPct} stacked`).toBeLessThan(used.bottom);
      expect(body.querySelector('.pool-bar-fill').classList).toContain(state);
      fixture.destroy();
    }
  });

  it('leaves a pool below 80% unmarked', () => {
    for (const usedPct of ['0%', '12%', '79%']) {
      const body = render(usedPct);
      expect(body.querySelector('.label-icon')).withContext(`${usedPct} mark`).toBeNull();
      expect(body.querySelector('.pool-usage-line').textContent).toContain(usedPct);
      expect(body.querySelector('.pool-bar-fill').classList).not.toContain('warn');
      expect(body.querySelector('.pool-bar-fill').classList).not.toContain('danger');
      fixture.destroy();
    }
  });
});
