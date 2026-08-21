import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { routes } from '../jails.routing';
import { JailShellComponent } from './jail-shell.component';

describe('Jail shell routing', () => {
  it('targets the iocage console and returns to the jail list', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const route = { params: of({ pk: 'web' }), snapshot: { data: {} } };
    const component = new JailShellComponent(route as any, router as any);
    component.ngOnInit();
    expect(component.target).toEqual({ jail: 'web' });
    component.onEnded();
    expect(router.navigate).toHaveBeenCalledWith(['/', 'jails']);
  });

  // the internal development record: the Bastille console left with the management API;
  // `bastille console` on the host is the way into a Bastille jail.
  it('declares no Bastille shell route and leaves the iocage route as it was', () => {
    const children = routes[0].children;
    expect(children.find((route) => route.path === 'bastille/shell/:pk')).toBeUndefined();
    expect(children.find((route) => route.path === 'shell/:pk').data.engine).toBeUndefined();
  });
});

@Component({ standalone: false, selector: 'ix-terminal', template: '' })
class TerminalStubComponent {
  @Input() target: unknown;
  @Input() tooltip: string;
  @Output() ended = new EventEmitter<void>();
}

// the internal development record: the console page names its jail in the one title voice
// ('Shell: <jail>') over the #354 surface; no card, no slab.
describe('Jail shell native heading', () => {
  let route: { params: Observable<{ pk: string }>; snapshot: { data: Record<string, unknown> } };

  beforeEach(async () => {
    route = { params: of({ pk: 'adguardqa' }), snapshot: { data: {} } };
    await TestBed.configureTestingModule({
      declarations: [JailShellComponent, TerminalStubComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
  });

  it('names the jail in the page title over the console surface and keeps the terminal target', () => {
    const fixture = TestBed.createComponent(JailShellComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('h1.fc-page-title').textContent.replace(/\s+/g, ' ').trim()).toBe('Shell: adguardqa');
    expect(host.querySelector('section#jail-shell-page.fc-page.fc-console').getAttribute('aria-labelledby')).toBe('jail-shell-title');
    expect(host.querySelector('mat-card')).toBeNull();
    expect(host.querySelector('mat-card-title')).toBeNull();
    expect(host.querySelector('section.fc-page.fc-console > .fc-console-surface > ix-terminal')).not.toBeNull();
    expect(fixture.componentInstance.target).toEqual({ jail: 'adguardqa' });
  });

  it('translates the shell label', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('qa', { Shell: 'Skal' });
    translate.use('qa');
    const fixture = TestBed.createComponent(JailShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1.fc-page-title').textContent.replace(/\s+/g, ' ').trim()).toBe('Skal: adguardqa');
  });
});
