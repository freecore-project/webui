import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SystemProcessesComponent } from './system-processes.component';

@Component({ standalone: false, selector: 'ix-terminal', template: '' })
class TerminalStubComponent {
  @Input() target: unknown;
  @Input() readonly: boolean;
}

// the internal development record: System Processes is the console page without a colon -- its own noun in the
// one title voice over the #354 surface, the terminal in viewer mode (the widget hides its font
// row on readonly; that assertion lives in terminal-toolbar.spec.ts).
describe('System Processes page', () => {
  it('is the console page titled by its own noun with the read-only top viewer on the surface', async () => {
    await TestBed.configureTestingModule({
      declarations: [SystemProcessesComponent, TerminalStubComponent],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();
    const fixture = TestBed.createComponent(SystemProcessesComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('h1.fc-page-title').textContent.trim()).toBe('System Processes');
    expect(host.querySelector('section#system-processes-page.fc-page.fc-console').getAttribute('aria-labelledby')).toBe('system-processes-title');
    expect(host.querySelector('mat-card')).toBeNull();
    expect(host.querySelector('section.fc-page.fc-console > .fc-console-surface > ix-terminal')).not.toBeNull();
    const terminal = fixture.debugElement.query((el) => el.name === 'ix-terminal').componentInstance as TerminalStubComponent;
    expect(terminal.target).toEqual({ processes: true });
    expect(terminal.readonly).toBe(true);
  });
});
