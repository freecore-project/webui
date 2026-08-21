import { Validators } from '@angular/forms';
import globalHelptext from 'app/helptext/global-helptext';
import { T } from 'app/translate-marker';

export const helptext_system_update = {
  version: {
    paraText: T('<b>Current Version:</b> '),
  },

  scaleUpdate: {
    title: T('Updating to SCALE'),
    warning: T(`<p>TrueNAS SCALE migrations are still in development and can risk configuration errors or even data loss.
    Please back up any critical data to an external system before attempting the migration. Migrating to SCALE is intended to be a one-time event.
    Reverting back to CORE after migration is unsupported.</p>

    <p>These CORE configuration items cannot migrate to SCALE:</p>
    <p>
      <ul>
        <li>&mdash; NIS Data</li>
        <li>&mdash; Jails/Plugins</li>
        <li>&mdash; Tunables</li>
        <li>&mdash; System Boot Environments</li>
        <li>&mdash; GELI encrypted pools</li>
        <li>&mdash; AFP Shares</li>
      </ul>
    </p>

    <p>For more details, please see the
    <a href="https://www.truenas.com/docs/scale/gettingstarted/migratingfromcore/" target="_blank" style="text-decoration: underline;">CORE migration documentation</a>.
    Please ensure the system is prepared for the migration and review the system configuration post-migration
     to immediately resolve any configuration issues that might have occurred.</p>`),
    haWarning: T(`Migrating a High Availability (HA) system from TrueNAS CORE to TrueNAS SCALE requires the entire
    system go offline for some time to migrate and synchronize both controllers on the new operating system.
    It is strongly recommended to contact iXsystems Support for assistance with the migration process.
    Before migrating, please back up any critical data and schedule the system outage accordingly.
    In the unlikely event of an error during migration, please be prepared to activate a previous system boot environment.`),
  },

  filelocation: {
    placeholder: T('Update File Temporary Storage Location'),
    tooltip: T(
      'The update file is temporarily stored here before being applied.',
    ),
    validation: [Validators.required],
  },

  filename: {
    placeholder: T('Update File'),
    tooltip: T(
      'The file used to manually update the system. Browse to\
 the update file stored on the system logged into the\
 web interface to upload and apply. Update file names\
 end with <i>-manual-update-unsigned.tar</i>',
    ),
  },

  rebootAfterManualUpdate: {
    placeholder: T('Reboot After Update'),
    tooltip: T('Automatically reboot the system after the update\
 is applied.'),

    manual_reboot_msg: T('Update successful. Please reboot for the update to take effect. Reboot now?'),
  },

  manual_update_action: T('Manual Update'),
  manual_update_description: T('Uploading file...'),

  secretseed: {
    placeholder: T('Include Password Secret Seed'),
  },

  save_config_form: {
    button_text: T('Save'),
  },

  manual_update_error_dialog: {
    message: T('Error submitting file'),
  },

  sysUpdateMessage: globalHelptext.sys_update_message,

  ha_update: {
    complete_title: T('Complete the Upgrade'),
    complete_msg: T('The standby controller has finished upgrading. To complete the update process, \
 failover to the standby controller.'),
    complete_action: T('Close'),
  },

  save_config_err: {
    title: T('Error Saving Configuration Settings'),
    message: T('System failed to save configuration settings. Check the network connection. \
 To proceed with the system upgrade <b>without</b> saving a current backup of the configuration setting, select \
 the <i>Confirm</i> checkbox and click <i>Proceed with Update</i>.'),
    button_text: T('Proceed with Update'),
  },

  non_ha_download_msg: T('Continue with download?'),
  ha_download_msg: T('Upgrades both controllers. Files are downloaded to the Active Controller\
 and then transferred to the Standby Controller. The upgrade process starts concurrently on both TrueNAS Controllers.\
 Continue with download?'),
  non_ha_confirm_msg: T('Apply updates and reboot system after downloading.'),
  ha_confirm_msg: T('Check the box for full upgrade. Leave unchecked to download only.'),

  pending_title: T('Apply Pending Updates'),
  non_ha_pending_msg: T('The system will reboot and be briefly unavailable while applying updates. \
Apply updates and reboot?'),
  ha_pending_msg: T('Upgrades both controllers. Files are downloaded to the Active Controller \
and then transferred to the Standby Controller. The upgrade process starts concurrently on both TrueNAS Controllers.'),

  rollback: {
    title: T('Rollback to the captured system?'),
    action: T('Rollback'),
    confirmation: T(`<p><b>This operation discards system, jail, and plugin changes made after the capture.</b></p>
      <ul>
        <li>Restores the system dataset and complete iocage tree to the capture timestamp.</li>
        <li>Discards post-upgrade jail, plugin, and system-setting changes stored there.</li>
        <li>Does not restore unrelated user datasets.</li>
        <li>Returns jails and plugins to their captured 13.3 state; legacy plugin software may contain known vulnerabilities.</li>
        <li>Activates the captured origin boot environment and reboots the system.</li>
      </ul>
      <p>Rollback is no longer possible after an incompatible pool upgrade or after the capture is removed.</p>`),
    remove_title: T('Remove the captured return?'),
    remove_action: T('Remove'),
    remove_confirmation: T(`<p><b>This permanently removes the ability to return to TrueNAS CORE 13.3.</b></p>
      <ul>
        <li>Destroys the coordinated system-dataset and iocage snapshots.</li>
        <li>Removes the keep pin from the 13.3 boot environment. It does not delete that boot environment or immediately free its deletion estimate.</li>
        <li>Snapshot space can be released as the snapshots are destroyed. ZFS space accounting can change while data diverges.</li>
        <li>The captured return otherwise persists with no automatic expiry, unless a confirmed pool feature upgrade forfeits it.</li>
        <li>There is no undo.</li>
      </ul>`),
    retry_cleanup_title: T('Retry captured-return cleanup?'),
    retry_cleanup_action: T('Retry'),
    retry_cleanup_confirmation: T(`<p>The return is already closed, but some snapshots or the boot-environment keep pin still remain.</p>
      <ul>
        <li>Retries destruction of only the snapshots recorded for this captured return.</li>
        <li>Retries removing the keep pin from the origin boot environment without deleting the boot environment.</li>
      </ul>`),
  },

};
