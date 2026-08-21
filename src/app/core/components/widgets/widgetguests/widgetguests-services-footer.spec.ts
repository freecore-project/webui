import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { WebSocketService } from 'app/services/ws.service';
import { WidgetGuestsComponent } from './widgetguests.component';

/**
 * the internal development record -- the Services footer accounted for applications and then did
 * not name them: application memory is subtracted from base, so an omitted term is
 * silently wrong rather than merely absent. This renders the real template, because a
 * component-level assertion cannot catch a family missing from the markup.
 */
describe('Guests Services footer', () => {
  const gib = 1024 ** 3;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetGuestsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: LayoutMediaObserver, useValue: { asObservable: () => of([]) } },
        { provide: WebSocketService, useValue: { sub: () => of() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  function footerText(stats: any): string {
    const fixture = TestBed.createComponent(WidgetGuestsComponent);
    (fixture.componentInstance as any).core = jasmine.createSpyObj('CoreService', ['unregister']);
    fixture.componentInstance.setGuestStats(stats);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('.services-footer');
    const parts = Array.from(footer.querySelectorAll('.fact-part')) as HTMLElement[];
    expect(parts.length).toBe(stats.bastille?.length ? 5 : 4);
    expect(parts.every((part) => /GiB$/.test(part.textContent.trim()))).toBeTrue();
    return footer ? footer.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  it('names every family it has already subtracted from base', () => {
    const text = footerText({
      cpu_count: 4,
      vms: [],
      jails: [],
      apps: [{ name: 'openspeedtest', rss: 1 * gib, cpu_pct: 3.2, state: 'up' }],
      bastille: [{ name: 'web', rss: 2 * gib, cpu_pct: 1, state: 'up' }],
      services_bytes: 6 * gib,
      attributed_bytes: 3 * gib,
    });

    // 6 GiB less 1 GiB of applications and 2 GiB of Bastille leaves 3 GiB of base.
    expect(text).toContain('Bastille 2.0 GiB');
    expect(text).toContain('apps 1.0');
    expect(text).toContain('base 3.0');
    expect(text).toContain('VMs 0.0');
    expect(text).toContain('jails 0.0');
  });

  it('still renders the term with no applications running', () => {
    const text = footerText({
      cpu_count: 4,
      vms: [{ name: 'vm1', rss: 2 * gib, cpu_pct: 1, state: 'up' }],
      jails: [],
      apps: [],
      services_bytes: 4 * gib,
      attributed_bytes: 2 * gib,
    });

    expect(text).toContain('VMs 2.0');
    expect(text).toContain('apps 0.0');
    expect(text).toContain('base 2.0');
  });

  it('renders the term when middleware sends no apps key at all', () => {
    const text = footerText({
      cpu_count: 4,
      vms: [],
      jails: [{ name: 'jail1', rss: 1 * gib, cpu_pct: 1, state: 'up' }],
      services_bytes: 4 * gib,
    });

    expect(text).toContain('jails 1.0');
    expect(text).toContain('apps 0.0');
  });
});
