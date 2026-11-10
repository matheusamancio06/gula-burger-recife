// Gera versões modernas (AVIF e WebP) das fotos locais em public/images, muito menores que o JPG com a mesma aparência.
// Uso: npm run otimizar:imagens   (use --force para refazer tudo)
//
// Fluxo para uma foto nova: coloque o JPG em public/images, rode este comando e declare o formato em siteConfig.photos,
// por exemplo  hero: { localPath: '/images/hero-bg.jpg', formats: ['avif', 'webp'] }.
// O JPG continua como alternativa para navegadores antigos. share.jpg (prévia do WhatsApp) fica de fora: precisa ser JPG.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DIR = fileURLToPath(new URL('../public/images/', import.meta.url));
const SKIP = new Set(['share.jpg']);
const FORCE = process.argv.includes('--force');
const QUALITY = { avif: 52, webp: 78 };

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
let totalBefore = 0;
let totalAfter = 0;

for (const file of readdirSync(DIR).filter((name) => /\.jpe?g$/i.test(name) && !SKIP.has(name))) {
  const source = join(DIR, file);
  const stem = basename(file, extname(file));
  const before = statSync(source).size;
  const row = [`${file} ${kb(before)}`];
  for (const format of ['avif', 'webp']) {
    const target = join(DIR, `${stem}.${format}`);
    if (!FORCE && existsSync(target) && statSync(target).mtimeMs >= statSync(source).mtimeMs) {
      row.push(`${format} ${kb(statSync(target).size)} (já atualizado)`);
      continue;
    }
    // rotate() respeita a orientação gravada na foto; o tamanho original é mantido
    await sharp(source).rotate()[format]({ quality: QUALITY[format], effort: 5 }).toFile(target);
    row.push(`${format} ${kb(statSync(target).size)}`);
  }
  console.log(row.join('  ·  '));
  totalBefore += before;
  totalAfter += statSync(join(DIR, `${stem}.avif`)).size;
}

console.log(`\nJPG somado: ${kb(totalBefore)}  →  AVIF somado: ${kb(totalAfter)} (${Math.round((1 - totalAfter / totalBefore) * 100)}% menor)`);
console.log('Lembre de declarar formats: [\'avif\', \'webp\'] na foto em src/siteConfig.js para o site usá-los.');
