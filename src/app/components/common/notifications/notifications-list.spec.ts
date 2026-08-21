import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NEVER } from 'rxjs';
import { WebSocketService } from 'app/services';
import { LocaleService } from 'app/services/locale.service';
import { NotificationAlert, NotificationsService } from 'app/services/notifications.service';
import { NotificationsComponent } from './notifications.component';

// the internal development record: the alert panel's list is a plain ul -- what mat-list / mat-list-item drew is restated:
// the list's 8px above and below, each item a clipped flex row (12px/16px, 10px apart), its content one flex
// row centred on a 24px line at 14px, the #344 wrap (the icon keeps its 29px, the text wraps beside it).
describe('notifications panel list (the internal development record)', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  const alert = (id: string, message: string, dismissed = false): NotificationAlert => ({
    id, message, dismissed, node: 'A', icon: 'info', icon_tooltip: 'Info', time: '', time_locale: '2026-09-30T14:28:38',
    timezone: 'UTC', route: '', color: 'primary', level: 'NOTICE',
  });

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NotificationsComponent],
      imports: [MatIconModule, TranslateModule.forRoot(), ...HlmTooltipImports],
      providers: [
        { provide: NotificationsService, useValue: {
          getNotificationList: () => [
            alert('1', 'New ZFS version or feature flags are available for pool(s) ocdqa. Upgrading pools is a one-time process that can prevent rolling the system back to an earlier FreeCORE version.'),
            alert('2', "Scrub of pool 'ocdqa' finished."),
            alert('3', 'An older alert.', true),
          ],
          getNotifications: () => NEVER,
        } },
        { provide: LocaleService, useValue: { getAngularFormat: () => 'yyyy-MM-dd HH:mm:ss', dateTimeFormatChange$: NEVER } },
        { provide: WebSocketService, useValue: { call: () => NEVER } },
      ],
    }).compileComponents();
    spyOn(NotificationsComponent.prototype as any, 'checkFailoverStatus');
    fixture = TestBed.createComponent(NotificationsComponent);
    fixture.nativeElement.style.cssText = 'display:block; width:384px';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  afterEach(() => fixture.destroy());

  it('draws the alerts as a plain list with the geometry mat-list gave them', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('mat-list, mat-list-item')).toBeNull();
    const list = root.querySelector('ul.notification-list') as HTMLElement;
    const listStyle = getComputedStyle(list);
    expect(listStyle.listStyleType).toBe('none');
    expect([listStyle.paddingTop, listStyle.paddingBottom, listStyle.marginTop]).toEqual(['8px', '8px', '0px']);

    const items = Array.from(list.querySelectorAll<HTMLElement>(':scope > li.notific-item'));
    expect(items.length).toBe(3);
    const item = getComputedStyle(items[0]);
    expect([item.display, item.overflow, item.boxSizing]).toEqual(['flex', 'hidden', 'border-box']);
    expect([item.paddingTop, item.paddingRight, item.paddingBottom, item.paddingLeft]).toEqual(['12px', '16px', '12px', '16px']);
    expect([item.marginTop, item.marginBottom]).toEqual(['10px', '10px']);
    // 10px apart: the item margins collapse as the mat-list-item margins did
    expect(Math.round(items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().bottom)).toBe(10);

    const content = items[0].querySelector('.notific-item-content') as HTMLElement;
    const c = getComputedStyle(content);
    expect([c.display, c.alignItems, c.whiteSpace, c.fontSize, c.lineHeight]).toEqual(['flex', 'center', 'normal', '14px', '24px']);
    // #344: the icon keeps its 29px (24px glyph + 5px) and the long message wraps inside the 352px row
    const icon = items[0].querySelector('.notific-icon') as HTMLElement;
    expect(Math.round(icon.getBoundingClientRect().width)).toBe(29);
    const text = items[0].querySelector('.mat-list-text') as HTMLElement;
    expect(Math.round(content.getBoundingClientRect().width)).toBe(352);
    expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(content.getBoundingClientRect().right + 0.5);
    expect(text.querySelector('.message').getBoundingClientRect().height).toBeGreaterThan(40);
  });
});
