// Testes do leitor da planilha de cardápio (src/order/sheetMenu.js): CSV, preços, sim/não, categorias, opções, erros.
// Uso: npm run test:planilha
import assert from 'node:assert/strict';
import { buildMenuFromSheets, checkSheetUrl, fetchSheetMenu, parseCsv, parseMoney, parseYesNo, slug } from '../src/order/sheetMenu.js';

// --- slug ---
assert.equal(slug('Pão & Queijo!'), 'pao-queijo');
assert.equal(slug('  Hambúrgueres '), 'hamburgueres');

// --- CSV ---
assert.deepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
assert.deepEqual(parseCsv('a,b\r\n"x, y","z ""q"""\r\n'), [['a', 'b'], ['x, y', 'z "q"']]);
assert.deepEqual(parseCsv('a,b\n"linha1\nlinha2",2'), [['a', 'b'], ['linha1\nlinha2', '2']]);
assert.deepEqual(parseCsv('\uFEFFnome;preco\nA;1,5'), [['nome', 'preco'], ['A', '1,5']]);   // BOM e ponto e vírgula
assert.deepEqual(parseCsv('a,b\n1,'), [['a', 'b'], ['1', '']]);                              // campo vazio no fim
assert.deepEqual(parseCsv(''), []);

// --- dinheiro ---
assert.equal(parseMoney('29,90'), 29.9);
assert.equal(parseMoney('R$ 29,90'), 29.9);
assert.equal(parseMoney('29.90'), 29.9);
assert.equal(parseMoney('1.234,56'), 1234.56);
assert.equal(parseMoney('1.234'), 1234);
assert.equal(parseMoney('30'), 30);
assert.equal(parseMoney(''), null);
assert.ok(Number.isNaN(parseMoney('abc')));
assert.ok(Number.isNaN(parseMoney('29,9O')));
assert.ok(Number.isNaN(parseMoney('-5')));
assert.ok(Number.isNaN(parseMoney('9999999')));

// --- sim/não ---
assert.equal(parseYesNo('Sim', false), true);
assert.equal(parseYesNo('não', true), false);
assert.equal(parseYesNo('NAO', true), false);
assert.equal(parseYesNo('Esgotado', true), false);
assert.equal(parseYesNo('', true), true);
assert.equal(parseYesNo('talvez', true), undefined);

// --- cardápio completo ---
const produtos = `nome,categoria,descricao,"Preço (R$)",Disponível,foto,id
Hambúrguer A,Hambúrgueres,"Pão, carne e queijo","29,90",sim,,
Hambúrguer B,Hambúrgueres,Outro,34.5,não,/images/b.jpg,burger-b
Batata,Acompanhamentos,Crocante,,sim,https://exemplo.com/batata.jpg,
Refri,Bebidas,Lata,6,Sim,foto-invalida,
Sobremesa,,Doce,12,sim,,
# comentário ignorado,,,,,,
,,,,,,
Sem preço válido,Bebidas,x,9,9O,sim,,
`;
const opcoes = `aplica a,grupo,obrigatório,múltiplo,min,max,opção,preço,ajuda
Hambúrguer A,Ponto da carne,sim,não,,,Mal passada,0,Escolha o ponto
Hambúrguer A,Ponto da carne,sim,não,,,Ao ponto,,
Hambúrguer A,Ponto da carne,sim,não,,,Bem passada,0,
Hambúrgueres,Adicionais,não,sim,0,2,Bacon,"5,50",
Hambúrgueres,Adicionais,não,sim,0,2,Queijo,3,
Hambúrgueres,Adicionais,não,sim,0,2,Ovo,4,
burger-b,Ponto da carne,sim,não,,,Ao ponto,0,
*,Observação rápida,não,não,,,Sem cebola,0,
Produto que não existe,Grupo,sim,não,,,Opção,0,
Batata,Molho,sim,não,,,Cheddar,abc,
Refri,Gelo,sim,sim,5,9,Com gelo,0,
Refri,Gelo,sim,sim,5,9,Sem gelo,0,
`;
const fotoKeys = ['menuBurger', 'menuFries'];
const menu = buildMenuFromSheets({ productsCsv: produtos, optionsCsv: opcoes, fallbackImage: '/brand/logo.jpg', photoKeys: fotoKeys });

