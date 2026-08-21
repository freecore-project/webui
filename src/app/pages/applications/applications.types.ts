export interface ApplicationsConfig {
  id: number;
  pool: string | null;
  subnet: string;
  configured: boolean;
  runtime_ready: boolean;
  restart_on_boot: boolean;
  // the internal development record: both experimental lanes are off by default.
  linux_compat_enabled: boolean;
  convert_enabled: boolean;
  linux_compat?: { enabled: boolean; loaded: boolean; osrelease: string | null };
  paths?: { [key: string]: string } | null;
}

export interface ApplicationsExperimentalFlags {
  linux_compat_enabled: boolean;
  convert_enabled: boolean;
}

export interface ApplicationsProvider {
  id: string;
  name: string;
  default: boolean;
  type: string;
  source_url: string;
  support_owner: string;
  relationship: string;
}

export interface ApplicationAttribution {
  provider: string | null;
  source_url: string | null;
  support_url: string | null;
  support_owner: string;
  license: string | null;
  relationship: string;
}

export interface ApplicationPort {
  /** the internal development record: null keeps the port on the Applications bridge (not published). */
  host_port: number | null;
  container_port: number;
  protocol: 'tcp' | 'udp';
  description?: string | null;
}

export interface ApplicationEnvironment {
  name: string;
  default?: string;
  value?: string;
  required?: boolean;
  sensitive?: boolean;
  description?: string | null;
  documented_default?: string;
  set?: boolean;
}

export interface ApplicationVolume {
  name: string;
  target: string;
  dataset: string | null;
  read_only: boolean;
  owned?: boolean;
  source?: string;
  description?: string | null;
  optional?: boolean;
  storage?: string;
}

export interface ApplicationAnnotation {
  name: string;
  value: string;
}

export interface ApplicationPortal {
  scheme: 'http' | 'https';
  port: number;
  path: string;
}

export interface ApplicationImage {
  reference: string;
  // the internal development record: the catalog follows the provider's tag, so a
  // review-time digest is informational and may be absent.
  immutable_reference: string | null;
  digest: string | null;
  os: string;
  architecture: string;
}

/**
 * the internal development record: how an application reaches the network. The managed
 * bridge is the default; a LAN attachment gives the container its own IPv4
 * address on a bridge carrying the chosen host interface, and nothing is
 * published through the host.
 */
export interface ApplicationNetwork {
  mode: 'managed' | 'lan';
  interface?: string | null;
  address?: string | null;
  gateway?: string | null;
  // the internal development record: the managed-bridge leg of a gateway. The address
  // is assigned by middleware and never sent by the page.
  managed_access?: boolean;
  managed_address?: string | null;
}

/**
 * the internal development record: a system certificate mounted into an application. The entry carries
 * the id, and the name and fingerprint the certificate had when it was chosen; the middleware
 * binds it to the certificate's key, so a renewal or a rename keeps it and a record that travels
 * with an exported pool cannot bind to a different certificate. The page never sees key material.
 */
export interface ApplicationCertificate {
  id: number;
  name: string;
  fingerprint: string;
  target: string;
  restart_on_change: boolean;
  uid: number | null;
  gid: number | null;
}

/** A certificate the store offers for mounting: the fields ApplicationsStore asks for, no more. */
export interface CertificateChoice {
  id: number;
  name: string;
  fingerprint: string | null;
  /** "Mon Jan  1 00:00:00 2029", in the system's time zone. */
  until: string | null;
  revoked: boolean;
  cert_type_CSR: boolean;
  /** Null when there is no usable private key. The key itself is never asked for. */
  key_length: number | null;
  /** The certificate first, then what chain.pem will carry. */
  chain_list: string[];
}

export interface ApplicationInstallPayload {
  name: string;
  image: string;
  ports: ApplicationPort[];
  environment: { name: string; value: string }[];
  volumes: ApplicationVolume[];
  annotations: ApplicationAnnotation[];
  /** the internal development record: user-defined container labels. */
  labels: ApplicationAnnotation[];
  /** the internal development record: system certificates mounted into the application. */
  certificates: ApplicationCertificate[];
  restart_policy: 'no' | 'on-failure' | 'always';
  portal: ApplicationPortal | null;
  health_timeout: number;
  network?: ApplicationNetwork;
}

export interface ApplicationCatalogEntry {
  id: string;
  name: string;
  provider: string | null;
  provider_name: string | null;
  catalog_app: boolean;
  title: string;
  category: string;
  description: string;
  icon: string | null;
  architectures: string[];
  host_architecture: string;
  resolved: boolean;
  available: boolean;
  status: 'UNRESOLVED' | 'AVAILABLE' | 'UNAVAILABLE';
  reason: string | null;
  catalog_stale?: boolean;
  catalog_refreshed_at?: number;
  provider_error?: string | null;
  attribution: ApplicationAttribution;
  catalog_source?: 'empty' | 'seed' | 'live' | string;
  catalog?: {
    version: string | null;
    // the internal development record: the list can only quote the provider's index.
    version_source?: 'index' | 'image';
    source: 'empty' | 'seed' | 'live' | string;
  };
  provenance?: {
    repository: string;
    sbom_url: string;
  };
}

