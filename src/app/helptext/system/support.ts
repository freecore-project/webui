import { T } from 'app/translate-marker';

// the internal development record: this file used to carry the whole iX support surface --
// Proactive Support ("automatically emails iXsystems…"), the Jira ticket form
// (type/category/subject/attach-debug), enterprise licence-update dialogs and
// production-status strings. Every consumer of those keys was removed with the
// ticket-submission surface, so only the System Information blurb remains.
export const helptext_system_support = {
  FN_instructions: T('Search the <a href="https://codeberg.org/freecore/freecore/issues" \
   target="_blank">FreeCORE issue tracker</a> \
   to ensure the issue has not already been reported before \
   filing a bug report or feature request. If an issue has \
   already been created, add a comment to the existing issue. \
   FreeCORE is an independent fork of TrueNAS&reg; CORE 13.3 and is not \
   supported by iXsystems &mdash; please do not report FreeCORE issues to them.'),
};
