import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { siteConfig } from './src/siteConfig.js';
import { orderMenu } from './src/order/orderMenu.js';
import { showcaseItems } from './src/showcaseData.js';
import { buildHead, buildRobotsTxt, buildSitemapXml, resolveIndexing } from './src/seo.js';
import { loadSheetMenuForNode } from './scripts/menu-da-planilha.mjs';

// Com a planilha de cardápio configurada, o cardápio real vem dela: se ela responder agora, não há produto de demonstração.
// Se não responder, vale o pior caso (arquivo fixo com itens de demonstração, site fica noindex) e o build avisa.
const sheetMenu = await loadSheetMenuForNode();
if (sheetMenu.configured && !sheetMenu.ok) console.warn(`\n[planilha] Não consegui ler a planilha de cardápio agora: ${sheetMenu.error}\n[planilha] Para fins de SEO o site continua marcado como demonstração. Rode npm run check:planilha.\n`);

// O site (index.html) e o cardápio de pedidos (pedir/index.html) são duas páginas independentes, cada uma com seu próprio pacote.
// Em desenvolvimento e no `vite preview`, /pedir e /cardapio (sem a barra final) levam para /pedir/.
const redirectToOrderPage = (request, response, next) => {
  const path = (request.url || '').split('?')[0];
  if (path === '/pedir' || path === '/cardapio' || path === '/cardapio/') {
    response.statusCode = 302;
    response.setHeader('Location', '/pedir/');
    response.end();
    return;
  }
  next();
};

const orderPageRedirect = () => ({
  name: 'order-page-redirect',
  configureServer(server) { server.middlewares.use(redirectToOrderPage); },
  configurePreviewServer(server) { server.middlewares.use(redirectToOrderPage); },
});

// SEO e prévia de compartilhamento: troca <!--seo:head--> pelas tags geradas em src/seo.js (título, descrição, Open Graph,
// dados estruturados...) e cria robots.txt e sitemap.xml no build. Tudo vem de src/siteConfig.js.
const SEO_MARKER = '<!--seo:head-->';
const demoCounts = () => ({
  order: sheetMenu.configured && sheetMenu.ok ? 0 : orderMenu.filter((product) => product.isDemo).length,
  showcase: showcaseItems.filter((item) => item.isDemo).length,
});

const seoPlugin = () => ({
  name: 'gula-seo',
  transformIndexHtml: {
    order: 'pre',
    handler(html, context) {
      if (!html.includes(SEO_MARKER)) throw new Error(`${context.path}: faltou a marcação ${SEO_MARKER} no <head>.`);
      const page = context.path.startsWith('/pedir') ? 'order' : 'site';
      return html.replace(SEO_MARKER, buildHead({ config: siteConfig, page, demoCounts: demoCounts() }).trimStart());
    },
  },
  generateBundle() {
    const counts = demoCounts();
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobotsTxt(siteConfig) });
    const sitemap = buildSitemapXml(siteConfig, counts);
    if (sitemap) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });

    const indexing = resolveIndexing(siteConfig.seo, counts);
    console.log(`\n[SEO] ${indexing.allowed ? 'Indexação liberada' : `Site marcado como noindex: ${indexing.reason}`}.`);
    console.log(`[SEO] Endereço do site: ${siteConfig.site.url || 'não configurado (sem imagem de prévia nem sitemap)'}. Detalhes: npm run check:seo\n`);
  },
});

// Pré-carrega as duas fontes que aparecem logo no topo (título e texto) para o texto não "piscar" ao trocar de fonte.
// Só no build: nomes dos arquivos ganham um código no final, que o Vite conhece apenas nessa etapa.
const fontPreload = () => ({
  name: 'gula-font-preload',
  transformIndexHtml: {
    order: 'post',
    handler(html, context) {
      if (!context.bundle) return html;
      const tags = ['dm-sans-latin-wght-normal', 'barlow-condensed-latin-900-normal']
        .map((name) => Object.keys(context.bundle).find((file) => file.includes(name)))
        .filter(Boolean)
        .map((file) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' }, injectTo: 'head-prepend' }));
      return { html, tags };
    },
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), orderPageRedirect(), seoPlugin(), fontPreload()],
  build: {
    rollupOptions: {
      input: {
        site: resolve(import.meta.dirname, 'index.html'),
        pedir: resolve(import.meta.dirname, 'pedir/index.html'),
      },
    },
  },
});
