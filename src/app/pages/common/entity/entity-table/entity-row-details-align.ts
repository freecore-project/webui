/**
 * the internal development record: the band starts where the row's text starts. A table with a checkbox
 * column (multiSelect) has its first content cell 85px in; every cell carries 12px of padding
 * (the records law) and its label div another 8px (ngx), which is also where the header's label
 * starts. Measured from the row rather than written down, so a first column of any width keeps
 * the band's text under the row's and the header's text. The inset lands in `--band-inset` on the band
 * host; the stylesheet reads it as the start padding.
 */
export function alignBandToContent(host: HTMLElement, multiSelect: boolean): void {
  const row = host.closest('datatable-row-wrapper')?.querySelector('datatable-body-row') as HTMLElement | null;
  if (!row) { return; }
  const cells = Array.from(row.querySelectorAll('datatable-body-cell')) as HTMLElement[];
  const cell = cells[multiSelect ? 1 : 0] || cells[0];
  if (!cell) { return; }
  // the text sits inside the cell's label div, which carries its own start padding (ngx's 8px)
  const label = cell.querySelector('.datatable-body-cell-label') as HTMLElement | null;
  const inset = cell.getBoundingClientRect().left - row.getBoundingClientRect().left
    + (parseFloat(getComputedStyle(cell).paddingLeft) || 0)
    + (label ? parseFloat(getComputedStyle(label).paddingLeft) || 0 : 0);
  if (!Number.isFinite(inset) || inset < 0) { return; }
  host.style.setProperty('--band-inset', `${Math.round(inset)}px`);
}
