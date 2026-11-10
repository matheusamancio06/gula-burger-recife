// SEO e prévia de compartilhamento: gera as tags do <head>, os dados estruturados (JSON-LD), o robots.txt e o sitemap.xml.
// Funções puras, a partir de src/siteConfig.js. Usado pelo vite.config.js (no build e no dev) e pelo `npm run check:seo`.
// Nada aqui inventa informação: só entra no Google o que está preenchido na configuração.

const DAY_NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeXml = escapeHtml;

/** Endereço do site sem barra no final, ou null se não foi informado / não é um endereço válido. */
export function normalizeSiteUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export const absoluteUrl = (siteUrl, path) => (siteUrl ? `${siteUrl}${path.startsWith('/') ? path : `/${path}`}` : null);

/**
 * O Google pode indexar o site?
 *  'auto'  só quando não há mais conteúdo demonstrativo; true/false forçam.
 * demoCounts: { order: n, showcase: n } = quantos itens ainda têm isDemo.
 */
export function resolveIndexing(seo, demoCounts) {
  const mode = seo?.indexing ?? 'auto';
  if (mode === true) return { allowed: true, reason: 'forçado em siteConfig.seo.indexing = true' };
  if (mode === false) return { allowed: false, reason: 'desligado em siteConfig.seo.indexing = false' };
  const demo = (demoCounts?.order || 0) + (demoCounts?.showcase || 0);
  return demo > 0
    ? { allowed: false, reason: `ainda há conteúdo demonstrativo (${demoCounts.showcase || 0} item(ns) da vitrine e ${demoCounts.order || 0} do cardápio de pedidos com isDemo)` }
    : { allowed: true, reason: 'sem conteúdo demonstrativo' };
}

/** Horário de funcionamento no formato do schema.org (dias com a mesma faixa viram uma entrada só). */
export function schemaOpeningHours(schedule) {
  if (!schedule) return [];
  const bySlot = new Map();
  DAY_ORDER.forEach((key) => {
    const ranges = Array.isArray(schedule[key]) ? schedule[key] : [];
    ranges.filter((range) => Array.isArray(range) && TIME_PATTERN.test(range[0]) && TIME_PATTERN.test(range[1])).forEach(([opens, closes]) => {
      const slot = `${opens}|${closes}`;
      bySlot.set(slot, [...(bySlot.get(slot) || []), DAY_NAMES[key]]);
    });
  });
  return [...bySlot.entries()].map(([slot, days]) => {
    const [opens, closes] = slot.split('|');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days.length === 1 ? days[0] : days, opens, closes };
  });
}

const compact = (value) => {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => item !== undefined && item !== null && item !== '' && !(Array.isArray(item) && item.length === 0));
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
};

/**
 * Dados estruturados da marca e de cada unidade. Só entram as unidades com endereço confirmado
 * (o Google exige endereço para "empresa local"); horários só quando `schedule` está preenchido.
 */
export function buildJsonLd(config) {
  const { brand, links, units, seo } = config;
  const siteUrl = normalizeSiteUrl(config.site?.url);
  const base = siteUrl || '';
  const image = siteUrl ? absoluteUrl(siteUrl, seo.shareImage.path) : undefined;
  const sameAs = [links.instagram, links.orderHub].filter(Boolean);

  const organization = {
    '@type': 'Organization',
    '@id': `${base}/#organizacao`,
    name: brand.name,
    url: siteUrl ? `${siteUrl}/` : undefined,
    logo: siteUrl ? absoluteUrl(siteUrl, brand.logoPath) : undefined,
    sameAs,
  };

  const restaurants = units.filter((unit) => unit.address).map((unit) => ({
    '@type': 'Restaurant',
    '@id': `${base}/#${unit.id}`,
    name: `${brand.name} — ${unit.name}`,
    parentOrganization: { '@id': organization['@id'] },
    servesCuisine: 'Hambúrguer',
    url: siteUrl ? `${siteUrl}/#unidades` : undefined,
    image,
    hasMap: unit.mapUrl || undefined,
    address: { '@type': 'PostalAddress', streetAddress: unit.address, addressLocality: 'Recife', addressRegion: 'PE', addressCountry: 'BR' },
    openingHoursSpecification: schemaOpeningHours(unit.schedule),
    sameAs,
  }));

  return compact({ '@context': 'https://schema.org', '@graph': [organization, ...restaurants] });
}

