// the internal development record — closure grep gate for the 15.2 page-alignment pass (waves #412-#418).
// Hard failures (exit 1):
//   (1) a page sheet (src/app/**/*.css|scss outside src/app/ui) that re-centres or re-caps a page
//       (`margin: 0 auto`, `max-width: 960`) or keys a private rule on `h1` -- the shell owns
//       those (.fc-page / .fc-page--capped / .fc-page-title in freecore-ui.css).
//   (2) an unlayered rule in a global or page sheet whose selector is keyed on a page id/class
//       (#…-page, .fc-…, app-…, entity-…) AND selects a bare `button` -- the #396 trap: Tailwind's
//       tiers live in @layer utilities, so any unlayered rule wins over an hlmBtn tier regardless
//       of specificity.
// Counted warnings (never exit 1 on their own, but the count must not grow past BASELINE):
//   (3) mat-button / mat-flat-button / mat-raised-button / mat-stroked-button / mat-icon-button /
//       mat-mini-fab / mat-fab in app templates -- .html files and, since the internal development record, the inline
//       `template:` strings of non-spec .ts files (IPMI's scope card hid there),
//   (4) <mat-card> surfaces,  (5) <h1> that is not .fc-page-title / .fc-settings-title /
//       .fc-status-title,  (6) bare-button rules in page sheets that carry no page key (the
//       entity-table size tweaks),  (7) a Material tooltip attribute (matTooltip= / [matTooltip] /
//       matTooltipPosition / mat-mdc-tooltip) in an app .html template -- the internal development record moved
//       every tooltip to the helm directive (hlmTooltip); the action-model key `matTooltip:` in
//       .ts confs is not scanned.  (8) a <mat-toolbar-row> in an app template -- the internal development record
//       moved the dashboard widget header strips to div.fc-card-header; the topbar's row is the one
//       left (the shell wave).  (9) Material form controls in an app template -- <mat-checkbox>,
//       <mat-form-field>, a matInput attribute, <mat-select> / <mat-option>, <mat-radio-*>; the internal development record
//       retired their modules after #469-#471 moved the last users to the kit.
//       (10) the Material list family (<mat-list>, <mat-nav-list>, <mat-selection-list>, <mat-list-item>,
//       <mat-list-option>) and <mat-spinner> / <mat-progress-spinner> -- the internal development record-#477.
//       (11) Material tabs -- <mat-tab-group> / <mat-tab> / <mat-tab-nav-panel>, a mat-tab-nav-bar /
//       mat-tab-link / mat-tab-label / matTabContent attribute; the internal development record-#481 (nav[fcTabNav], brain tabs).
//       (12) <mat-slider> / a matSliderThumb input -- the internal development record (the kit slider, src/app/ui/slider).
//       (13) <mat-accordion> / <mat-expansion-panel*> / <mat-panel-*> / <mat-action-row> -- the internal development record (brain
//       collapsible + fcAccordion / fcExpansionHeader).
//       (14) <mat-toolbar> -- the internal development record moved the topbar to div.fc-toolbar (the row counter (8) went to 0
//       with it; the entity-table's `mat-toolbar` class on a plain div is a CSS hook, not counted).
//       (15) <mat-divider> -- the internal development record (the sidebar's two, never rendered: no menu item is a separator).
//       (16) <mat-sidenav*> / <mat-drawer*> -- the internal development record (fc-drawer-container / fc-drawer / fc-drawer-content).
// Usage: node scripts/spartan-closure-check.mjs [src]   (exit 1 on a hard failure or a grown count)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] || 'src';
const rel = (p) => relative(process.cwd(), p);

