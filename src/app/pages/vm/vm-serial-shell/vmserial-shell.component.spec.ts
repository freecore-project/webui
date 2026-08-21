import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { WebSocketService } from '../../../services';
import { VMSerialShellComponent } from './vmserial-shell.component';

@Component({ standalone: false, selector: 'ix-terminal', template: '' })
class TerminalStubComponent {
  @Input() target: unknown;
  @Input() tooltip: string;
}

// the internal development record: the serial console is the same console page as the jail and application
// shells -- 'Shell: <name>' in the one title voice over the #354 surface. The route only carries
// the numeric id, so the page asks vm.query for the name once; a junk id asks nothing and opens
// nothing (the NaN guard).
describe('VM serial shell page', () => {
  let ws: { call: jasmine.Spy };

  async function mount(pk: string): Promise<HTMLElement> {
    ws = { call: jasmine.createSpy('call').and.returnValue(of([{ id: 7, name: 'win11' }])) };
    await TestBed.configureTestingModule({
      declarations: [VMSerialShellComponent, TerminalStubComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({ pk }), snapshot: { data: {} } } },
        { provide: WebSocketService, useValue: ws },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(VMSerialShellComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const title = (host: HTMLElement): string => host.querySelector('h1.fc-page-title').textContent.replace(/\s+/g, ' ').trim();

  it('names the VM in the page title from one vm.query and mounts the terminal on the console surface', async () => {
    const host = await mount('7');
    expect(ws.call).toHaveBeenCalledOnceWith('vm.query', [[['id', '=', 7]]]);
    expect(title(host)).toBe('Shell: win11');
    expect(host.querySelector('section#vm-serial-page.fc-page.fc-console').getAttribute('aria-labelledby')).toBe('vm-serial-title');
    expect(host.querySelector('mat-card')).toBeNull();
    expect(host.querySelector('section.fc-page.fc-console > .fc-console-surface > ix-terminal')).not.toBeNull();
  });

  it('asks nothing and opens nothing on a junk id', async () => {
    const host = await mount('abc');
    expect(ws.call).not.toHaveBeenCalled();
    expect(host.querySelector('ix-terminal')).toBeNull();
    expect(host.querySelector('.fc-console-surface')).toBeNull();
    expect(host.querySelector('h1.fc-page-title')).not.toBeNull();
  });
});
