import { T } from '../translate-marker';
import globalHelptext from './global-helptext';

export default {
  // the internal development record: the HA topbar surface is gone (this fork is CORE-only), but
  // this block stays -- signin.component still renders these reasons.
  ha_disabled_reasons: {
    NO_VOLUME: T('No pools are configured.'),
    NO_VIP: T('No interfaces configured with Virtual IP.'),
    NO_SYSTEM_READY: T(`Other ${globalHelptext.ctrlr} has not finished booting.`),
    NO_PONG: T(`Other ${globalHelptext.ctrlr} cannot be reached.`),
    NO_FAILOVER: T('Failover is administratively disabled.'),
    NO_LICENSE: T(`Other ${globalHelptext.ctrlr} has no license.`),
    DISAGREE_CARP: T('Nodes CARP states do not agree.'),
    MISMATCH_DISKS: T(`The ${globalHelptext.ctrlrs} do not have the same quantity of disks.`),
    NO_CRITICAL_INTERFACES: T('No network interfaces are marked critical for failover.'),
  },
  updateRunning_dialog: {
    title: T('Update in Progress'),
    message: T('A system update is in progress. It might have been \
 launched in another window or by an external source.'),
    message_pt2: T(` <b>${globalHelptext.sys_update_message}</b> `),
  },

  mat_tooltips: {
    about: T('About FreeCORE'),
    toggle_hide: T('Toggle Hide/Open'),
    toggle_collapse: T('Toggle Collapse'),
    update: T('Update in Progress'),
    pending_network_changes: T('Pending Network Changes'),
    directory_services_monitor: T('Directory Services Monitor'),
    resilvering: T('Resilvering'),
    replication: T('Replication'),
    task_manager: T('Task Manager'),
    alerts: T('Alerts'),
    settings: T('Settings'),
    power: T('Power'),
  },

};
