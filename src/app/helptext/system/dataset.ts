import { T } from 'app/translate-marker';

export const helptext_system_dataset = {
  metadata: {
    fieldsets: [T('Configure System Dataset')],
  },
  pool: {
    placeholder: T('System Dataset Pool'),
    tooltip: T('Select the pool to contain the system dataset.'),
  },
  syslog: {
    placeholder: T('Syslog'),
    tooltip: T('Store system logs on the system dataset. Unset to store\
 system logs in <i>/var/</i> on the operating system device.'),
  },
  syslog_warning: {
    title: T('WARNING'),
    message: T('The Passive controller must be rebooted in order to change the location of system logs.'),
  },
  pool_warning: {
    title: T('WARNING'),
    message: T('The Passive controller must be rebooted in order to change the location of the system dataset.'),
  },
  // the internal development record
  return_warning: {
    title: T('End the Return to TrueNAS CORE 13.3'),
    message: T('Moving the system dataset to another pool destroys the snapshots of the system dataset that the\
 return to TrueNAS CORE 13.3 restores. After the move you will not be able to go back to 13.3. There is no undo.'),
    button: T('Move and End the Return'),
  },
};
