import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { DialogService, WebSocketService } from '../../../services';
import { NetworkSummaryComponent } from './networksummary.component';

describe('NetworkSummaryComponent', () => {
  let fixture: ComponentFixture<NetworkSummaryComponent>;
  let component: NetworkSummaryComponent;
  let summary$: Subject<any>;
  let websocket: jasmine.SpyObj<WebSocketService>;

  beforeEach(waitForAsync(() => {
    summary$ = new Subject();
    websocket = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['call']);
    websocket.call.and.returnValue(summary$);

    TestBed.configureTestingModule({
      declarations: [NetworkSummaryComponent],
      imports: [CommonModule, TranslateModule.forRoot()],
      providers: [
        { provide: WebSocketService, useValue: websocket },
        { provide: DialogService, useValue: jasmine.createSpyObj<DialogService>('DialogService', ['errorReport']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkSummaryComponent);
    component = fixture.componentInstance;
  });

  it('renders safe empty collections while the summary call is pending', () => {
    expect(() => fixture.detectChanges()).not.toThrow();

    expect(component.ips).toEqual({});
    expect(component.ipSize).toBe(0);
    expect(component.default_routes).toEqual([]);
    expect(component.nameservers).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Name servers not configured');
  });

  it('replaces the empty state when the summary arrives', () => {
    fixture.detectChanges();
    summary$.next({
      ips: { em0: { IPV4: { address: '192.0.2.10' } } },
      default_routes: ['192.0.2.1'],
      nameservers: ['192.0.2.53'],
    });
    fixture.detectChanges();

    expect(component.ipSize).toBe(1);
    expect(component.default_routes).toEqual(['192.0.2.1']);
    expect(component.nameservers).toEqual(['192.0.2.53']);
    expect(fixture.nativeElement.textContent).toContain('192.0.2.53');
  });

  it('keeps collections render-safe when optional response fields are absent', () => {
    fixture.detectChanges();
    summary$.next({});
    fixture.detectChanges();

    expect(component.ips).toEqual({});
    expect(component.default_routes).toEqual([]);
    expect(component.nameservers).toEqual([]);
  });
});