// Deliberate exceptions: [file (relative to cwd), selector exactly as this script prints it, reason].
// An entry allows exactly one rule (plus its @media twins); a new rule with the same shape is still a failure.
const ALLOW = [
  // (1) margin: 0 auto that centres a control inside its cell, not a page
  ['src/app/pages/common/entity/entity-tree-table/entity-tree-table.component.css', '.entity-tree-table__actions-column .row-kebab', 'the internal development record: the 32px kebab centred in its 56px column'],
  ['src/app/pages/common/entity/entity-form/components/form-permissions/form-permissions.css', '.form-permissions-matrix .checkbox-cell', 'checkbox centred under its header word'],
  ['src/app/pages/common/entity/entity-form/components/form-scheduler/form-scheduler.component.css', 'table.check-grid', 'the month/weekday grid centred in the popup'],
  ['src/app/pages/common/entity/entity-form/components/form-scheduler/form-scheduler.component.css', 'table.check-grid .checkbox-cell', 'checkbox centred in its 44px cell'],
  // (2) page-keyed bare button rules that are the law itself, not a repaint of a tier
  ['src/assets/styles/freecore-status.css', '.fc-status-actions button', 'STATUS law (the internal development record): the status action pill is a bare button by design'],
  ['src/assets/styles/freecore-status.css', '.fc-status-actions button:hover', 'STATUS law (the internal development record)'],
  ['src/assets/styles/themes/ix-blue.scss', ".ix-blue app-dataset-acl button[id='cust_button_Select an ACL Preset']", 'placement only (position/top/left), amended by the internal development record; paints nothing the tier owns'],
  ['src/app/pages/common/entity/entity-table/entity-table.component.scss', '.fc-records #config > button', 'the internal development record: the columns picker on the toolbar 32px line, a size tweak on the ghost tier'],
];
const used = new Set();
const allowed = (file, sel) => {
  const hit = ALLOW.find(([f, s]) => f === file && s === sel.trim());
  if (hit) { used.add(hit); console.log(`allow ${file}  ${sel.trim().replace(/\s+/g, ' ')}  -- ${hit[2]}`); }
  return !!hit;
};

// ---- file walk -------------------------------------------------------------------------------
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const all = walk(root);
const pageSheets = all.filter((p) => /\.(css|scss)$/.test(p) && p.startsWith(join(root, 'app')) && !p.startsWith(join(root, 'app', 'ui')));
const globalSheets = all.filter((p) => /\.(css|scss)$/.test(p) && p.startsWith(join(root, 'assets', 'styles')) && !p.includes('scss-imports'));
const templates = all.filter((p) => p.endsWith('.html') && p.startsWith(join(root, 'app')) && !p.startsWith(join(root, 'app', 'ui')));

// ---- css rule walk: yields {sel, own, line, layered} for every rule, nesting-aware (scss) -------
function* rules(src) {
  // comments blanked, lines preserved (`^\s*//` would eat blank lines and shift every line number);
  // a trailing `// …` after a declaration or brace goes too (guarded so `url(http://…)` survives)
  const css = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/^[ \t]*\/\/.*$/gm, '').replace(/(?<=[\s;{}])\/\/.*$/gm, '');
  const stack = []; // enclosing selectors / at-rules
  let buf = ''; let bufStart = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      const sel = buf.trim(); buf = '';
      let j = i + 1; let d = 1;
      while (j < css.length && d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
      const body = css.slice(i + 1, j - 1);
      const line = css.slice(0, bufStart).split('\n').length;
      if (sel.startsWith('@')) {
        if (/^@(media|supports|layer|container)/.test(sel)) { stack.push(sel); continue; }
        i = j - 1; continue; // @font-face, @keyframes, @include, @mixin: skip the body
      }
      const parents = stack.filter((s) => !s.startsWith('@'));
      const layered = stack.some((s) => s.startsWith('@layer'));
      const full = parents.length ? sel.split(',').map((s) => `${parents.join(' ')} ${s.trim()}`).join(', ') : sel;
      const own = body.replace(/[^{}]*\{[\s\S]*?\}/g, (m) => (m.includes('{') ? '' : m)); // own declarations = body minus nested blocks
      yield { sel: full, own, line, layered };
      if (/\{/.test(body)) { stack.push(sel); } else { i = j - 1; }
    } else if (c === '}') {
      stack.pop(); buf = '';
    } else if (c === ';') { buf = ''; // a declaration before a nested block is not part of the next selector
    } else { if (!buf.trim()) bufStart = i; buf += c; }
  }
}