export interface ApplicationCatalogDetail extends Omit<ApplicationCatalogEntry, 'catalog' | 'provenance'> {
  // the internal development record: the reviewed contract is identified by the hash of
  // the provider's compose file; the install and update calls carry it back.
  catalog?: {
    // the internal development record: the version and flavour the tag resolves to, as
    // the image itself states them; 'index' when the registry did not answer.
    version: string | null;
    variant?: string | null;
    version_source?: 'image' | 'index';
    compose_sha256: string;
    source: string;
    fetched_at: number;
  };
  provenance?: {
    repository: string;
    source_path: string;
    compose_sha256: string;
    sbom_url: string;
    upstream_url: string | null;
    index_updated_at: string | null;
  };
  image: ApplicationImage | null;
  environment: ApplicationEnvironment[];
  volumes: ApplicationVolume[];
  ports: ApplicationPort[];
  annotations: ApplicationAnnotation[];
  labels: ApplicationAnnotation[];
  health: { type?: string; scheme: string; container_port: number; host_port: number | null; path: string } | null;
  portal: ApplicationPortal | null;
  install: ApplicationInstallPayload | null;
  links?: { [key: string]: string | null };
}

export interface ApplicationCatalogInstallPayload {
  id: string;
  compose_sha256: string;
  name: string;
  ports: ApplicationPort[];
  environment: { name: string; value: string }[];
  volumes: { name: string; dataset: string | null }[];
  labels: ApplicationAnnotation[];
  certificates: ApplicationCertificate[];
  restart_policy: 'no' | 'on-failure' | 'always';
  health_timeout: number;
  network: ApplicationNetwork;
}

/**
 * the internal development record: an installed application's new choices, bound to the
 * declarations it was installed with. An environment value of null keeps the
 * installed value (the page never sees values); a volume dataset of null means
 * app-owned storage.
 */
export interface ApplicationReconfigurePayload {
  name: string;
  compose_sha256: string | null;
  ports: ApplicationPort[];
  environment: { name: string; value: string | null }[];
  volumes: { name: string; dataset: string | null }[];
  labels: ApplicationAnnotation[];
  /** null keeps the mounted certificates; a list -- the empty one included -- replaces them. */
  certificates: ApplicationCertificate[] | null;
  restart_policy: 'no' | 'on-failure' | 'always';
  health_timeout: number;
  network: ApplicationNetwork;
}

/** the internal development record: an app-owned dataset under the store and what maps it. */
export interface OwnedDataset {
  dataset: string;
  application: string;
  volume: string | null;
  parent: boolean;
  mountpoint: string;
  used: number;
  owner: string | null;
  orphan: boolean;
}

export interface ApplicationOrigin {
  kind: 'byo' | 'convert';
  reference: string;
  [key: string]: string | number | boolean | null;
}

