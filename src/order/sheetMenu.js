// Cardápio de pedidos a partir de uma planilha do Google (publicada como CSV). Funções puras, sem React nem navegador,
// para serem usadas pela página /pedir/, pelos scripts (`npm run check:planilha`) e pelos testes.
//
// A planilha tem duas abas:
//   Produtos: nome, categoria, descricao, preco, disponivel, foto            (uma linha por produto; "id" é opcional)
//   Opcoes:   aplica a, grupo, obrigatorio, multiplo, min, max, opcao, preco, ajuda   (uma linha por opção; opcional)
// Passo a passo para a equipe: docs/PLANILHA-DE-CARDAPIO.md. Modelo para importar: docs/planilha-modelo/.

const MAX_PRODUCTS = 300;
const LIMITS = { name: 100, note: 500, label: 80, help: 200, category: 60 };

/** Texto sem acento, minúsculo, com hífens: "Pão & Queijo" -> "pao-queijo". */
export function slug(text) {
  return String(text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const headerKey = (text) => slug(text).replace(/-/g, '');

/** CSV (aspas, vírgulas e quebras de linha dentro de aspas, BOM) em lista de linhas. Aceita ponto e vírgula, como o Excel em português. */
export function parseCsv(text) {
  const source = String(text ?? '').replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += char;
    } else if (char === '"' && field === '') inQuotes = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += char;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const PRODUCT_COLUMNS = {
  id: ['id', 'codigo', 'cod'],
  nome: ['nome', 'produto', 'item', 'prato'],
  categoria: ['categoria', 'secao'],
  descricao: ['descricao', 'detalhes', 'ingredientes', 'composicao'],
  preco: ['preco', 'valor', 'precor', 'precoemr'],
  disponivel: ['disponivel', 'disponibilidade', 'ativo', 'estoque'],
  foto: ['foto', 'imagem', 'fotourl', 'imagemurl'],
};
const OPTION_COLUMNS = {
  aplica: ['aplicaa', 'aplica', 'produto', 'produtos', 'item', 'paraoproduto', 'categoriaouproduto'],
  grupo: ['grupo', 'nomedogrupo', 'pergunta'],
  obrigatorio: ['obrigatorio', 'obrigatoria', 'obrig'],
  multiplo: ['multiplo', 'multipla', 'variasescolhas', 'maisdeuma'],
  min: ['min', 'minimo'],
  max: ['max', 'maximo'],
  opcao: ['opcao', 'opcoes', 'escolha', 'nomedaopcao'],
  preco: ['preco', 'valor', 'adicional', 'acrescimo', 'precoadicional', 'precor'],
  ajuda: ['ajuda', 'dica', 'observacao'],
};

/** Lê uma aba: devolve as linhas como objetos { line, ...colunas } (line = número da linha na planilha) e as colunas que faltam. */
function readTable(csv, columns, required) {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim() !== ''));
  if (headerIndex < 0) return { items: [], missing: required, unknown: [] };
  const lookup = {};
  Object.entries(columns).forEach(([key, aliases]) => aliases.forEach((alias) => { if (!(alias in lookup)) lookup[alias] = key; }));
  const header = rows[headerIndex].map((cell) => lookup[headerKey(cell)] || null);
  const unknown = rows[headerIndex].filter((cell, index) => String(cell).trim() && !header[index]).map((cell) => String(cell).trim());
  const missing = required.filter((key) => !header.includes(key));
  const items = [];
  rows.slice(headerIndex + 1).forEach((cells, offset) => {
    if (cells.every((cell) => String(cell).trim() === '')) return;
    if (String(cells.find((cell) => String(cell).trim()) || '').trim().startsWith('#')) return; // linha de comentário
    const item = { line: headerIndex + offset + 2 };
    header.forEach((key, index) => { if (key && !(key in item)) item[key] = String(cells[index] ?? '').trim(); });
    items.push(item);
  });
  return { items, missing, unknown };
}