assert.equal(menu.products.length, 6);
assert.deepEqual(menu.categories.map((c) => c.label), ['Todos', 'Hambúrgueres', 'Acompanhamentos', 'Bebidas', 'Outros']);
const [a, b, batata, refri, sobremesa, semPreco] = menu.products;
assert.equal(a.id, 'hamburguer-a');
assert.equal(a.price, 29.9);
assert.equal(a.note, 'Pão, carne e queijo');
assert.equal(a.available, true);
assert.equal(a.image, '/brand/logo.jpg');                      // sem foto -> padrão
assert.equal(b.id, 'burger-b');
assert.equal(b.available, false);                              // "não"
assert.equal(b.price, 34.5);
assert.equal(b.image, '/images/b.jpg');
assert.equal(batata.price, null);                              // sem preço
assert.equal(batata.image, 'https://exemplo.com/batata.jpg');
assert.equal(refri.image, '/brand/logo.jpg');                  // foto inválida -> padrão
assert.equal(sobremesa.category, 'outros');
assert.equal(semPreco.available, true);                        // "9O" inválido -> considera disponível
assert.ok(menu.products.every((p) => !p.isDemo));

// opções do Hambúrguer A: ponto (obrigatório, único), adicionais (categoria), observação rápida (*)
assert.deepEqual(a.optionGroups.map((g) => g.id), ['ponto-da-carne', 'adicionais', 'observacao-rapida']);
const ponto = a.optionGroups[0];
assert.equal(ponto.required, true); assert.equal(ponto.multiple, false);
assert.equal(ponto.min, 1); assert.equal(ponto.max, 1);
assert.equal(ponto.help, 'Escolha o ponto');
assert.deepEqual(ponto.options.map((o) => o.label), ['Mal passada', 'Ao ponto', 'Bem passada']);
assert.equal(ponto.options[1].price, 0);                       // preço vazio -> 0
const adicionais = a.optionGroups[1];
assert.equal(adicionais.multiple, true); assert.equal(adicionais.required, false);
assert.equal(adicionais.min, 0); assert.equal(adicionais.max, 2);
assert.equal(adicionais.options[0].price, 5.5);
// o grupo "Adicionais" vale também para o Hambúrguer B (mesma categoria), que ainda tem o seu ponto da carne
assert.deepEqual(b.optionGroups.map((g) => g.id), ['adicionais', 'ponto-da-carne', 'observacao-rapida']);
// "*" vale para todo mundo
assert.ok(menu.products.every((p) => p.optionGroups.some((g) => g.id === 'observacao-rapida')));
// Refri: múltiplo obrigatório com min 5 e max 9, mas só 2 opções -> ajustado
const gelo = refri.optionGroups.find((g) => g.id === 'gelo');
assert.equal(gelo.min, 2); assert.equal(gelo.max, 2); assert.equal(gelo.required, true);
// opção com preço inválido pulou o grupo Molho da batata
assert.ok(!batata.optionGroups.some((g) => g.id === 'molho'));

assert.ok(menu.problems.some((t) => /Produto que não existe/.test(t)));
assert.ok(menu.problems.some((t) => /"abc"/.test(t)));
assert.ok(menu.warnings.some((t) => /Batata/.test(t) && /sem preço/.test(t)));
assert.ok(menu.warnings.some((t) => /foto-invalida/.test(t)));
assert.ok(menu.warnings.some((t) => /Sobremesa/.test(t) && /categoria/.test(t)));
assert.ok(menu.warnings.some((t) => /9O/.test(t)));

// ids repetidos
const repetidos = buildMenuFromSheets({ productsCsv: 'nome,categoria\nCombo,Combos\nCombo,Combos\n', fallbackImage: '/x.jpg' });
assert.deepEqual(repetidos.products.map((p) => p.id), ['combo', 'combo-2']);
assert.ok(repetidos.warnings.some((t) => /repete um id/.test(t)));

// coluna "nome" ausente e planilha vazia
const semNome = buildMenuFromSheets({ productsCsv: 'produto_x,categoria\nA,B\n', fallbackImage: '' });
assert.equal(semNome.products.length, 0);
assert.ok(semNome.problems.some((t) => /coluna "nome"/.test(t)));
assert.ok(buildMenuFromSheets({ productsCsv: '', fallbackImage: '' }).problems.length > 0);

