// Confere a planilha de cardápio (Google Sheets publicada como CSV): baixa, lê e mostra o que o site vai exibir e o que está errado.
// Uso: npm run check:planilha   (com --strict o comando falha se houver qualquer problema; avisos não falham)
import { siteConfig } from '../src/siteConfig.js';
import { checkSheetUrl } from '../src/order/sheetMenu.js';
import { loadSheetMenuForNode } from './menu-da-planilha.mjs';

const sheet = siteConfig.orders.menuSheet;
console.log('\nPlanilha de cardápio da Gula Burger\n');

if (!sheet?.products) {
  console.log('Planilha NÃO configurada: o site usa o cardápio fixo de src/order/orderMenu.js.');
  console.log('Para usar a planilha, cole os links CSV em siteConfig.orders.menuSheet (src/siteConfig.js).');
  console.log('Passo a passo: docs/PLANILHA-DE-CARDAPIO.md  ·  modelo para importar: docs/planilha-modelo/\n');
  process.exit(0);
}

const productsUrl = checkSheetUrl(sheet.products, 'Produtos');
const optionsUrl = checkSheetUrl(sheet.options, 'Opcoes');
console.log(`Aba Produtos ...... ${sheet.products}`);
console.log(`Aba Opcoes ........ ${sheet.options || '(não configurada: produtos sem opções)'}\n`);

const result = await loadSheetMenuForNode();
const menu = result.menu;
let failed = false;

if (!result.ok) {
  failed = true;
  console.log('NÃO FUNCIONA:');
  console.log(`  - ${result.error}`);
  if (productsUrl.problem || optionsUrl.problem) console.log('  (confira o link em siteConfig.orders.menuSheet)');
  else console.log('  - Confira se a planilha está publicada na web ("Arquivo > Compartilhar > Publicar na Web") e se o link é da aba certa, em formato CSV.');
}

if (menu) {
  const products = menu.products;
  if (products.length) {
    const soldOut = products.filter((product) => product.available === false);
    const withOptions = products.filter((product) => product.optionGroups.length);
    console.log(`${products.length} produto(s) em ${menu.categories.length - 1} categoria(s); ${withOptions.length} com opções; ${soldOut.length} esgotado(s).\n`);
    menu.categories.filter((category) => category.id !== 'all').forEach((category) => {
      const inCategory = products.filter((product) => product.category === category.id);
      console.log(`  ${category.label} (${inCategory.length})`);
      inCategory.forEach((product) => {
        const price = Number.isFinite(product.price) ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : 'sem preço';
        const extra = product.optionGroups.length ? ` · ${product.optionGroups.map((group) => `${group.label} (${group.options.length})`).join(', ')}` : '';
        console.log(`    - ${product.name} · ${price}${product.available === false ? ' · ESGOTADO' : ''}${extra}`);
      });
    });
    console.log('');
  }
  if (menu.problems.length) {
    failed = true;
    console.log('PROBLEMAS (linhas ignoradas ou erros que mudam o que o cliente vê):');
    menu.problems.forEach((text) => console.log(`  - ${text}`));
    console.log('');
  }
  if (menu.warnings.length) {
    console.log('Avisos (funciona, mas confira):');
    menu.warnings.forEach((text) => console.log(`  - ${text}`));
    console.log('');
  }
}

if (!failed) console.log('OK: a planilha está sendo lida e o cardápio de /pedir/ virá dela.');
console.log('O link CSV público atualiza em poucos minutos depois de editar a planilha (o Google guarda uma cópia por alguns minutos).');
console.log('Guia: docs/PLANILHA-DE-CARDAPIO.md\n');

if (process.argv.includes('--strict') && failed) process.exitCode = 1;