/** "29,90", "R$ 29,90", "29.90", "1.234,56" -> número. Vazio -> null. Inválido -> NaN. */
export function parseMoney(text) {
  const raw = String(text ?? '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (raw === '') return null;
  let normalized;
  if (raw.includes(',')) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, '');
  else normalized = raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  const value = Number(normalized);
  return value > 100000 ? NaN : value;
}

/** sim/não em português ou inglês. Vazio -> padrão. Valor desconhecido -> undefined. */
export function parseYesNo(text, fallback) {
  const value = slug(text);
  if (value === '') return fallback;
  if (['sim', 's', 'yes', 'y', 'true', '1', 'x', 'ok'].includes(value)) return true;
  if (['nao', 'n', 'no', 'false', '0', 'esgotado', 'indisponivel', 'acabou'].includes(value)) return false;
  return undefined;
}

const parseInteger = (text) => {
  if (String(text ?? '').trim() === '') return null;
  const value = Number(String(text).trim());
  return Number.isInteger(value) && value >= 0 && value <= 50 ? value : NaN;
};
const clamp = (value, low, high) => Math.min(Math.max(value, low), high);
const cut = (text, size) => String(text ?? '').slice(0, size);

const isDirectImage = (value) => /^https:\/\/\S+$/i.test(value) || /^\/(?!\/)\S*$/.test(value);

/**
 * Monta o cardápio a partir do texto CSV das duas abas.
 * Devolve { products, categories, problems, warnings }:
 *   problems = o que foi ignorado ou está errado (linha pulada, coluna que falta);
 *   warnings = o que funciona, mas costuma ser esquecido (sem preço, sem descrição, foto inválida).
 * Os produtos não levam `isDemo`: o cardápio da planilha é considerado o real.
 */
