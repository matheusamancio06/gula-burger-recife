// Confere o que deixa o site rápido: fotos em formatos modernos, fontes locais e pré-carregamento do topo.
// Uso: npm run check:desempenho   (com --strict o comando falha se algo estiver errado)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { siteConfig } from '../src/siteConfig.js';

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const problems = [];
const notes = [];

// 1) Fotos locais: cada formato declarado precisa existir e valer a pena
for (const [key, photo] of Object.entries(siteConfig.photos)) {
  if (!photo.localPath) continue;
  const jpg = root(`public${photo.localPath}`);
  if (!existsSync(jpg)) { problems.push(`${key}: o arquivo ${photo.localPath} não existe em public/.`); continue; }
  const jpgSize = statSync(jpg).size;
  if (!photo.formats?.length) {
    problems.push(`${key}: foto local sem formatos modernos. Rode npm run otimizar:imagens e declare formats: ['avif', 'webp'] em siteConfig.photos.${key}.`);
    continue;
  }
  for (const format of photo.formats) {
    const file = root(`public${photo.localPath.replace(/\.jpe?g$/i, `.${format}`)}`);
    if (!existsSync(file)) { problems.push(`${key}: falta o arquivo .${format} (rode npm run otimizar:imagens).`); continue; }
    const size = statSync(file).size;
    notes.push(`${key}.${format}: ${kb(size)} (JPG ${kb(jpgSize)}, ${Math.round((1 - size / jpgSize) * 100)}% menor)`);
    if (size >= jpgSize) problems.push(`${key}.${format} não ficou menor que o JPG; refaça com npm run otimizar:imagens --force.`);
  }
  if (jpgSize > 400 * 1024) problems.push(`${key}: o JPG original tem ${kb(jpgSize)}; reduza as dimensões antes de otimizar.`);
}

// 2) Fotos soltas em public/images sem versão moderna (exceto a de compartilhamento, que precisa ser JPG)
const declared = new Set(Object.values(siteConfig.photos).map((photo) => photo.localPath).filter(Boolean));
readdirSync(root('public/images')).filter((name) => /\.jpe?g$/i.test(name) && name !== 'share.jpg').forEach((name) => {
  if (!declared.has(`/images/${name}`)) notes.push(`/images/${name} está em public/images mas não é usada em siteConfig.photos.`);
});

// 3) Fontes: nada de Google Fonts e todos os arquivos declarados existem
const fontsCss = readFileSync(root('src/styles/fonts.css'), 'utf8');
[...fontsCss.matchAll(/url\('([^']+\.woff2)'\)/g)].forEach(([, url]) => {
  const file = root(`src/styles/${url}`);
  if (!existsSync(file)) problems.push(`fonts.css aponta para ${url}, que não existe.`);
  else notes.push(`${url.split('/').pop()}: ${kb(statSync(file).size)}`);
});
for (const file of ['index.html', 'pedir/index.html']) {
  if (/googleapis|gstatic/.test(readFileSync(root(file), 'utf8'))) problems.push(`${file} ainda carrega fontes do Google (use src/styles/fonts.css).`);
}

// 4) Pré-carregamento da foto do topo precisa apontar para arquivos que existem
const indexHtml = readFileSync(root('index.html'), 'utf8');
[...indexHtml.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].forEach(([, href]) => {
  if (!existsSync(root(`public${href}`))) problems.push(`index.html pré-carrega ${href}, que não existe.`);
});

console.log('\nDesempenho: fotos e fontes\n');
notes.forEach((text) => console.log(`  · ${text}`));
if (problems.length) {
  console.log('\nPROBLEMAS:');
  problems.forEach((text) => console.log(`  - ${text}`));
} else {
  console.log('\nOK: fotos em formatos modernos e fontes locais.');
}
console.log('');
if (problems.length && process.argv.includes('--strict')) process.exitCode = 1;
