import { Component, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { NEVER } from 'rxjs';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { DialogService, NetworkService, WebSocketService } from '../../../../services';
import { InterfacesListComponent } from './interfaces-list.component';

// the internal development record: the check-in timeout in the pending-changes notice on the kit input -- inline in the
// sentence, the theme's 50px centred box, the model and the digits pattern kept. The theme keys the box on
// the component's tag (app-interfaces-list #timeout-field), so it renders inside a host that uses the tag
// (TestBed would otherwise mount it on a bare div).
@Component({ standalone: false, template: '<app-interfaces-list></app-interfaces-list>' })
class InterfacesHostComponent {
  @ViewChild(InterfacesListComponent, { static: true }) list: InterfacesListComponent;
}

describe('interfaces check-in timeout field (the internal development record)', () => {
  let fixture: ComponentFixture<InterfacesHostComponent>;

  beforeEach(async () => {
    const core = { register: () => NEVER, unregister: () => undefined, emit: () => undefined };
    spyOn<any>(CoreServiceInjector, 'get').and.returnValue(core);
    await TestBed.configureTestingModule({
      declarations: [InterfacesHostComponent, InterfacesListComponent],
      imports: [FormsModule, TranslateModule.forRoot(), ...HlmInputImports],
      providers: [
        { provide: WebSocketService, useValue: { call: () => NEVER } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: NetworkService, useValue: {} },
        { provide: DialogService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    document.body.classList.add('fc-ui', 'ix-blue');
    fixture = TestBed.createComponent(InterfacesHostComponent);
    Object.assign(fixture.componentInstance.list, { hasPendingChanges: true, checkinWaiting: false, ha_enabled: false });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.classList.remove('fc-ui', 'ix-blue');
  });

  it('draws the timeout as the theme\'s 50px centred kit box inside the sentence', () => {
    expect(fixture.nativeElement.querySelector('mat-form-field')).toBeNull();
    const input = fixture.nativeElement.querySelector('#timeout-field') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(input.getAttribute('aria-label')).toBe('Timeout');
    expect(input.closest('p')).not.toBeNull();
    const style = getComputedStyle(input);
    expect(style.width).toBe('50px');
    expect(style.textAlign).toBe('center');
    expect(style.height).toBe('32px');
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopLeftRadius).toBe('6px');
  });

  it('binds the timeout and flags a value without digits', fakeAsync(() => {
    const input = fixture.nativeElement.querySelector('#timeout-field') as HTMLInputElement;
    tick();
    fixture.detectChanges();
    expect(input.value).toBe('60');
    input.value = '120';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.list.checkin_timeout as any).toBe('120');
    expect(input.classList).toContain('ng-valid');
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.classList).toContain('ng-invalid');
  }));
});
