import { T } from '../../translate-marker';

export default {
  globalConfig: {
    tooltip: T('Choose Pool for Plugin and Jail Manager'),
  },
  activatePoolDialog: {
    title: T('Choose Pool for Plugin and Jail Storage'),
    // the internal development record: names the field, not the task. It was a full sentence
    // repeating the dialog title, and since the internal development record promotes a placeholder to
    // the floating label it became the label too. 'Data Pool' is what the
    // Bastille Settings dialog calls the identical thing.
    selectedPool_placeholder: T('Data Pool'),
    saveButtonText: T('Choose'),
    successInfoDialog: {
      title: T('Pool Chosen'),
      message: T('Using pool '),
    },
  },
  updateConfirmDialog: {
    title: T('Update Jail'),
    messageA: T('Update the jail operating system for '),
    messageB: T(' to the latest available patch?'),
  },
};
