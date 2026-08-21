import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { WebSocketService } from 'app/services/ws.service';
import { WidgetGuestsComponent } from './widgetguests.component';

/**
 * the internal development record -- the card is one 400px frame (card-system law 1) and the
 * frame never grows (law 6). A family the frame cannot show as a section is one
 * aggregated row (law 5), not an overflow link under a scrollbar. This renders
 * the real template so the row, its count and its route are the markup's.
 */
describe('Guests card frame', () => {
  const gib = 1024 ** 3;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      declarations: [WidgetGuestsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: router },
        { provide: LayoutMediaObserver, useValue: { asObservable: () => of([]) } },
        { provide: WebSocketService, useValue: { sub: () => of() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  function render(stats: any): ComponentFixture<WidgetGuestsComponent> {
    const fixture = TestBed.createComponent(WidgetGuestsComponent);
    (fixture.componentInstance as any).core = jasmine.createSpyObj('CoreService', ['unregister']);
    fixture.componentInstance.setGuestStats(stats);
    fixture.detectChanges();
    return fixture;
  }

  function jail(name: string, cpu: number, rssGiB: number) {
    return { jid: 1, name, cpu_pct: cpu, rss: rssGiB * gib, nproc: 1 };
  }

  const text = (el: Element): string => el.textContent.replace(/\s+/g, ' ').trim();

  it('renders the family that does not fit as one aggregated row and the one that does with its link', () => {
    const fixture = render({
      cpu_count: 8,
      vms: [],
      jails: [],
      apps: Array.from({ length: 19 }, (_, index) => jail(`app-${index}`, 2, 0.5)),
      bastille: [jail('web', 1, 0.1), jail('pb', 0.5, 0.05)],
      services_bytes: 16 * gib,
      attributed_bytes: 10 * gib,
    });
    const root: HTMLElement = fixture.nativeElement;

    const family = root.querySelectorAll('.guest-row.family-row');
    expect(family.length).toBe(1);
    expect(text(family[0].querySelector('.guest-name'))).toBe('Bastille Jails2');
    expect(text(family[0].querySelector('.family-count'))).toBe('2');
    expect(text(family[0].querySelector('.cpu-value'))).toBe('2%');
    expect(text(family[0].querySelector('.guest-memory'))).toBe('≈ 0.2 GiB');
    expect(family[0].getAttribute('ix-auto-identifier')).toBe('guestBastilleFamily');

    expect(root.querySelectorAll('.section-label-sm').length).toBe(1);
    expect(text(root.querySelector('.section-label-sm'))).toBe('Applications');
    const appRows = root.querySelectorAll('.guest-row:not(.family-row):not(.more-row)');
    expect(Array.from(appRows).map((row) => text(row.querySelector('.guest-name')))).toEqual(['app-0', 'app-1']);
    expect(text(root.querySelector('.more-row'))).toBe('+ 17 more → Applications');
    expect(root.querySelector('.services-footer')).not.toBeNull();

    (family[0] as HTMLButtonElement).click();
    expect(router.navigate.calls.mostRecent().args).toEqual([['/jails', 'bastille']]);
  });

  it('shows a family that fits as its section with no aggregated row', () => {
    const root: HTMLElement = render({
      cpu_count: 4,
      vms: [],
      jails: [jail('forgejo', 4.6, 1), jail('git', 1.2, 1)],
      apps: [jail('openspeedtest', 3.2, 1)],
      services_bytes: 4 * gib,
      attributed_bytes: 3 * gib,
    }).nativeElement;

    expect(root.querySelectorAll('.guest-row.family-row').length).toBe(0);
    expect(root.querySelectorAll('.more-row').length).toBe(0);
    expect(Array.from(root.querySelectorAll('.section-label-sm')).map(text)).toEqual(['Jails', 'Applications']);
    expect(root.querySelectorAll('.guest-row').length).toBe(3);
  });
});
