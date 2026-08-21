import { T } from '../../../translate-marker';

export default {
  server: {
    header: T('WireGuard Server Settings'),
    buttons: {
      generate: T('Generate Keys'),
      peers: T('Manage Peers'),
    },
  },
  public_key: {
    placeholder: T('Public Key'),
    tooltip: T('This server\'s public key. Give this to each peer. It is derived from \
 the private key and cannot be edited directly — use <b>Generate Keys</b> to create a \
 new keypair.'),
  },
  private_key: {
    placeholder: T('Private Key'),
    tooltip: T('Leave empty to keep the current key. Paste a key here only to import an \
 existing WireGuard server identity; otherwise use <b>Generate Keys</b>. Regenerating or \
 replacing this key invalidates every peer configuration already handed out.'),
  },
  address: {
    placeholder: T('Address'),
    tooltip: T('The address and netmask of this server inside the tunnel, for example \
 <i>10.100.0.1/24</i>. Peers take addresses from the same range.'),
  },
  listen_port: {
    placeholder: T('Listen Port'),
    tooltip: T('UDP port WireGuard listens on. This port must be reachable from the \
 internet for peers to connect. Default is <i>51820</i>.'),
  },
  mtu: {
    placeholder: T('MTU'),
    tooltip: T('Optional. Leave empty to let WireGuard choose. Lower this if connections \
 establish but large transfers stall.'),
  },
  dns: {
    placeholder: T('DNS'),
    tooltip: T('Optional. A DNS server address written into generated peer configurations \
 so clients resolve names through the tunnel. Not used by the server itself.'),
  },
  endpoint: {
    placeholder: T('Endpoint'),
    tooltip: T('The publicly reachable hostname or IP of this server, optionally with a \
 port. Written into generated peer configurations so they work without hand editing. \
 Required before a peer configuration can be downloaded.'),
  },
  peer: {
    header: T('WireGuard Peer'),
    buttons: {
      download: T('Download Configuration'),
    },
    name: {
      placeholder: T('Name'),
      tooltip: T('A label for this peer, for example the device it belongs to.'),
    },
    public_key: {
      placeholder: T('Public Key'),
      tooltip: T('The peer\'s public key. The peer generates its own keypair and gives \
 you the public half — its private key is never sent to or stored on this system.'),
    },
    preshared_key: {
      placeholder: T('Pre-shared Key'),
      tooltip: T('Optional additional symmetric key shared with this peer. Generate one \
 on the client with <i>wg genpsk</i>.'),
    },
    allowed_ips: {
      placeholder: T('Allowed IPs'),
      tooltip: T('Addresses this peer may use inside the tunnel. A single roaming client \
 is normally one address, for example <i>10.100.0.2/32</i>.'),
    },
    keepalive: {
      placeholder: T('Persistent Keepalive'),
      tooltip: T('Optional. Seconds between keepalive packets. Set this (commonly \
 <i>25</i>) when the peer sits behind NAT and needs to keep the mapping open.'),
    },
    enabled: {
      placeholder: T('Enabled'),
      tooltip: T('Unset to keep this peer\'s configuration but exclude it from the \
 running server.'),
    },
  },
  client: {
    header: T('WireGuard Client Settings'),
    buttons: {
      generate: T('Generate Keys'),
    },
    public_key: {
      placeholder: T('Public Key'),
      tooltip: T('This system\'s public key. Give this to the operator of the remote \
 WireGuard server — they must add it as a peer before the tunnel will come up. It is \
 derived from the private key; use <b>Generate Keys</b> to create a new pair.'),
    },
    private_key: {
      placeholder: T('Private Key'),
      tooltip: T('Leave empty to keep the current key. Paste a key here only to import \
 an existing client identity; otherwise use <b>Generate Keys</b>. Re-keying does not \
 notify the remote server, so the tunnel stays down until they are given the new \
 public key.'),
    },
    address: {
      placeholder: T('Address'),
      tooltip: T('The address this system is assigned <i>inside</i> the tunnel, with \
 its netmask — for example <i>10.100.0.2/32</i>. The remote server\'s operator tells \
 you what this is; it is not something you choose.'),
    },
    peer_public_key: {
      placeholder: T('Remote Public Key'),
      tooltip: T('The public key of the remote WireGuard server.'),
    },
    endpoint: {
      placeholder: T('Endpoint'),
      tooltip: T('The remote server\'s reachable host, optionally with a port — for \
 example <i>vpn.example.com:51820</i>.'),
    },
    allowed_ips: {
      placeholder: T('Allowed IPs'),
      tooltip: T('Which traffic is sent through the tunnel. List only the remote \
 networks you need, for example <i>10.100.0.0/24</i>.<br><br><b>Warning:</b> entering \
 <i>0.0.0.0/0</i> or <i>::/0</i> routes <b>all</b> of this system\'s traffic through \
 the remote server. On a storage system that can cut off access from your own network, \
 including the web interface you are reading this in, and may need console access to \
 undo. Only do this if you are certain the remote server routes your traffic back.'),
    },
    preshared_key: {
      placeholder: T('Pre-shared Key'),
      tooltip: T('Optional additional symmetric key, if the remote server uses one.'),
    },
    keepalive: {
      placeholder: T('Persistent Keepalive'),
      tooltip: T('Optional. Seconds between keepalive packets. Set this (commonly \
 <i>25</i>) when this system is behind NAT, so the remote server can keep reaching it.'),
    },
    mtu: {
      placeholder: T('MTU'),
      tooltip: T('Optional. Leave empty to let WireGuard choose. Lower this if the \
 tunnel connects but large transfers stall.'),
    },
  },
  error_dialog_title: T('Error'),
};
