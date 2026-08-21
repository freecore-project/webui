// the internal development record: the Network card opens an interface, a VLAN or a bridge inside the card, as
// 13.3's per-interface card did (overview -> addresses / VLANs / LAGG ports). This file reads the
// dashboard's `nics` (interface.query with VLAN states folded into their parent's state.vlans and
// LAGG members folded into the LAGG) and holds no Angular state.

export type IfaceKind = 'physical' | 'lagg' | 'vlan' | 'bridge';

export interface IfaceRef {
  kind: IfaceKind;
  name: string;
  /** The interface.query state (live). */
  state: any;
  /** The interface.query record when it is still top-level (VLANs folded into a parent are state only). */
  nic: any | null;
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function compareNames(a: string, b: string): number {
  return byName.compare(a, b);
}

export function isUpState(state: any): boolean {
  return state?.link_state === 'LINK_STATE_UP';
}

export function addressesOf(state: any): string[] {
  return (state?.aliases || [])
    .filter((alias: any) => alias && (alias.type === 'INET' || alias.type === 'INET6'))
    .map((alias: any) => `${alias.address}/${alias.netmask}`);
}

/** Every VLAN the card knows: the ones folded under a parent plus any orphan top-level VLAN. */
export function vlanRefs(nics: any[]): IfaceRef[] {
  const refs: IfaceRef[] = [];
  const seen = new Set<string>();
  for (const nic of nics || []) {
    if (nic?.type === 'VLAN' && nic.name && !seen.has(nic.name)) {
      seen.add(nic.name);
      refs.push({ kind: 'vlan', name: nic.name, state: nic.state || {}, nic });
    }
    for (const state of nic?.state?.vlans || []) {
      // Older fixtures and pre-fold data can carry bare names; only a state object can be opened.
      if (!state || typeof state !== 'object' || !state.name || seen.has(state.name)) { continue; }
      seen.add(state.name);
      refs.push({ kind: 'vlan', name: state.name, state: { parent: state.parent || nic.name, ...state }, nic: null });
    }
  }
  return refs.sort((a, b) => compareNames(a.name, b.name));
}

export function bridgeRefs(nics: any[]): IfaceRef[] {
  return (nics || [])
    .filter((nic) => nic?.type === 'BRIDGE' && nic.name)
    .map((nic) => ({ kind: 'bridge' as IfaceKind, name: nic.name, state: nic.state || {}, nic }))
    .sort((a, b) => compareNames(a.name, b.name));
}

export function physicalRefs(nics: any[]): IfaceRef[] {
  return (nics || [])
    .filter((nic) => (nic?.type === 'PHYSICAL' || nic?.type === 'LINK_AGGREGATION') && nic.name)
    .map((nic) => ({
      kind: (nic.type === 'LINK_AGGREGATION' ? 'lagg' : 'physical') as IfaceKind, name: nic.name, state: nic.state || {}, nic,
    }))
    .sort((a, b) => compareNames(a.name, b.name));
}

export function findIface(nics: any[], name: string): IfaceRef | null {
  return physicalRefs(nics).find((ref) => ref.name === name)
    || vlanRefs(nics).find((ref) => ref.name === name)
    || bridgeRefs(nics).find((ref) => ref.name === name)
    || null;
}

export function descriptionOf(ref: IfaceRef): string {
  const text = ref.nic?.description || ref.state?.description || '';
  return typeof text === 'string' ? text.trim() : '';
}

export function bridgeMembers(ref: IfaceRef): string[] {
  const live = ref.state?.members;
  const members: string[] = Array.isArray(live) && live.length ? live : (ref.nic?.bridge_members || []);
  return [...members].sort(compareNames);
}

export function laggPorts(ref: IfaceRef): string[] {
  const ports = ref.state?.lagg_ports || ref.nic?.lag_ports || [];
  return ports.map((port: any) => (typeof port === 'string' ? port : port?.name)).filter(Boolean).sort(compareNames);
}

// The VLANs folded under one interface. For a LAGG the dashboard also folds its member ports' VLANs
// into it, so this is "the VLANs carried by this link", whichever port they were configured on.
export function vlansOn(nics: any[], parent: string): IfaceRef[] {
  const owner = (nics || []).find((nic) => nic?.name === parent);
  const names = new Set<string>((owner?.state?.vlans || [])
    .filter((state: any) => state && typeof state === 'object' && state.name)
    .map((state: any) => state.name));
  return vlanRefs(nics).filter((ref) => names.has(ref.name));
}

export function vlanCountOn(nic: any): number {
  return (nic?.state?.vlans || []).length;
}
