import { T } from '../../translate-marker';

export const helptext = {
  webauthn: {
    formTitle: T('Security Keys (WebAuthn)'),
    intro: T('Hardware security keys (YubiKey or any FIDO2 authenticator) can be required as a \
second factor for web interface logins. Enroll at least one key, then enable enforcement. \
Enrolling a second (backup) key is strongly recommended.'),
    either_or_note: T('Logins accept either a security key or a one-time (TOTP) code. \
Two-Factor authentication must be enabled first and stays enabled while WebAuthn is enforced — \
it is the fallback sign-in path when security keys are unavailable.'),
    requires_totp: T('Two-Factor (TOTP) authentication is not enabled. Enable it first \
(System → 2FA) — security keys only work when the interface is reached over HTTPS with a DNS \
hostname, so a one-time code must remain available as fallback (for example when connecting \
by IP address).'),
    banner_unavailable: T('Security keys are unavailable on this connection. Access the web \
interface over HTTPS using a DNS hostname (not an IP address) to enroll or use security keys.'),
    recovery_note: T('Recovery: if all keys are lost, disable WebAuthn from the local console \
shell with: midclt call auth.webauthn.update \'{"enabled": false}\''),
    status_label: T('Status:'),
    enabled_label: T('Enabled'),
    disabled_label: T('Disabled'),
    add_button: T('Add Security Key'),
    enable_button: T('Enable WebAuthn'),
    disable_button: T('Disable WebAuthn'),
    no_keys: T('No security keys enrolled yet.'),
    columns: {
      name: T('Name'),
      created: T('Added'),
      last_used: T('Last Used'),
    },
    add_dialog: {
      title: T('Add Security Key'),
      name_placeholder: T('Name'),
      name_tooltip: T('A label to recognize this key later, for example "YubiKey 5C primary".'),
      submit: T('Enroll'),
    },
    enable_dialog: {
      title: T('Enable WebAuthn'),
      message: T('Web interface logins will require tapping an enrolled security key, \
with a one-time (TOTP) code accepted as fallback. Make sure the enrolled key works \
before enabling. Continue?'),
    },
    disable_dialog: {
      title: T('Disable WebAuthn'),
      message: T('Web interface logins will no longer ask for a security key. Continue?'),
    },
    delete_dialog: {
      title: T('Delete Security Key'),
      message: T('Remove security key '),
    },
    errors: {
      title: T('Security Key'),
      cancelled: T('The security key ceremony was cancelled or timed out.'),
      already_enrolled: T('This security key appears to be enrolled already.'),
    },
  },
};
