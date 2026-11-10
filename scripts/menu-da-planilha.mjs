// Baixa o cardápio da planilha do Google no Node, para as verificações (`npm run check:*`) e para o build (SEO).
// Mesmas regras da página /pedir/ (src/order/sheetMenu.js). Endereços que começam com "/" são lidos da pasta public/ (útil em testes).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/siteConfig.js';
import { fetchSheetMenu } from '../src/order/sheetMenu.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

async function fetchText(url) {
  if (url.startsWith('/')) return readFile(path.join(publicDir, url), 'utf8');
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** { configured: false } sem planilha; senão { configured: true, ok, menu?, error? } (mesmo formato de fetchSheetMenu). */
export async function loadSheetMenuForNode() {
  const sheet = siteConfig.orders.menuSheet;
  if (!sheet?.products) return { configured: false };
  const result = await fetchSheetMenu({ sheet, fetchText, fallbackImage: siteConfig.brand.logoPath, photoKeys: Object.keys(siteConfig.photos) });
  return { configured: true, ...result };
}
