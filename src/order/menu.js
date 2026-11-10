// Cardápio que a página /pedir/ realmente usa. De onde ele vem, em ordem:
//   1. a planilha do Google (siteConfig.orders.menuSheet), baixada a cada visita;
//   2. se a planilha não responder: o último cardápio salvo neste aparelho (até 3 dias);
//   3. sem planilha configurada: o cardápio fixo de src/order/orderMenu.js.
// Com a planilha configurada e sem nenhuma dessas cópias, o cardápio fica vazio e a página avisa (nunca mostra o de demonstração
// no lugar do real). Usa "top-level await": a página só aparece depois que o cardápio chegou (no máximo ~6 segundos).
import { siteConfig } from '../siteConfig.js';
import { orderMenu as bundledMenu, orderCategories as bundledCategories } from './orderMenu.js';
import { fetchSheetMenu } from './sheetMenu.js';

const CACHE_KEY = 'gula-menu-sheet-v1';
const CACHE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const readCache = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (saved && Array.isArray(saved.products) && saved.products.length && Date.now() - saved.savedAt < CACHE_MAX_AGE) return saved;
  } catch { /* sem armazenamento */ }
  return null;
};
const writeCache = (products, categories) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), products, categories })); } catch { /* sem armazenamento */ }
};

async function loadMenu() {
  const sheet = siteConfig.orders.menuSheet;
  if (!sheet?.products) return { products: bundledMenu, categories: bundledCategories, source: 'bundled', problems: [] };

  const result = await fetchSheetMenu({
    sheet,
    fetchText,
    fallbackImage: siteConfig.brand.logoPath,
    photoKeys: Object.keys(siteConfig.photos),
  });
  if (result.ok) {
    const { products, categories, problems, warnings } = result.menu;
    writeCache(products, categories);
    if (problems.length || warnings.length) console.warn('[cardápio da planilha]', [...problems, ...warnings].join('\n'));
    return { products, categories, source: 'sheet', problems };
  }

  console.warn('[cardápio da planilha]', result.error);
  const cached = readCache();
  if (cached) return { products: cached.products, categories: cached.categories, source: 'cache', savedAt: cached.savedAt, problems: [result.error] };
  return { products: [], categories: [{ id: 'all', label: 'Todos' }], source: 'unavailable', problems: [result.error] };
}

const loaded = await loadMenu();

export const orderMenu = loaded.products;
export const orderCategories = loaded.categories;
/** 'sheet' (planilha), 'cache' (última cópia salva no aparelho), 'bundled' (cardápio fixo do projeto) ou 'unavailable' (planilha configurada e fora do ar). */
export const menuSource = loaded.source;
export const menuSavedAt = loaded.savedAt || null;
