import filesize from 'filesize';
import { T } from 'app/translate-marker';

export function displayWireguardPeer(peer: any, translate: (message: string) => string): any {
  const runtime = peer.runtime || {};
  const states = {
    RECENT: T('Recent handshake'),
    STALE: T('Stale handshake'),
    NEVER_CONNECTED: T('Never connected'),
    DISABLED: T('Disabled'),
    NOT_LOADED: T('Not active'),
    UNAVAILABLE: T('Unavailable'),
  };
  const state = translate(states[runtime.state] || states.UNAVAILABLE);
  const age = runtime.handshake_age;
  let handshake = state;
  if (runtime.latest_handshake && Number.isFinite(age) && age >= 0) {
    const seconds = Math.floor(age);
    const duration = seconds < 60 ? `${seconds}s`
      : seconds < 3600 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : seconds < 86400 ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
          : `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    handshake = translate(T('{{age}} ago')).replace('{{age}}', duration);
  }
  const bytes = (value: any): string => (Number.isFinite(value) && value >= 0
    ? String(filesize(value, { standard: 'iec' })) : '—');
  return {
    ...peer,
    allowed_ips_string: (peer.allowed_ips || []).join(', '),
    handshake_display: handshake,
    runtime_state_display: state,
    endpoint_display: runtime.endpoint || '—',
    received_display: bytes(runtime.rx_bytes),
    sent_display: bytes(runtime.tx_bytes),
  };
}
