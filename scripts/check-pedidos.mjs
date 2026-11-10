// Mostra se o cardápio de pedidos (/pedir/) já está pronto para receber pedidos pelo WhatsApp.
// Uso: npm run check:pedidos   (com --strict o comando falha quando ainda não está pronto, útil antes de publicar)
import { siteConfig } from '../src/siteConfig.js';
import { orderMenu as bundledMenu } from '../src/order/orderMenu.js';
import { showcaseItems } from '../src/showcaseData.js';
import { evaluateOrderReadiness } from '../src/order/readiness.js';
import { loadSheetMenuForNode } from './menu-da-planilha.mjs';

// Com a planilha configurada, o cardápio de /pedir/ vem dela (src/order/sheetMenu.js); senão, do arquivo fixo.
const sheet = await loadSheetMenuForNode();
const sheetOk = sheet.configured && sheet.ok;
const orderMenu = sheetOk ? sheet.menu.products : bundledMenu;

const result = evaluateOrderReadiness({ whatsappNumber: siteConfig.orders.whatsappNumber, menu: orderMenu, services: siteConfig.orders.services, units: siteConfig.units, pause: siteConfig.orders.pause });
const demoShowcase = showcaseItems.filter((item) => item.isDemo).length;

console.log('\nCardápio de pedidos da Gula Burger\n');
console.log(`WhatsApp .......... ${result.number ? `+${result.number}` : 'não configurado'}`);
console.log(`Cardápio .......... ${sheetOk ? 'da planilha do Google' : sheet.configured ? 'PLANILHA CONFIGURADA, MAS NÃO FUNCIONA (usando o arquivo fixo)' : 'do arquivo fixo (src/order/orderMenu.js)'}`);
console.log(`Produtos .......... ${orderMenu.length - orderMenu.filter((p) => p.isDemo).length} reais, ${orderMenu.filter((p) => p.isDemo).length} demonstrativos`);
console.log(`Vitrine do site ... ${showcaseItems.length - demoShowcase} reais, ${demoShowcase} demonstrativos (src/showcaseData.js)\n`);

if (sheet.configured && !sheet.ok) result.blockers.unshift(`A planilha de cardápio está configurada mas não funciona: ${sheet.error} (npm run check:planilha mostra os detalhes). Em /pedir/ os clientes veriam "Cardápio indisponível".`);
if (sheetOk && sheet.menu.problems.length) result.warnings.push(`A planilha tem ${sheet.menu.problems.length} problema(s) (linhas ignoradas): rode npm run check:planilha.`);
if (result.blockers.length) result.ready = false;

if (result.ready) {
  console.log('PRONTO: o botão "Enviar pedido pelo WhatsApp" está liberado em /pedir/.');
} else {
  console.log('AINDA NÃO ESTÁ PRONTO. O que falta:');
  result.blockers.forEach((text) => console.log(`  - ${text}`));
}
if (result.warnings.length) {
  console.log('\nAtenção (não bloqueia):');
  result.warnings.forEach((text) => console.log(`  - ${text}`));
}
if (demoShowcase) console.log('\nLembrete: a vitrine do site (src/showcaseData.js) também tem itens demonstrativos.');
console.log('\nGuia completo: docs/ATIVAR-PEDIDOS.md\n');

if (process.argv.includes('--strict') && !result.ready) process.exitCode = 1;
