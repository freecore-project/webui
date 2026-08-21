import { Component, Type, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

@Component({
  standalone: false,
  selector: 'config-reset-transition-layout-test-host',
  template: '<div class="transition-copyright-row"><span class="copyright-txt"></span></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./config-reset/config-reset.component.css'],
})
class ConfigResetTransitionLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'failover-transition-layout-test-host',
  template: '<div class="transition-copyright-row"><span class="copyright-txt"></span></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./failover/failover.component.css'],
})
class FailoverTransitionLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'reboot-transition-layout-test-host',
  template: '<div class="transition-copyright-row"><span class="copyright-txt"></span></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./reboot/reboot.component.css'],
})
class RebootTransitionLayoutTestHostComponent {}

@Component({
  standalone: false,
  selector: 'shutdown-transition-layout-test-host',
  template: '<div class="transition-copyright-row"><span class="copyright-txt"></span></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./shutdown/shutdown.component.css'],
})
class ShutdownTransitionLayoutTestHostComponent {}

const transitionLayoutHosts: { name: string; component: Type<unknown> }[] = [
  { name: 'config reset', component: ConfigResetTransitionLayoutTestHostComponent },
  { name: 'failover', component: FailoverTransitionLayoutTestHostComponent },
  { name: 'reboot', component: RebootTransitionLayoutTestHostComponent },
  { name: 'shutdown', component: ShutdownTransitionLayoutTestHostComponent },
];

describe('system transition copyright layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: transitionLayoutHosts.map(({ component }) => component),
    }).compileComponents();
  }));

  transitionLayoutHosts.forEach(({ name, component }) => {
    it(`preserves the former fxFlex layout for ${name}`, () => {
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.transition-copyright-row');
      const copyright = fixture.nativeElement.querySelector('.copyright-txt');
      const rowStyles = getComputedStyle(row);
      const copyrightStyles = getComputedStyle(copyright);

      expect(rowStyles.display).toBe('flex');
      expect(rowStyles.boxSizing).toBe('border-box');
      expect(rowStyles.flexDirection).toBe('row');
      expect(copyrightStyles.flexGrow).toBe('1');
      expect(copyrightStyles.flexShrink).toBe('1');
      expect(copyrightStyles.flexBasis).toBe('0%');
      expect(copyrightStyles.boxSizing).toBe('border-box');
    });
  });
});
