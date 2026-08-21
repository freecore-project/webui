# Icon font

One font: **Material Symbols Outlined** (Google, Apache-2.0 — see `LICENSE`), shipped as a
static instance at the FreeCORE brand axes locked in round 3 (2026-09-13):

    FILL 0 · wght 300 · GRAD -25 · opsz 20

All 4,284 icons are included (433 KB woff2) so any ligature name in
`MaterialSymbolsOutlined.codepoints` works without regenerating the font. Use it as
`<mat-icon>name</mat-icon>`; the `.material-icons` class is MatIcon's default font set and
points here. No second icon font: `mdi` was retired in the internal development record.

## Rebuild

From the upstream variable font
(`google/material-design-icons`, `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2`):

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont('MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2')
inst = instancer.instantiateVariableFont(f, {'FILL': 0, 'wght': 300, 'GRAD': -25, 'opsz': 20}, inplace=False)
inst.flavor = 'woff2'
inst.save('MaterialSymbolsOutlined-w300-fill0-grad-25-opsz20.woff2')
```

(`pip install 'fonttools[woff]'`.) Copy the matching `.codepoints` file alongside. Changing
the axes is a brand decision (`freecore-brand/tokens/tokens.json` → `shell.icon.axes`).