/** Tags do <head> de uma página: título, descrição, robots, canônico, Open Graph, Twitter, ícones e JSON-LD. */
export function buildHead({ config, page, demoCounts }) {
  const { brand, seo } = config;
  const siteUrl = normalizeSiteUrl(config.site?.url);
  const pageCfg = seo.pages[page];
  const isOrder = page === 'order';
  const indexing = resolveIndexing(seo, demoCounts);
  const indexable = !isOrder && indexing.allowed;                       // /pedir/ nunca é indexada
  const orderIsDemo = (demoCounts?.order || 0) > 0;
  const description = isOrder && orderIsDemo && pageCfg.descriptionDemo ? pageCfg.descriptionDemo : pageCfg.description;
  const shareTitle = pageCfg.shareTitle || pageCfg.title;
  const shareDescription = pageCfg.shareDescription || description;
  const path = isOrder ? config.links.order : '/';
  const pageUrl = absoluteUrl(siteUrl, path);
  const image = siteUrl ? absoluteUrl(siteUrl, seo.shareImage.path) : null;

  const tags = [
    `<title>${escapeHtml(pageCfg.title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'}" />`,
    pageUrl && `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${escapeHtml(config.site?.locale || 'pt_BR')}" />`,
    `<meta property="og:site_name" content="${escapeHtml(brand.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(shareTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(shareDescription)}" />`,
    pageUrl && `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    image && `<meta property="og:image" content="${escapeHtml(image)}" />`,
    image && `<meta property="og:image:width" content="${seo.shareImage.width}" />`,
    image && `<meta property="og:image:height" content="${seo.shareImage.height}" />`,
    image && `<meta property="og:image:alt" content="${escapeHtml(seo.shareImage.alt)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(shareTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(shareDescription)}" />`,
    image && `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
  ];

  if (page === 'site') {
    // "<" escapado para o JSON nunca poder fechar a tag <script>
    tags.push(`<script type="application/ld+json">${JSON.stringify(buildJsonLd(config)).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.filter(Boolean).map((tag) => `    ${tag}`).join('\n');
}

export function buildRobotsTxt(config) {
  const siteUrl = normalizeSiteUrl(config.site?.url);
  return ['User-agent: *', 'Allow: /', siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : null].filter(Boolean).join('\n') + '\n';
}

/** Lista só a página inicial (o cardápio de pedidos não entra). Null quando não há endereço do site ou a indexação está bloqueada. */
export function buildSitemapXml(config, demoCounts, lastmod = new Date()) {
  const siteUrl = normalizeSiteUrl(config.site?.url);
  if (!siteUrl || !resolveIndexing(config.seo, demoCounts).allowed) return null;
  const date = lastmod.toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeXml(`${siteUrl}/`)}</loc><lastmod>${date}</lastmod></url>\n</urlset>\n`;
}

/** Relatório para o `npm run check:seo`. blockers = impedem o Google/WhatsApp de funcionar direito; warnings = melhorias. */
export function evaluateSeo(config, demoCounts, { shareImageSize = null } = {}) {
  const blockers = [];
  const warnings = [];
  const info = [];
  const { seo, units } = config;
  const siteUrl = normalizeSiteUrl(config.site?.url);
  const indexing = resolveIndexing(seo, demoCounts);

  if (!config.site?.url) blockers.push('Falta o endereço do site: preencha siteConfig.site.url (ex.: https://www.seudominio.com.br). Sem ele não há imagem de prévia nem sitemap.');
  else if (!siteUrl) blockers.push(`siteConfig.site.url ("${config.site.url}") não é um endereço válido. Use algo como https://www.seudominio.com.br`);
  else if (siteUrl.startsWith('http://')) warnings.push('O endereço do site usa http://. Prefira https:// (o Google dá preferência a sites seguros).');

  if (!indexing.allowed) warnings.push(`O site está marcado como noindex (o Google não vai indexar): ${indexing.reason}. Veja siteConfig.seo.indexing.`);
  else info.push(`Indexação liberada (${indexing.reason}).`);

  ['site', 'order'].forEach((page) => {
    const cfg = seo.pages[page];
    if (cfg.title.length > 60) warnings.push(`Título de "${page}" tem ${cfg.title.length} caracteres; acima de ~60 o Google corta.`);
    if (cfg.description.length < 70 || cfg.description.length > 160) warnings.push(`Descrição de "${page}" tem ${cfg.description.length} caracteres; o ideal é entre 70 e 160.`);
  });

  if (shareImageSize) {
    if (shareImageSize.width !== seo.shareImage.width || shareImageSize.height !== seo.shareImage.height) {
      warnings.push(`A imagem de prévia tem ${shareImageSize.width}×${shareImageSize.height}px, mas a configuração diz ${seo.shareImage.width}×${seo.shareImage.height}. O ideal é 1200×630.`);
    }
    if (shareImageSize.bytes > 300 * 1024) warnings.push(`A imagem de prévia pesa ${Math.round(shareImageSize.bytes / 1024)} KB; o WhatsApp costuma ignorar imagens acima de ~300 KB.`);
  }

  units.forEach((unit) => {
    if (!unit.address) warnings.push(`A unidade ${unit.name} não tem endereço: ela ainda não aparece nos dados estruturados do Google (siteConfig.units[].address).`);
    else if (!unit.schedule) warnings.push(`A unidade ${unit.name} não tem horário (schedule): o Google não mostrará "aberto agora" para ela.`);
  });

  try { JSON.parse(JSON.stringify(buildJsonLd(config))); } catch { blockers.push('Os dados estruturados (JSON-LD) não puderam ser gerados.'); }
  return { ready: blockers.length === 0, blockers, warnings, info, siteUrl, indexing };
}
