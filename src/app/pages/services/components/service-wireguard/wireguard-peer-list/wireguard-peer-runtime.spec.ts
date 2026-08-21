import { displayWireguardPeer } from './wireguard-peer-runtime';

describe('WireGuard peer runtime display', () => {
  const translate = (message: string): string => message;

  it('shows never connected explicitly and keeps zero distinct from unavailable counters', () => {
    const row = displayWireguardPeer({
      allowed_ips: [],
      runtime: {
        state: 'NEVER_CONNECTED', latest_handshake: null, handshake_age: null, rx_bytes: 0, tx_bytes: 0,
      },
    }, translate);
    expect(row.handshake_display).toBe('Never connected');
    expect(row.received_display).toBe('0 B');
    expect(row.endpoint_display).toBe('—');
  });

  it('renders missing interface state without a date or misleading zero counters', () => {
    const row = displayWireguardPeer({ name: 'peer', runtime: { state: 'UNAVAILABLE' } }, translate);
    expect(row.handshake_display).toBe('Unavailable');
    expect(row.received_display).toBe('—');
    expect(row.sent_display).toBe('—');
    expect(row.allowed_ips_string).toBe('');
  });

  it('uses server-reported age, preserves IPv6 endpoints and displays large counters', () => {
    const peer = {
      allowed_ips: ['192.0.2.2/32'],
      runtime: {
        state: 'STALE',
        latest_handshake: 10,
        handshake_age: 181,
        endpoint: '[2001:db8::1]:51820',
        rx_bytes: 4294967296,
        tx_bytes: 1024,
      },
    };
    const original = JSON.stringify(peer);
    const row = displayWireguardPeer(peer, translate);
    expect(row.handshake_display).toBe('3m 1s ago');
    expect(row.runtime_state_display).toBe('Stale handshake');
    expect(row.received_display).toBe('4 GiB');
    expect(row.sent_display).toBe('1 KiB');
    expect(row.endpoint_display).toBe('[2001:db8::1]:51820');
    expect(JSON.stringify(peer)).toBe(original);
  });

  it('translates state and age text', () => {
    const translateLabel = (message: string): string => ({ 'Recent handshake': 'Recent', '{{age}} ago': 'Age {{age}}' }[message] || message);
    const row = displayWireguardPeer({ runtime: { state: 'RECENT', latest_handshake: 100, handshake_age: 0 } }, translateLabel);
    expect(row.handshake_display).toBe('Age 0s');
    expect(row.runtime_state_display).toBe('Recent');
  });

  it('supports empty and large lists without mutating peer configuration', () => {
    expect([].map((peer) => displayWireguardPeer(peer, translate))).toEqual([]);
    const peers = Array.from({ length: 250 }, (_, id) => ({ id, name: `peer-${id}`, allowed_ips: ['192.0.2.2/32'] }));
    const rows = peers.map((peer) => displayWireguardPeer(peer, translate));
    expect(rows.length).toBe(250);
    expect(rows[249].id).toBe(249);
    expect(rows[249].handshake_display).toBe('Unavailable');
    expect((peers[0] as any).handshake_display).toBeUndefined();
  });
});
