// Mostra o que falta para o site aparecer bem no Google e ter prévia bonita ao ser compartilhado.
// Uso: npm run check:seo   (com --strict o comando falha quando ainda há pendência bloqueante, útil antes de publicar)
import { readFileSync, statSync } from 'node:fs';
import { siteConfig } from '../src/siteConfig.js';
import { orderMenu } from '../src/order/orderMenu.js';
import { showcaseItems } from '../src/showcaseData.js';
import { evaluateSeo } from '../src/seo.js';
import { loadSheetMenuForNode } from './menu-da-planilha.mjs';

// Largura e altura de um JPEG, lendo o próprio arquivo (sem biblioteca de imagem).
function jpegSize(file) {
  const bytes = readFileSync(file);
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return null;
}

const imagePath = new URL(`../public${siteConfig.seo.shareImage.path}`, import.meta.url);
let shareImageSize = null;
let imageProblem = null;
try {
  const size = jpegSize(imagePath);
  shareImageSize = size && { ...size, bytes: statSync(imagePath).size };
  if (!size) imageProblem = `Não consegui ler a imagem de prévia em public${siteConfig.seo.shareImage.path} (use um arquivo JPG).`;
} catch {
  imageProblem = `A imagem de prévia não existe: public${siteConfig.seo.shareImage.path}`;
}

// Com a planilha de cardápio funcionando, não há produto de demonstração no cardápio de pedidos (mesma regra do build).
const sheetMenu = await loadSheetMenuForNode();
const counts = { order: sheetMenu.configured && sheetMenu.ok ? 0 : orderMenu.filter((p) => p.isDemo).length, showcase: showcaseItems.filter((i) => i.isDemo).length };
const result = evaluateSeo(siteConfig, counts, { shareImageSize });
if (imageProblem) result.blockers.push(imageProblem);

console.log('\nGoogle e prévia de compartilhamento\n');
console.log(`Endereço do site ... ${result.siteUrl || 'não configurado'}`);
console.log(`Indexação .......... ${result.indexing.allowed ? 'liberada' : 'BLOQUEADA (noindex)'} · ${result.indexing.reason}`);
console.log(`Imagem de prévia ... ${shareImageSize ? `${shareImageSize.width}×${shareImageSize.height}px, ${Math.round(shareImageSize.bytes / 1024)} KB` : 'não encontrada'}`);
console.log(`Unidades ........... ${siteConfig.units.map((u) => `${u.name} (${u.address ? 'endereço ok' : 'sem endereço'}, ${u.schedule ? 'horário ok' : 'sem horário'})`).join(' · ')}\n`);

if (result.blockers.length) {
  console.log('FALTA PARA FUNCIONAR:');
  result.blockers.forEach((text) => console.log(`  - ${text}`));
} else {
  console.log('PRONTO: o essencial está configurado.');
}
if (result.warnings.length) {
  console.log('\nMelhorias e avisos:');
  result.warnings.forEach((text) => console.log(`  - ${text}`));
}
console.log('\nGuia completo: docs/GOOGLE-E-COMPARTILHAMENTO.md\n');

if (process.argv.includes('--strict') && !result.ready) process.exitCode = 1;
