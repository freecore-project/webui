import { ApplicationCatalogEntry } from './applications.types';

/** the internal development record: the catalog glyph rules, shared by the page and the strip. */
export function catalogIcon(entry: ApplicationCatalogEntry): string | null {
  const icon = (entry.icon || '').trim();
  return /^(https?:\/\/|\/|assets\/|data:image\/|blob:)/i.test(icon) ? icon : null;
}

export function catalogMaterialIcon(entry: ApplicationCatalogEntry): string {
  return ({ ':material-email:': 'email', ':material-speedometer:': 'speed' })[entry.icon] || 'extension';
}