// cabeçalhos com outros nomes, ponto e vírgula e preço em R$
const alt = buildMenuFromSheets({ productsCsv: 'Produto;Seção;Valor\nX-Burger;Lanches;R$ 18,00\n', fallbackImage: '' });
assert.equal(alt.products[0].name, 'X-Burger'); assert.equal(alt.products[0].price, 18); assert.equal(alt.products[0].category, 'lanches');

// aba de opções sem as colunas necessárias é ignorada
const semColunas = buildMenuFromSheets({ productsCsv: 'nome,categoria\nA,B\n', optionsCsv: 'x,y\n1,2\n', fallbackImage: '' });
assert.equal(semColunas.products[0].optionGroups.length, 0);
assert.ok(semColunas.problems.some((t) => /Opcoes faltam as colunas/.test(t)));

// texto malicioso fica como texto (a página escapa); só limitamos o tamanho
const longo = buildMenuFromSheets({ productsCsv: `nome,descricao\n${'N'.repeat(300)},${'d'.repeat(900)}\n<img src=x onerror=alert(1)>,b\n`, fallbackImage: '' });
assert.equal(longo.products[0].name.length, 100); assert.equal(longo.products[0].note.length, 500);
assert.equal(longo.products[1].name, '<img src=x onerror=alert(1)>');
// foto com javascript: não é aceita
const js = buildMenuFromSheets({ productsCsv: 'nome,foto\nA,javascript:alert(1)\nB,http://inseguro.com/a.jpg\n', fallbackImage: '/padrao.jpg' });
assert.equal(js.products[0].image, '/padrao.jpg'); assert.equal(js.products[1].image, '/padrao.jpg');

// --- endereços ---
assert.deepEqual(checkSheetUrl('', 'Produtos'), { url: null, problem: null });
assert.equal(checkSheetUrl('https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv').problem, null);
assert.match(checkSheetUrl('https://docs.google.com/spreadsheets/d/ABC/edit#gid=0').problem, /link de edição/);
assert.match(checkSheetUrl('http://docs.google.com/x?output=csv').problem, /https/);
assert.match(checkSheetUrl('https://exemplo.com/pagina').problem, /CSV/);
assert.equal(checkSheetUrl('/planilha-teste/produtos.csv').problem, null);
assert.equal(checkSheetUrl('https://exemplo.com/cardapio.csv').problem, null);

// --- baixar as duas abas ---
const arquivos = { 'https://x.com/p.csv': produtos, 'https://x.com/o.csv': opcoes };
const ok = await fetchSheetMenu({ sheet: { products: 'https://x.com/p.csv', options: 'https://x.com/o.csv' }, fetchText: async (url) => arquivos[url], fallbackImage: '/x.jpg', photoKeys: [] });
assert.equal(ok.ok, true); assert.equal(ok.menu.products.length, 6);
const semOpcoes = await fetchSheetMenu({ sheet: { products: 'https://x.com/p.csv', options: null }, fetchText: async (url) => arquivos[url], fallbackImage: '/x.jpg', photoKeys: [] });
assert.equal(semOpcoes.ok, true); assert.equal(semOpcoes.menu.products[0].optionGroups.length, 0);
const falha = await fetchSheetMenu({ sheet: { products: 'https://x.com/p.csv' }, fetchText: async () => { throw new Error('rede caiu'); }, fallbackImage: '', photoKeys: [] });
assert.equal(falha.ok, false); assert.match(falha.error, /rede caiu/);
const vazia = await fetchSheetMenu({ sheet: { products: 'https://x.com/p.csv' }, fetchText: async () => 'nome\n', fallbackImage: '', photoKeys: [] });
assert.equal(vazia.ok, false);
const semUrl = await fetchSheetMenu({ sheet: { products: null }, fetchText: async () => '', fallbackImage: '', photoKeys: [] });
assert.equal(semUrl.ok, false);
const urlRuim = await fetchSheetMenu({ sheet: { products: 'https://docs.google.com/spreadsheets/d/A/edit' }, fetchText: async () => '', fallbackImage: '', photoKeys: [] });
assert.equal(urlRuim.ok, false); assert.match(urlRuim.error, /edição/);

console.log('OK: leitor da planilha (todos os casos passaram)');
