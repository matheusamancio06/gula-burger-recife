// Confere se algum texto voltou a ficar pequeno demais nos estilos: nenhum tamanho de fonte abaixo de 12 px.
// Uso: npm run check:legibilidade   (sai com erro se achar algo, bom para rodar antes de publicar)
import { readFileSync } from 'node:fs';

const MIN = 12;
const files = ['base.css', 'site.css', 'order.css'];
let problems = 0;

for (const file of files) {
  const css = readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8');
  // regras simples "seletor{declarações}" (as media queries aparecem como parte do texto, o que basta para localizar)
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim().split('\n').pop().trim();
    const body = rule[2];
    const sizes = [...body.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    for (const m of body.matchAll(/font:\s*[^;]*?(?:^|\s)([\d.]+)px(?=[\s/])/g)) sizes.push(Number(m[1]));
    sizes.filter((size) => size < MIN).forEach((size) => {
      problems++;
      console.log(`${file}: ${size}px em "${selector.slice(-70)}"`);
    });
  }
}

if (problems) {
  console.log(`\n${problems} tamanho(s) de fonte abaixo de ${MIN}px. Use pelo menos ${MIN}px (textos de apoio 13 a 14px, textos corridos 14 a 16px).`);
  process.exitCode = 1;
} else {
  console.log(`OK: nenhum texto abaixo de ${MIN}px nos estilos.`);
}