export function buildMenuFromSheets({ productsCsv, optionsCsv = '', fallbackImage = '', photoKeys = [] }) {
  const problems = [];
  const warnings = [];

  const productTable = readTable(productsCsv, PRODUCT_COLUMNS, ['nome']);
  if (productTable.missing.length) problems.push('Na aba Produtos falta a coluna "nome" (primeira linha da planilha).');
  if (productTable.unknown.length) warnings.push(`Colunas não reconhecidas na aba Produtos (serão ignoradas): ${productTable.unknown.join(', ')}.`);

  const categories = [{ id: 'all', label: 'Todos' }];
  const categoryIds = new Set();
  const list = [];
  const usedIds = new Set();
  let overLimit = 0;

  productTable.items.forEach((row) => {
    const where = `Produtos, linha ${row.line}`;
    if (!row.nome) { problems.push(`${where}: sem nome. Linha ignorada.`); return; }
    if (list.length >= MAX_PRODUCTS) { overLimit += 1; return; }

    let id = slug(row.id || row.nome);
    if (!id) id = `produto-${row.line}`;
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n += 1;
      warnings.push(`${where}: "${row.nome}" repete um id já usado; recebeu o id "${id}-${n}". Dê um id diferente na coluna id.`);
      id = `${id}-${n}`;
    }
    usedIds.add(id);

    const categoryLabel = cut(row.categoria || '', LIMITS.category) || 'Outros';
    if (!row.categoria) warnings.push(`${where}: "${row.nome}" está sem categoria; foi para "Outros".`);
    const categoryId = slug(categoryLabel) || 'outros';
    if (!categoryIds.has(categoryId)) { categoryIds.add(categoryId); categories.push({ id: categoryId, label: categoryLabel }); }

    const price = parseMoney(row.preco);
    if (Number.isNaN(price)) warnings.push(`${where}: o preço "${row.preco}" de "${row.nome}" não é um valor válido (use algo como 29,90). Vai aparecer "Valor a confirmar".`);
    else if (price === null) warnings.push(`${where}: "${row.nome}" está sem preço. Vai aparecer "Valor a confirmar".`);

    const available = parseYesNo(row.disponivel, true);
    if (available === undefined) warnings.push(`${where}: "disponivel" deve ser sim ou não (veio "${row.disponivel}"). Considerei disponível.`);

    let image = fallbackImage;
    if (row.foto) {
      if (photoKeys.includes(row.foto) || isDirectImage(row.foto)) image = row.foto;
      else warnings.push(`${where}: a foto "${row.foto}" não é um endereço https:// nem um caminho como /images/prato.jpg. Usei a imagem padrão.`);
    }
    if (!row.descricao) warnings.push(`${where}: "${row.nome}" está sem descrição.`);

    list.push({
      id,
      name: cut(row.nome, LIMITS.name),
      category: categoryId,
      note: cut(row.descricao, LIMITS.note),
      image,
      price: Number.isNaN(price) ? null : price,
      available: available !== false,
      optionGroups: [],
    });
  });
  if (overLimit) problems.push(`Mais de ${MAX_PRODUCTS} produtos: ${overLimit} foram ignorados.`);

  // ----- opções -----
  const groupsByProduct = new Map(list.map((product) => [product.id, new Map()]));
  const optionTable = optionsCsv && String(optionsCsv).trim() ? readTable(optionsCsv, OPTION_COLUMNS, ['aplica', 'grupo', 'opcao']) : null;
  if (optionTable) {
    if (optionTable.missing.length) problems.push(`Na aba Opcoes faltam as colunas: ${optionTable.missing.join(', ')} (a aba foi ignorada).`);
    if (optionTable.unknown.length) warnings.push(`Colunas não reconhecidas na aba Opcoes (serão ignoradas): ${optionTable.unknown.join(', ')}.`);
  }
  if (optionTable && !optionTable.missing.length) {
    const byKey = new Map();
    const index = (key, product) => { if (key) { if (!byKey.has(key)) byKey.set(key, new Set()); byKey.get(key).add(product); } };
    list.forEach((product) => { index(product.id, product); index(slug(product.name), product); index(product.category, product); });

    optionTable.items.forEach((row) => {
      const where = `Opcoes, linha ${row.line}`;
      if (!row.aplica || !row.grupo || !row.opcao) { problems.push(`${where}: precisa de "aplica a", "grupo" e "opcao". Linha ignorada.`); return; }
      const target = slug(row.aplica);
      const matched = ['*', 'todos', 'todas', 'todos-os-produtos'].includes(row.aplica.trim().toLowerCase()) || ['todos', 'todas', 'todos-os-produtos'].includes(target)
        ? list : [...(byKey.get(target) || [])];
      if (!matched.length) { problems.push(`${where}: "${row.aplica}" não é nenhum produto, id ou categoria da aba Produtos. Linha ignorada.`); return; }

      const price = row.preco === undefined || row.preco === '' ? 0 : parseMoney(row.preco);
      if (Number.isNaN(price)) { problems.push(`${where}: o preço "${row.preco}" da opção "${row.opcao}" não é válido. Linha ignorada.`); return; }
      const required = parseYesNo(row.obrigatorio, false);
      const multiple = parseYesNo(row.multiplo, false);
      if (required === undefined) warnings.push(`${where}: "obrigatorio" deve ser sim ou não (veio "${row.obrigatorio}"). Considerei não.`);
      if (multiple === undefined) warnings.push(`${where}: "multiplo" deve ser sim ou não (veio "${row.multiplo}"). Considerei não.`);
      const min = parseInteger(row.min);
      const max = parseInteger(row.max);
      if (Number.isNaN(min) || Number.isNaN(max)) warnings.push(`${where}: "min" e "max" devem ser números inteiros. Ignorei.`);

      const groupId = slug(row.grupo);
      matched.forEach((product) => {
        const groups = groupsByProduct.get(product.id);
        if (!groups.has(groupId)) {
          groups.set(groupId, {
            id: groupId,
            label: cut(row.grupo, LIMITS.label),
            help: cut(row.ajuda, LIMITS.help),
            required: required === true,
            multiple: multiple === true,
            minColumn: Number.isInteger(min) ? min : null,
            maxColumn: Number.isInteger(max) ? max : null,
            options: [],
          });
        } else {
          const group = groups.get(groupId);
          if (!group.help && row.ajuda) group.help = cut(row.ajuda, LIMITS.help);
          if ((required === true) !== group.required || (multiple === true) !== group.multiple) {
            if (row.obrigatorio !== '' || row.multiplo !== '') warnings.push(`${where}: o grupo "${row.grupo}" já foi definido antes com outro "obrigatorio" ou "multiplo"; vale o da primeira linha do grupo.`);
          }
        }
        const group = groups.get(groupId);
        const optionId = slug(row.opcao);
        if (group.options.some((option) => option.id === optionId)) { warnings.push(`${where}: a opção "${row.opcao}" aparece duas vezes no grupo "${row.grupo}" de "${product.name}". Mantive a primeira.`); return; }
        group.options.push({ id: optionId, label: cut(row.opcao, LIMITS.label), price });
      });
    });
  }

  list.forEach((product) => {
    product.optionGroups = [...groupsByProduct.get(product.id).values()].map((group) => {
      const count = group.options.length;
      let min;
      let max;
      if (!group.multiple) { min = group.required ? 1 : 0; max = 1; }
      else {
        min = clamp(group.minColumn ?? (group.required ? 1 : 0), 0, count);
        max = clamp(group.maxColumn ?? count, Math.max(min, 1), count);
      }
      const required = group.required || min > 0;
      if (group.multiple && group.maxColumn !== null && group.maxColumn > count) warnings.push(`O grupo "${group.label}" de "${product.name}" pede "max" ${group.maxColumn}, mas só tem ${count} opção(ões).`);
      return { id: group.id, label: group.label, help: group.help, required, multiple: group.multiple, min, max, options: group.options };
    });
  });

  if (!list.length) problems.push('Nenhum produto válido na aba Produtos.');
  return { products: list, categories, problems, warnings };
}

