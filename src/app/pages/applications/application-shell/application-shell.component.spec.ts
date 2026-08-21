import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { routes } from '../applications.routing';
import { ApplicationShellComponent } from './application-shell.component';

@Component({ standalone: false, selector: 'ix-terminal', template: '' })
class TerminalStubComponent {
  @Input() target: unknown;
  @Input() tooltip: string;
  @Output() ended = new EventEmitter<void>();
}

// the internal development record / the internal development record: the same page as the iocage console,
// aimed at the application by name.
describe('Application shell', () => {
  it('targets the application by name and returns to the Applications page', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const route = { params: of({ name: 'sabnzbd' }), snapshot: { data: {} } };
    const component = new ApplicationShellComponent(route as any, router as any);
    component.ngOnInit();
    expect(component.target).toEqual({ application: 'sabnzbd' });
    component.onEnded();
    expect(router.navigate).toHaveBeenCalledWith(['/', 'applications']);
  });

  it('is routed beside the list under the Applications breadcrumb', () => {
    const children = routes[0].children;
    expect(children.find((route) => route.path === '').component.name).toBe('ApplicationsComponent');
    const shell = children.find((route) => route.path === 'shell/:name');
    expect(shell.component).toBe(ApplicationShellComponent);
    expect(shell.data.breadcrumb).toBe('Shell');
  });

  // the internal development record: the console page -- 'Shell: <app>' in the one title voice over the #354
  // surface; no card, no slab.
  it('renders the terminal with the application target and names it in the heading', async () => {
    await TestBed.configureTestingModule({
      declarations: [ApplicationShellComponent, TerminalStubComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({ name: 'radarr' }), snapshot: { data: {} } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ApplicationShellComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('h1.fc-page-title').textContent.replace(/\s+/g, ' ').trim()).toBe('Shell: radarr');
    expect(host.querySelector('section#application-shell-page.fc-page.fc-console').getAttribute('aria-labelledby')).toBe('application-shell-title');
    expect(host.querySelector('mat-card')).toBeNull();
    expect(host.querySelector('.fc-console-surface > ix-terminal')).not.toBeNull();
    expect(fixture.componentInstance.target).toEqual({ application: 'radarr' });
  });
});
