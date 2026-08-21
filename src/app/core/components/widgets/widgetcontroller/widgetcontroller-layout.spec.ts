import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CoreComponents } from 'app/core/components/corecomponents.module';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { WidgetControllerComponent } from './widgetcontroller.component';

@Component({
  standalone: false,
  selector: 'widget-controller-layout-test-host',
  template: '<widget-controller [dashState]="widgets" (launcher)="launched = $event" />',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../../../pages/dashboard/dashboard.scss'],
})
class WidgetControllerLayoutTestHostComponent {
  widgets = [
    { name: 'CPU', rendered: true },
    { name: 'Pool', identifier: 'name,very-long-pool-name-that-must-remain-readable-on-a-phone', rendered: true },
    { name: 'Network', rendered: false },
  ];
  launched: unknown;
}

describe('Dashboard native widget launcher', () => {
  let fixture: ComponentFixture<WidgetControllerLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetControllerLayoutTestHostComponent],
      imports: [CoreComponents, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: LayoutMediaObserver, useValue: { asObservable: () => of([{ mqAlias: 'xs' }]) } },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WidgetControllerLayoutTestHostComponent);
    fixture.nativeElement.style.width = '360px';
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the actual inventory as native actions and keeps a long pool name inside the card', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.widget-launcher-button')) as HTMLButtonElement[];
    expect(buttons.length).toBe(2);
    expect(buttons.every((button) => button.tagName === 'BUTTON' && button.type === 'button')).toBeTrue();
    const card: HTMLElement = fixture.nativeElement.querySelector('.fc-card');
    expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(360);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    expect(buttons[1].textContent).toContain('very-long-pool-name-that-must-remain-readable-on-a-phone');
    buttons[1].click();
    expect(fixture.componentInstance.launched).toBe(fixture.componentInstance.widgets[1]);
  });

  it('returns focus by the full widget identity, with a safe fallback when inventory changes', () => {
    const controller = fixture.debugElement.query(By.directive(WidgetControllerComponent)).componentInstance as WidgetControllerComponent;
    controller.focusWidget(fixture.componentInstance.widgets[1]);
    expect((document.activeElement as HTMLElement).dataset.widgetKey).toBe(controller.widgetKey(fixture.componentInstance.widgets[1]));
    controller.focusWidget({ name: 'Pool', identifier: 'name,removed', rendered: true });
    expect((document.activeElement as HTMLElement).dataset.widgetKey).toBe('CPU:');
  });
});
