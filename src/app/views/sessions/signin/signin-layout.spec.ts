import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AutofillMonitor } from '@angular/cdk/text-field';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { EMPTY, NEVER, of } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { CoreService } from 'app/core/services/core.service';
import { SystemGeneralService } from 'app/services';
import { DialogService } from 'app/services/dialog.service';
import { LocaleService } from 'app/services/locale.service';
import { ThemeService } from 'app/services/theme/theme.service';
import { UpdateService } from 'app/services/update.service';
import { WebauthnService } from 'app/services/webauthn.service';
import { WebSocketService } from 'app/services/ws.service';
import { SigninComponent } from './signin.component';

describe('15.2 sign-in presentation with the existing authentication flows', () => {
  let fixture: ComponentFixture<SigninComponent>;
  let component: SigninComponent;
  let ws: any;
  let securityKey: any;

  const element = <T extends Element>(selector: string): T => fixture.nativeElement.querySelector(selector);

  async function enterCredentials(): Promise<void> {
    for (const [selector, value] of [['#signin-username', 'sample-user'], ['#signin-password', 'sample-only']]) {
      const input = element<HTMLInputElement>(selector);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    ws = {
      connected: true,
      token: null,
      redirectUrl: undefined,
      call: jasmine.createSpy('call').and.callFake((method: string) => {
        if (method === 'system.product_type') return of('CORE');
        if (method === 'system.build_time') return of({ $date: Date.parse('2026-09-09T00:00:00Z') });
        if (method === 'user.has_root_password' || method === 'user.set_root_password') return of(true);
        return of(false);
      }),
      login: jasmine.createSpy('login').and.returnValue(NEVER),
    };
    securityKey = {
      available: () => true,
      loginCeremony: jasmine.createSpy('loginCeremony').and.returnValue(NEVER),
    };
    await TestBed.configureTestingModule({
      declarations: [SigninComponent],
      imports: [CommonModule, FormsModule, ReactiveFormsModule, HlmProgressImports, TranslateModule.forRoot()],
      providers: [
        { provide: WebSocketService, useValue: ws },
        { provide: Router, useValue: { url: '/sessions/signin' } },
        { provide: DialogService, useValue: {} },
        { provide: CoreService, useValue: { register: () => EMPTY, unregister: () => undefined } },
        { provide: ApiService, useValue: {} },
        { provide: AutofillMonitor, useValue: { monitor: () => EMPTY } },
        { provide: HttpClient, useValue: {} },
        { provide: SystemGeneralService, useValue: {} },
        { provide: LocaleService, useValue: { getCopyrightYearFromBuildTime: () => '2026' } },
        { provide: UpdateService, useValue: { hardRefreshIfNeeded: () => undefined } },
        { provide: WebauthnService, useValue: securityKey },
        { provide: ThemeService, useValue: { currentTheme: () => ({}) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SigninComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the brand mark in its own colours', () => {
    // the internal development record: the mono round desaturated the mark; the asset carries the brand colours.
    const mark = element<HTMLImageElement>('.signin-brand img');
    expect(mark.getAttribute('src')).toBe('assets/images/freecore-fork-mark.svg');
    expect(getComputedStyle(mark).filter).toBe('none');
    expect(getComputedStyle(mark).opacity).toBe('1');
  });

  it('keeps accessible names and password-manager field semantics with labels visually hidden', () => {
    const username = element<HTMLInputElement>('#signin-username');
    const password = element<HTMLInputElement>('#signin-password');
    expect(element<HTMLLabelElement>('label[for="signin-username"]').control).toBe(username);
    expect(element<HTMLLabelElement>('label[for="signin-password"]').control).toBe(password);
    expect(username.autocomplete).toBe('username');
    expect(password.autocomplete).toBe('current-password');
    expect(password.type).toBe('password');
  });

  it('toggles password visibility without submitting or replacing the submit-button reference', async () => {
    await enterCredentials();
    element<HTMLButtonElement>('.password-visibility').click();
    fixture.detectChanges();
    expect(element<HTMLInputElement>('#signin-password').type).toBe('text');
    expect(ws.login).not.toHaveBeenCalled();
    element<HTMLButtonElement>('#signin_button').click();
    fixture.detectChanges();
    expect(ws.login).toHaveBeenCalledWith('sample-user', 'sample-only');
    expect(component.submitButton.nativeElement.disabled).toBe(true);
    // the internal development record: the busy bar is a flag + the helm progress, indeterminate while signing in
    expect(component.busy).toBeTrue();
    const bar = element<HTMLElement>('hlm-progress.signin-progress');
    expect(bar.classList).toContain('is-busy');
    expect(bar.getAttribute('data-state')).toBe('indeterminate');
    expect(bar.hasAttribute('aria-valuenow')).toBeFalse();
  });

  it('says a failed sign-in inline and clears it on the next attempt (the internal development record)', async () => {
    ws.login.and.returnValue(of(false));
    await enterCredentials();
    element<HTMLButtonElement>('#signin_button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const error = element<HTMLElement>('#signin-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.classList).toContain('field-error'); // the page's own error voice
    expect(error.textContent.trim()).toBe('Username or Password is incorrect.');
    expect(document.querySelector('.mat-mdc-snack-bar-container')).toBeNull();
    // one message, not two: the cleared password's "enter it again" prompt stays quiet while the failure shows
    expect(element<HTMLElement>('#signin-password-error').textContent.trim()).toBe('');
    // the next attempt clears it as the request goes out
    ws.login.and.returnValue(NEVER);
    await enterCredentials();
    element<HTMLButtonElement>('#signin_button').click();
    fixture.detectChanges();
    expect(error.textContent.trim()).toBe('');
  });

  it('says a cancelled security key inline (the internal development record)', async () => {
    component.webauthnError({ name: 'NotAllowedError' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element<HTMLElement>('#signin-error').textContent.trim()).toBe('Security key not provided (cancelled or timed out). Try again.');
  });

  it('retains the TOTP submission path', async () => {
    component.isTwoFactor = true;
    component.signinData.otp = '123456';
    fixture.detectChanges();
    await enterCredentials();
    expect(element<HTMLInputElement>('#signin-otp').required).toBe(true);
    element<HTMLButtonElement>('#signin_button').click();
    expect(ws.login).toHaveBeenCalledWith('sample-user', 'sample-only', '123456');
  });

  it('keeps a code optional when a security key is available', async () => {
    component.isTwoFactor = true;
    component.isWebauthn = true;
    fixture.detectChanges();
    await enterCredentials();
    expect(element<HTMLInputElement>('#signin-otp').required).toBe(false);
    element<HTMLButtonElement>('#signin_button').click();
    expect(securityKey.loginCeremony).toHaveBeenCalledWith('sample-user', 'sample-only');
    expect(ws.login).not.toHaveBeenCalled();
  });

  it('uses a supplied code instead of opening the security-key ceremony', async () => {
    component.isTwoFactor = true;
    component.isWebauthn = true;
    component.signinData.otp = '123456';
    fixture.detectChanges();
    await enterCredentials();
    element<HTMLButtonElement>('#signin_button').click();
    expect(ws.login).toHaveBeenCalledWith('sample-user', 'sample-only', '123456');
    expect(securityKey.loginCeremony).not.toHaveBeenCalled();
  });

  it('submits first-time setup from its reactive form and keeps mismatches invalid', async () => {
    component.has_root_password = false;
    component.setPasswordFormGroup.setValue({ password: 'sample-only', password2: 'mismatch' });
    fixture.detectChanges();
    expect(element<HTMLButtonElement>('[name="signin_button2"]').disabled).toBe(true);
    component.setPasswordFormGroup.setValue({ password: 'sample-only', password2: 'sample-only' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element<HTMLButtonElement>('[name="signin_button2"]').click();
    expect(ws.call).toHaveBeenCalledWith('user.set_root_password', ['sample-only']);
    expect(ws.login).toHaveBeenCalledWith('root', 'sample-only');
  });

  it('hides credentials and preserves the complete connection message while disconnected', () => {
    ws.connected = false;
    fixture.detectChanges();
    expect(element<HTMLInputElement>('#signin-username').getClientRects().length).toBe(0);
    const message = element<HTMLElement>('.disconnected').textContent;
    expect(message).toContain('Connecting to FreeCORE');
    expect(message).toContain('powered on and connected to the network');
  });

  it('keeps credentials hidden on a standby controller and shows its state', () => {
    component.product_type = 'ENTERPRISE';
    component.failover_status = 'BACKUP';
    component.ha_info_ready = true;
    fixture.detectChanges();
    expect(element<HTMLInputElement>('#signin-username').getClientRects().length).toBe(0);
    expect(element<HTMLElement>('.ha-status').textContent).toContain('Standby');
  });
  it('distinguishes first connection metadata loading from a later disconnect', () => {
    ws.hasConnected = true;
    ws.connected = true;
    component.logo_ready = false;
    fixture.detectChanges();
    expect(element('.disconnected .fc-status-title').textContent).toContain('Connecting');
    expect(element('.disconnected').textContent).not.toContain('interrupted');
    ws.connected = false;
    fixture.detectChanges();
    expect(element('.disconnected .fc-status-title').textContent).toContain('Reconnecting');
    expect(element('.disconnected').textContent).toContain('interrupted');
  });

});
