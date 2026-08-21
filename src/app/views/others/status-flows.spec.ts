import { Location } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { DialogService } from 'app/services/dialog.service';
import { LocaleService } from 'app/services/locale.service';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { WebSocketService } from 'app/services/ws.service';
import { RebootComponent } from './reboot/reboot.component';
import { ShutdownComponent } from './shutdown/shutdown.component';

describe('15.2 system transition flows', () => {
  let operation: Subject<unknown>;
  let ws: any;
  beforeEach(async () => {
    operation = new Subject();
    ws = { connected: true, prepare_shutdown: jasmine.createSpy('prepare_shutdown').and.callFake(() => { ws.connected = false; }),
      call: jasmine.createSpy('call').and.callFake((method: string) => method === 'system.product_type' ? of('CORE') : operation) };
    await TestBed.configureTestingModule({
      declarations: [RebootComponent, ShutdownComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: WebSocketService, useValue: ws }, { provide: AppLoaderService, useValue: { open: jasmine.createSpy('open'), close: jasmine.createSpy('close') } },
        { provide: LocaleService, useValue: { getCopyrightYearFromBuildTime: () => '2026' } },
        { provide: MatDialog, useValue: { closeAll: () => {} } }, { provide: DialogService, useValue: {} }],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    spyOn(TestBed.inject(Location), 'replaceState');
  });

  it('keeps the restart request, refresh protection, and reconnect-to-login sequence', fakeAsync(() => {
    const fixture = TestBed.createComponent(RebootComponent);
    fixture.detectChanges();
    expect(ws.call).toHaveBeenCalledWith('system.reboot', {});
    expect(TestBed.inject(Location).replaceState).toHaveBeenCalledWith('/session/signin');
    operation.complete();
    expect(TestBed.inject(AppLoaderService).open).toHaveBeenCalledWith('Restarting', jasmine.objectContaining({ fullscreen: true }));
    tick(1000);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    ws.connected = true;
    tick(5000);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/session/signin']);
  }));

  it('shows disconnection after shutdown without claiming a confirmed power-off', () => {
    const fixture = TestBed.createComponent(ShutdownComponent);
    fixture.detectChanges();
    expect(ws.call).toHaveBeenCalledWith('system.shutdown', {});
    expect(fixture.nativeElement.textContent).toContain('Shutting down');
    operation.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Connection closed');
    expect(fixture.nativeElement.textContent).toContain('Power-off status cannot be confirmed');
    expect(fixture.nativeElement.querySelector('a[routerLink]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role=progressbar]')).toBeNull();
  });
});
