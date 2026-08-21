// the internal development record — Tailwind utility shadow check for the 15.2 spartan foundation.
// Lists every utility selector Tailwind emitted into the built stylesheet whose class name an
// app template (outside src/app/ui) already uses. Any hit is a regression: the utility is
// unlayered and last in the cascade, so it overrides the app's own styling for that class.
// Usage: node scripts/spartan-shadow-check.mjs [dist]   (exit 1 on any hit)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
const sheet = readdirSync(dist).find((f) => /^styles\..*\.css$/.test(f));
if (!sheet) { console.error(`no styles.*.css in ${dist}`); process.exit(2); }
const css = readFileSync(join(dist, sheet), 'utf8');
const start = css.indexOf('@layer theme');
if (start < 0) { console.error('tailwind section not found in the sheet'); process.exit(2); }
// `cdk-overlay-*` rules in this region are freecore-spartan.css's deliberate backdrop restoration, not utilities.
const emitted = new Set([...css.slice(start).matchAll(/(?:^|[},])\.([a-z0-9][a-z0-9-]*)\{/g)].map((m) => m[1]).filter((c) => !c.startsWith('cdk-overlay')));

const used = new Map();
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (p !== 'src/app/ui') walk(p); continue; }
    if (!name.endsWith('.html')) continue;
    for (const m of readFileSync(p, 'utf8').matchAll(/class="([^"]*)"/g)) {
      for (const t of m[1].split(/\s+/)) {
        if (/^[a-z0-9][a-z0-9-]*$/.test(t)) (used.get(t) ?? used.set(t, new Set()).get(t)).add(p);
      }
    }
  }
};
walk('src/app');

const hits = [...used.keys()].filter((c) => emitted.has(c)).sort();
console.log(`${sheet}: ${emitted.size} emitted utility selectors, ${used.size} app template classes, ${hits.length} shadowed`);
for (const h of hits) console.log(`  .${h}  <-  ${[...used.get(h)].slice(0, 3).join(', ')}`);

// The reverse collision (the internal development record): the app's own CSS defines helper classes with the
// same names as Tailwind utilities (egret's `.mb-1 { margin-bottom: 1rem !important }`), and an
// !important app rule beats the utility on a helm host. Any emitted utility whose selector the app
// CSS also defines is listed; with !important it is a hit.
const appCss = css.slice(0, start);
const hijacked = [];
for (const c of emitted) {
  const re = new RegExp(`(?:^|[},\\s])\\.${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{([^}]*)\\}`, 'g');
  let m; let important = false; let defined = false;
  while ((m = re.exec(appCss))) { defined = true; if (/!important/.test(m[1])) important = true; }
  if (defined) hijacked.push({ c, important });
}
const hard = hijacked.filter((h) => h.important);
console.log(`${hijacked.length} emitted utilities also defined by app CSS, ${hard.length} with !important (hijacked)`);
for (const h of hijacked) console.log(`  .${h.c}${h.important ? '  !important  <- HIJACKED' : ''}`);
process.exit(hits.length || hard.length ? 1 : 0);