export interface InstalledApplication {
  // Records written by the retired signed-snapshot client still carry
  // object_sha256 and entry_revision (the internal development record).
  catalog?: {
    id: string;
    version?: string;
    // the internal development record: what the running image says it is.
    variant?: string | null;
    version_source?: 'image' | 'record';
    compose_sha256?: string;
    repository?: string;
    image_tag?: string;
    object_sha256?: string;
    entry_revision?: number;
  };
  // the internal development record: which tier the image runs under, and where a
  // record came from when it was not a catalog install (the internal development record).
  image_os: 'freebsd' | 'linux';
  origin: ApplicationOrigin | null;
  update_available?: boolean;
  revoked?: boolean;
  revocation_reason?: string;
  catalog_error?: string;
  name: string;
  container_name: string;
  image: string;
  digest: string;
  status: string;
  running: boolean;
  health: string | null;
  health_declared?: boolean;
  error: string | null;
  ports: ApplicationPort[];
  environment: ApplicationEnvironment[];
  volumes: ApplicationVolume[];
  annotations: ApplicationAnnotation[];
  labels: ApplicationAnnotation[];
  /** the internal development record: absent on records written before certificates existed. */
  certificates?: ApplicationCertificate[];
  restart_policy: string;
  portal: ApplicationPortal | null;
  // the internal development record: absent on records written before schema 4.
  network?: ApplicationNetwork;
  // the internal development record: the container's address on the managed bridge.
  bridge_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationPool {
  id: number;
  name: string;
  status: string;
  healthy: boolean;
  is_decrypted: boolean;
}

export interface ApplicationJobState {
  operation: string;
  state: string;
  percent: number;
  description: string;
}

export interface BastilleConfig {
  id: number;
  pool: string | null;
  startup_delay: number;
  parallel_limit: number;
  installed: boolean;
  configured: boolean;
  configuration_valid: boolean;
  configuration_error: string | null;
  enabled: boolean;
  running_jails: string[];
  running_jail_count: number | null;
  running_jails_error: string | null;
  paths: { [key: string]: string } | null;
}

export interface BastilleConfigurePayload {
  pool: string;
  startup_delay: number;
  parallel_limit: number;
}

export interface ApplicationImportPayload {
  name: string;
  image: string;
  image_os: 'freebsd' | 'linux';
  ports: ApplicationPort[];
  environment: { name: string; value: string }[];
  volumes: { name: string; target: string; dataset: string | null; read_only: boolean }[];
  annotations: ApplicationAnnotation[];
  labels: ApplicationAnnotation[];
  restart_policy: 'no' | 'on-failure' | 'always';
  portal: ApplicationPortal | null;
  healthcheck: {
    type: 'HTTP'; scheme: 'http'; container_port: number; host_port: number; path: string;
  } | null;
  health_timeout: number;
  acknowledge_unreviewed: boolean;
}

// the internal development record: a jail the converter can take, as `applications.convert.sources` lists it.
export interface ConvertSource {
  kind: 'jail';
  engine: 'iocage' | 'bastille';
  name: string;
  state: string | null;
  release: string | null;
  root: string;
  app: string | null;
  version: string | null;
  packages: { name: string; version: string }[];
  catalog: string[];
  lift: boolean;
  convertible: boolean;
}

export interface ConvertPortChoice {
  container_port: number;
  protocol: 'tcp' | 'udp';
  host_port: number | null;
  command?: string | null;
}

// What `applications.convert.detect` says about a jail before anything is planned.
export interface ConvertDetection {
  kind: string;
  engine?: 'iocage' | 'bastille';
  ref: string;
  root: string | null;
  dataset: string | null;
  state: string | null;
  release: string | null;
  userland?: string | null;
  root_kind?: 'clone' | 'basejail' | 'thick' | 'thin' | null;
  app: string | null;
  version: string | null;
  recipe: string | null;
  recipe_status?: 'proven' | 'draft' | null;
  refusals: string[];
  packages?: { name: string; version: string; automatic: boolean }[];
  ports?: ConvertPortChoice[];
  ports_detected_from?: string | null;
}

export interface ConvertPlanEntry {
  type: 'carry' | 'rewrite' | 'drop' | 'refuse' | 'hop' | 'note';
  human: string;
  what?: string;
  [key: string]: any;
}

/** the internal development record: an installed application written out as a Linux compose bundle. */
export interface ExportPlan {
  plan_id: string;
  direction: 'export';
  kind: 'state' | 'identity' | 'fresh';
  source: { kind: 'application'; ref: string };
  app: { name: string | null; title: string | null; version: string | null; recipe: string | null; recipe_status?: string | null };
  target: { image: string; digest: string | null; version: string | null };
  entries: ConvertPlanEntry[];
  commands: string[];
}

export interface ExportRunOptions {
  destination: string;
  mode: 'bundle' | 'in-place';
  live: boolean;
  host_root: string | null;
}

export interface ConvertPlan {
  plan_id: string;
  mode: 'lift' | 'native' | 'compat';
  recommended: 'lift' | 'native' | 'compat' | null;
  application: { name: string; host_port: number | null };
  app: { name: string | null; title: string | null; version: string | null; recipe: string | null };
  source: { kind: string; engine?: string | null; ref: string; snapshot?: string | null };
  modes: {
    native: { available: boolean; reasons: string[]; version?: string | null; catalog_id?: string | null };
    compat: { available: boolean; reasons: string[] };
    lift: { available: boolean; reasons: string[]; base?: string | null; release?: string | null; root_kind?: string | null };
  };
  entries: ConvertPlanEntry[];
  lift?: {
    ports: { host_port: number; container_port: number; protocol: 'tcp' | 'udp' }[];
    ports_detected_from: string | null;
    state_volumes: { name: string; target: string; path: string }[];
    external_volumes: { name: string; target: string; dataset: string; read_only: boolean }[];
    size_bytes: number | null;
    base: { reference: string | null; release: string | null };
    delta: string;
    packages: string[];
  } | null;
  hop?: { image: string; purpose: string; count?: number } | null;
}

// the internal development record: a compose file read into the import form.
export interface ComposeImportResult {
  service: string;
  install: Omit<ApplicationImportPayload, 'acknowledge_unreviewed'>;
  match: { kind: string; app: string | null; confidence: string | null } | null;
  catalog_app: string | null;
  ignored: string[];
  volumes_in_compose: { source: string; target: string; kind: string }[];
}
