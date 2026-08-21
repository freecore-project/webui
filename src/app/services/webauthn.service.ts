import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { WebSocketService } from './ws.service';

/**
 * WebAuthn (FIDO2) ceremony helper: converts between the base64url JSON the
 * middleware speaks (auth.webauthn.*) and the ArrayBuffer-based browser
 * credentials API. No external dependencies — navigator.credentials is native.
 */
@Injectable({ providedIn: 'root' })
export class WebauthnService {
  constructor(protected ws: WebSocketService) {}

  available(): boolean {
    return typeof window !== 'undefined'
      && (window as any).isSecureContext !== false
      && !!(window as any).PublicKeyCredential
      && !!(navigator as any).credentials;
  }

  register(name: string): Observable<any> {
    return from(this.doRegister(name));
  }

  loginCeremony(username: string, password: string): Observable<any> {
    return from(this.doLoginCeremony(username, password));
  }

  private async doRegister(name: string): Promise<any> {
    const options = await this.ws.call('auth.webauthn.register_begin', [name]).toPromise();
    const publicKey: any = {
      challenge: this.b64urlToBuf(options.challenge),
      rp: options.rp,
      user: {
        id: this.b64urlToBuf(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: (options.excludeCredentials || []).map((cred) => ({
        type: cred.type,
        id: this.b64urlToBuf(cred.id),
        transports: cred.transports,
      })),
    };
    const credential: any = await (navigator as any).credentials.create({ publicKey });
    return this.ws.call('auth.webauthn.register_complete', [this.credentialToJson(credential)]).toPromise();
  }

  private async doLoginCeremony(username: string, password: string): Promise<any> {
    const options = await this.ws.call('auth.webauthn.login_begin').toPromise();
    const publicKey: any = {
      challenge: this.b64urlToBuf(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
      allowCredentials: (options.allowCredentials || []).map((cred) => ({
        type: cred.type,
        id: this.b64urlToBuf(cred.id),
        transports: cred.transports,
      })),
    };
    const credential: any = await (navigator as any).credentials.get({ publicKey });
    return this.ws.login_webauthn(username, password, this.credentialToJson(credential)).toPromise();
  }

  private credentialToJson(credential: any): string {
    const response: any = {
      clientDataJSON: this.bufToB64url(credential.response.clientDataJSON),
    };
    if (credential.response.attestationObject) {
      response.attestationObject = this.bufToB64url(credential.response.attestationObject);
    }
    if (credential.response.getTransports) {
      response.transports = credential.response.getTransports();
    }
    if (credential.response.authenticatorData) {
      response.authenticatorData = this.bufToB64url(credential.response.authenticatorData);
      response.signature = this.bufToB64url(credential.response.signature);
      response.userHandle = credential.response.userHandle
        ? this.bufToB64url(credential.response.userHandle) : null;
    }
    return JSON.stringify({
      id: credential.id,
      rawId: this.bufToB64url(credential.rawId),
      type: credential.type,
      response,
      clientExtensionResults: credential.getClientExtensionResults
        ? credential.getClientExtensionResults() : {},
    });
  }

  private bufToB64url(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return window.btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private b64urlToBuf(value: string): ArrayBuffer {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
      + '==='.slice(0, (4 - (value.length % 4)) % 4);
    const str = window.atob(b64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
