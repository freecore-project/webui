import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { NEVER, of } from 'rxjs';
import { DialogService, WebSocketService } from '../../services';
import { ShellComponent } from './shell.component';

@Component({ standalone: false, selector: 'ix-terminal', template: '' })
class TerminalStubComponent {
  @Input() tooltip: string;
}

// the internal development record: the root shell page has three states -- loading (the hlm-spinner), turned off
// (the notice with Enable Shell on the default tier) and on (the #354 surface holding the
// terminal). All three sit under the one h1 'Shell' in the page voice; no card, no slab.
describe('Shell page states (the internal development record)', () => {
  async function mount(config: 'off' | 'on' | 'pending'): Promise<HTMLElement> {
    const call = jasmine.createSpy('call').and.callFake((method: string) => {
      if (method !== 'system.webterminal.config') { return of(null); }
      return config === 'pending' ? NEVER : of({ enabled: config === 'on' });
    });
    await TestBed.configureTestingModule({
      declarations: [ShellComponent, TerminalStubComponent],
      imports: [TranslateModule.forRoot(), HlmButtonImports, HlmSpinnerImports],
      providers: [
        { provide: WebSocketService, useValue: { call } },
        { provide: DialogService, useValue: { confirm: () => of(true) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('titles itself Shell in the page voice on the console section, whatever the state', async () => {
    const host = await mount('off');
    const section = host.querySelector('section#shell-page.fc-page.fc-console');
    expect(section).not.toBeNull();
    expect(section.getAttribute('aria-labelledby')).toBe('shell-title');
    expect(host.querySelector('h1#shell-title.fc-page-title').textContent.trim()).toBe('Shell');
    expect(host.querySelector('mat-card, mat-card-title, .mat-bg-primary, .card-title-text')).toBeNull();
  });

  it('shows the turned-off notice with Enable Shell on the default tier and no terminal', async () => {
    const host = await mount('off');
    const notice = host.querySelector('.fc-page-notice.shell-disabled');
    expect(notice).not.toBeNull();
    expect(notice.querySelector('h3').textContent.trim()).toBe('The Shell is turned off');
    expect(notice.querySelector('p')).not.toBeNull();
    const button = notice.querySelector<HTMLButtonElement>('.shell-enable-row > button[hlmBtn]');
    expect(button).not.toBeNull();
    expect(button.type).toBe('button');
    expect(button.getAttribute('ix-auto-identifier')).toBe('ENABLE SHELL');
    expect(button.textContent.trim()).toBe('Enable Shell');
    expect(button.classList).toContain('bg-primary'); // the page's one primary action
    expect(host.querySelector('.fc-console-surface, ix-terminal, hlm-spinner')).toBeNull();
  });

  it('renders the surface with the terminal, and nothing else, once the shell is on', async () => {
    const host = await mount('on');
    expect(host.querySelector('section.fc-page.fc-console > .fc-console-surface > ix-terminal')).not.toBeNull();
    expect(host.querySelector('.shell-disabled, hlm-spinner, button')).toBeNull();
  });

  it('shows the loading glyph while the config is pending', async () => {
    const host = await mount('pending');
    expect(host.querySelector('.shell-loading > hlm-spinner')).not.toBeNull();
    expect(host.querySelector('.fc-console-surface, .shell-disabled')).toBeNull();
  });
});