// a page key: an id ending in -page, an .fc- class, or an app-/entity- element (a component host)
const PAGE_KEY = /(^|[\s>+~(])(#[\w-]+-page\b|\.fc-[\w-]+|app-[\w-]+|entity-[\w-]+)(?![\w-])/;
// the parts of a selector list whose subject is a bare button: `button` (or a helm button host, [data-slot=button]) with no
// class and no [role] attribute (an ARIA control); pseudo-classes allowed
const bareButtonParts = (sel) => sel.split(',').map((s) => s.trim()).filter((part) => {
  const safe = part.replace(/\[[^\]]*\]/g, (m) => m.replace(/[\s>+~]/g, '_')); // an attribute value may hold spaces
  const compounds = safe.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  const last = compounds[compounds.length - 1] || '';
  // the internal development record review: `button[hlmBtn]` / `[data-slot=button]` subjects are exactly what the #396 trap repaints, so they
  // count as bare; only role= (native landmarks) is exempt, and a `:not(...)` wrapper never makes a compound classed.
  const subject = last.replace(/:not\([^)]*\)/g, '');
  return /^(button|\[data-slot="?button"?\])(?![\w-])/.test(subject) && !/\./.test(subject) && !/\[role/i.test(subject);
});

let hard = 0; const warn = [];
const fail = (file, line, what, sel) => { hard++; console.log(`FAIL ${file}:${line}  ${what}  ${sel}`); };

// (1)
for (const p of pageSheets) {
  const file = rel(p);
  for (const r of rules(readFileSync(p, 'utf8'))) {
    const decl = r.own;
    if (/margin\s*:\s*0(px)?\s+auto\b/.test(decl)) { if (!allowed(file, r.sel)) fail(file, r.line, 'margin: 0 auto (page centring)', r.sel); }
    if (/max-width\s*:\s*960/.test(decl)) { if (!allowed(file, r.sel)) fail(file, r.line, 'max-width: 960 (page cap)', r.sel); }
    if (r.sel.split(',').some((s) => /(^|[\s>+~])h1(?![\w-])/.test(s.trim()))) { if (!allowed(file, r.sel)) fail(file, r.line, 'private h1 rule', r.sel); }
  }
}
// (2) + (6)
for (const p of [...globalSheets, ...pageSheets]) {
  const file = rel(p);
  for (const r of rules(readFileSync(p, 'utf8'))) {
    if (r.layered) continue;
    for (const part of bareButtonParts(r.sel)) {
      if (PAGE_KEY.test(part)) { if (!allowed(file, part)) fail(file, r.line, 'unlayered page-keyed bare button (#396 trap)', part); }
      else if (pageSheets.includes(p)) warn.push(['bare-button-rule', `${file}:${r.line}  ${part.replace(/\s+/g, ' ')}`]);
    }
  }
}
// (3)(4)(5)(7)(8)(9) on templates (.html files + inline `template:` strings), html comments stripped
const MAT_BTN = /\b(mat-button|mat-flat-button|mat-raised-button|mat-stroked-button|mat-icon-button|mat-mini-fab|mat-fab)\b/g;
const MAT_TIP = /\[matTooltip\w*\]|\bmatTooltip\w*=|mat-mdc-tooltip/g;
const inlineHosts = all.filter((p) => p.endsWith('.ts') && !p.endsWith('.spec.ts') && p.startsWith(join(root, 'app')) && !p.startsWith(join(root, 'app', 'ui')));
const templateSources = [
  ...templates.map((p) => ({ file: rel(p), text: readFileSync(p, 'utf8'), base: 0 })),
  ...inlineHosts.flatMap((p) => {
    const ts = readFileSync(p, 'utf8');
    return [...ts.matchAll(/\btemplate\s*:\s*`((?:[^`\\]|\\.)*)`/g)].map((m) => ({
      file: rel(p), text: m[1], base: ts.slice(0, m.index + m[0].indexOf('`') + 1).split('\n').length - 1,
    }));
  }),
];
for (const { file, text, base } of templateSources) {
  const html = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const lineOf = (idx) => base + html.slice(0, idx).split('\n').length;
  for (const m of html.matchAll(/<(button|a)\b[^>]*>/g)) { const hit = m[0].match(MAT_BTN); if (hit) warn.push(['mat-button', `${file}:${lineOf(m.index)}  ${hit[0]}`]); }
  for (const m of html.matchAll(/<mat-card(?=[\s>])[^>]*>/g)) warn.push(['mat-card', `${file}:${lineOf(m.index)}  ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`]);
  for (const m of html.matchAll(/<h1\b[^>]*>/g)) { if (!/class="[^"]*\b(fc-(page|settings|status)-title|signin-brand)\b/.test(m[0])) warn.push(['h1', `${file}:${lineOf(m.index)}  ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`]); }
  for (const m of html.matchAll(MAT_TIP)) warn.push(['mat-tooltip', `${file}:${lineOf(m.index)}  ${m[0]}`]);
  for (const m of html.matchAll(/<mat-toolbar-row(?=[\s>])[^>]*>/g)) warn.push(['mat-toolbar-row', `${file}:${lineOf(m.index)}  ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`]);
  for (const [k, re] of [['mat-checkbox', /<mat-checkbox(?=[\s>])[^>]*>/g], ['mat-form-field', /<mat-form-field(?=[\s>])[^>]*>/g],
    ['matInput', /<(input|textarea)\b[^>]*\bmatInput\b[^>]*>/g], ['mat-select', /<mat-(select|option)(?=[\s>])[^>]*>/g],
    ['mat-radio', /<mat-radio-(group|button)(?=[\s>])[^>]*>/g],
    ['mat-list', /<mat-(list|nav-list|selection-list|list-item|list-option)(?=[\s>])[^>]*>/g], ['mat-spinner', /<mat-(spinner|progress-spinner)(?=[\s>])[^>]*>/g],
    ['mat-tab', /<mat-tab(-group|-nav-panel)?(?=[\s>])[^>]*>|<[a-z][\w-]*\b[^>]*\b(mat-tab-nav-bar|mat-tab-link|matTabLink|mat-tab-label|matTabContent)\b[^>]*>/g],
    ['mat-slider', /<mat-slider(?=[\s>])[^>]*>|<input\b[^>]*\bmatSlider(Thumb|StartThumb|EndThumb)\b[^>]*>/g],
    ['mat-expansion', /<mat-(accordion|expansion-panel|expansion-panel-header|panel-title|panel-description|action-row)(?=[\s>])[^>]*>/g],
    ['mat-toolbar', /<mat-toolbar(?=[\s>])[^>]*>/g], ['mat-divider', /<mat-divider(?=[\s>])[^>]*>/g],
    ['mat-sidenav', /<mat-(sidenav|sidenav-container|sidenav-content|drawer|drawer-container|drawer-content)(?=[\s>])[^>]*>/g]]) {
    for (const m of html.matchAll(re)) warn.push([k, `${file}:${lineOf(m.index)}  ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`]);
  }
}