const GOOGLE_EDIT_LINK = /docs\.google\.com\/spreadsheets\/d\/[^/]+\/(edit|view)/i;

/** Confere o endereço colado em siteConfig.orders.menuSheet. Vazio é permitido (usa o cardápio do projeto). */
export function checkSheetUrl(value, label = 'planilha') {
  const url = String(value ?? '').trim();
  if (!url) return { url: null, problem: null };
  if (GOOGLE_EDIT_LINK.test(url)) return { url: null, problem: `O endereço da aba ${label} é o link de edição da planilha. Use o de "Arquivo > Compartilhar > Publicar na Web", escolhendo a aba e o formato CSV (termina em output=csv).` };
  if (/^\/(?!\/)\S*$/.test(url)) return { url, problem: null };            // arquivo do próprio site (testes)
  if (!/^https:\/\/\S+$/i.test(url)) return { url: null, problem: `O endereço da aba ${label} precisa começar com https://.` };
  if (!/(output=csv|format=csv|tqx=out:csv|\.csv)(&|$|\?|#)/i.test(url)) return { url: null, problem: `O endereço da aba ${label} não parece ser um CSV. Em "Publicar na Web", escolha o formato "Valores separados por vírgula (.csv)" e copie o link (termina em output=csv).` };
  return { url, problem: null };
}

/**
 * Baixa as duas abas e monta o cardápio. `fetchText(url)` é quem baixa (fetch no navegador ou no Node).
 * Devolve { ok, menu } com o mesmo formato de buildMenuFromSheets, ou { ok: false, error }.
 */
export async function fetchSheetMenu({ sheet, fetchText, fallbackImage, photoKeys }) {
  const products = checkSheetUrl(sheet?.products, 'Produtos');
  const options = checkSheetUrl(sheet?.options, 'Opcoes');
  if (products.problem || options.problem) return { ok: false, error: products.problem || options.problem };
  if (!products.url) return { ok: false, error: 'siteConfig.orders.menuSheet.products não está preenchido.' };
  try {
    const [productsCsv, optionsCsv] = await Promise.all([fetchText(products.url), options.url ? fetchText(options.url) : Promise.resolve('')]);
    const menu = buildMenuFromSheets({ productsCsv, optionsCsv, fallbackImage, photoKeys });
    if (!menu.products.length) return { ok: false, error: menu.problems.join(' ') || 'A planilha não tem produtos.', menu };
    return { ok: true, menu };
  } catch (error) {
    return { ok: false, error: `Não foi possível baixar a planilha (${error?.message || error}).` };
  }
}
