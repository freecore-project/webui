import { Validators } from '@angular/forms';
import { T } from '../../../translate-marker';

export default {
  rar2fs_fieldset_general: T('General Options'),
  rar2fs_fieldset_advanced: T('Advanced Options'),

  rar2fs_source_placeholder: T('Source Directory'),
  rar2fs_source_tooltip: T('Directory containing RAR archives and regular files to expose through rar2fs.'),

  rar2fs_mountpoint_placeholder: T('Mountpoint'),
  rar2fs_mountpoint_tooltip: T('Absolute path where rar2fs presents the mounted view. The default is <i>/media</i>.'),

  rar2fs_seek_length_placeholder: T('Seek Length'),
  rar2fs_seek_length_tooltip: T('rar2fs seek index length. The default is <i>0</i>.'),
  rar2fs_seek_length_validation: [Validators.required, Validators.min(0)],

  rar2fs_allow_other_placeholder: T('Allow Other Users'),
  rar2fs_allow_other_tooltip: T('Passes <i>-o allow_other</i> so services other than rar2fs can read the mounted view.'),

  rar2fs_create_mountpoint_placeholder: T('Create Mountpoint'),
  rar2fs_create_mountpoint_tooltip: T('Create the mountpoint directory when the service starts.'),

  rar2fs_extra_options_placeholder: T('Advanced rar2fs Options'),
  rar2fs_extra_options_tooltip: T('Optional additional rar2fs arguments. Do not include source, mountpoint, --seek-length, or allow_other here.'),
};