// Baselines: the counts on the day the gate landed. A wave that removes offenders lowers the
// number here in the same commit; a wave that adds one fails the gate.
const BASELINE = { 'mat-button': 0, 'mat-card': 0, 'h1': 0, 'bare-button-rule': 0, 'mat-tooltip': 0, 'mat-toolbar-row': 0, 'mat-checkbox': 0, 'mat-form-field': 0, 'matInput': 0, 'mat-select': 0, 'mat-radio': 0, 'mat-list': 0, 'mat-spinner': 0, 'mat-tab': 0, 'mat-slider': 0, 'mat-expansion': 0, 'mat-toolbar': 0, 'mat-divider': 0, 'mat-sidenav': 0 }; // the internal development record moves the dashboard widget frames off mat-card (and drops the dead flip side's mat-button); #468 adds mat-toolbar-row at 1 (the topbar); #472 adds the form controls at 0; #475 mat-list at 14 and mat-spinner at 0, #478 mat-list at 4 (the shell navigation; widget-nic deleted); #481 mat-tab at 0; #482 mat-slider at 0; #483 mat-expansion at 0; #484 mat-toolbar-row 1 -> 0 (the topbar) and mat-toolbar at 0; #485 mat-list 4 -> 0 (the shell navigation) and mat-divider at 0; #486 mat-sidenav at 0; the gate fails only on growth
const counts = {};
for (const [k, line] of warn) { counts[k] = (counts[k] || 0) + 1; console.log(`warn ${k}  ${line}`); }
let grown = false;
for (const k of Object.keys(BASELINE)) {
  const n = counts[k] || 0; const over = n > BASELINE[k]; grown ||= over;
  console.log(`${over ? 'GROWN' : 'count'} ${k}: ${n} (baseline ${BASELINE[k]})`);
}
// a stale entry is a failure too: the wave that deletes the rule deletes its exception in the same commit
for (const a of ALLOW) if (!used.has(a)) { hard++; console.log(`FAIL stale allowlist entry (no rule matches it): ${a[0]}  ${a[1].replace(/\s+/g, ' ')}`); }
console.log(`${hard} hard failure(s)`);
process.exit(hard || grown ? 1 : 0);
