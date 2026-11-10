// NOTA: se siteConfig.orders.menuSheet estiver preenchido, o cardápio de /pedir/ vem da planilha do Google (docs/PLANILHA-DE-CARDAPIO.md)
// e este arquivo só serve de cardápio fixo quando não há planilha configurada.
// Cardápio de PEDIDOS (página /pedir/). É independente da vitrine do site (src/showcaseData.js):
// aqui ficam produtos, preços, opções e disponibilidade usados para montar o pedido.
// Os dados abaixo são fictícios. Substitua por dados aprovados pela Gula Burger e só então remova `isDemo`.
// Passo a passo completo: docs/ATIVAR-PEDIDOS.md. Para conferir o que ainda falta: npm run check:pedidos
//
// MODELO DE PRODUTO REAL (copie dentro de `demoProducts`, ajuste os valores e apague os demonstrativos):
//   {
//     id: 'burger-exemplo',               // único, sem espaços nem acentos
//     name: 'Nome do produto',
//     category: 'burgers',                // um dos ids de orderCategories (menos 'all')
//     note: 'Descrição aprovada pela Gula.',
//     image: 'menuClassic',               // chave de siteConfig.photos
//     price: 29.9,                        // em reais (número); null mostra "Valor a confirmar"
//     available: true,                    // false = ESGOTADO: aparece no cardápio, mas não dá para pedir (volte para true depois)
//     optionGroups: [                     // opcional: personalizações do produto
//       { id: 'ponto', label: 'Ponto da carne', help: '', required: true, multiple: false, min: 1, max: 1,
//         options: [{ id: 'opcao-1', label: 'Opção 1', price: 0 }, { id: 'opcao-2', label: 'Opção 2', price: 0 }] },
//       { id: 'extras', label: 'Adicionais', help: '', required: false, multiple: true, min: 0, max: 2,
//         options: [{ id: 'extra-1', label: 'Adicional 1', price: 5 }, { id: 'extra-2', label: 'Adicional 2', price: 3 }] },
//     ],
//   }
// Produtos reais NÃO levam `isDemo`. Quando nenhum produto tiver `isDemo` e o WhatsApp estiver configurado em
// src/siteConfig.js, o botão de enviar o pedido é liberado sozinho.
export const orderCategories = [
  { id: 'all', label: 'Todos' },
  { id: 'burgers', label: 'Hambúrgueres' },
  { id: 'combos', label: 'Combos' },
  { id: 'sides', label: 'Acompanhamentos' },
  { id: 'drinks', label: 'Bebidas' },
];

const demoNote = 'Descrição e composição oficiais a confirmar com a Gula Burger.';

const demoProducts = [
  { id: 'burger-01', name: 'Destaque da casa', category: 'burgers', note: demoNote, image: 'menuBurger', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'burger-02', name: 'Clássico Gula', category: 'burgers', note: demoNote, image: 'menuClassic', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'burger-03', name: 'Hambúrguer demonstrativo 03', category: 'burgers', note: demoNote, image: 'menuCombo', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'burger-04', name: 'Hambúrguer demonstrativo 04', category: 'burgers', note: demoNote, image: 'menuBurger', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'combo-01', name: 'Combo para compartilhar', category: 'combos', note: 'Itens e composição oficiais a confirmar.', image: 'menuCombo', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'combo-02', name: 'Combo demonstrativo 02', category: 'combos', note: 'Itens e composição oficiais a confirmar.', image: 'promoBurger', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'combo-03', name: 'Combo demonstrativo 03', category: 'combos', note: 'Itens e composição oficiais a confirmar.', image: 'menuClassic', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'side-01', name: 'Batata da casa', category: 'sides', note: 'Descrição e composição oficiais a confirmar.', image: 'menuFries', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'side-02', name: 'Acompanhamento demonstrativo 02', category: 'sides', note: 'Descrição e composição oficiais a confirmar.', image: 'promoFries', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'side-03', name: 'Acompanhamento demonstrativo 03', category: 'sides', note: 'Descrição e composição oficiais a confirmar.', image: 'menuBurger', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'drink-01', name: 'Bebida demonstrativa 01', category: 'drinks', note: 'Opções disponíveis a confirmar.', image: 'promoDrink', price: null, isDemo: true, availability: null, orderUrl: null },
  { id: 'drink-02', name: 'Bebida demonstrativa 02', category: 'drinks', note: 'Opções disponíveis a confirmar.', image: 'promoDrink', price: null, isDemo: true, availability: null, orderUrl: null },
];

// Opções genéricas, só para demonstrar o fluxo de personalização. Cada produto real traz as suas em `optionGroups`.
const demoOptionGroups = [
  {
    id: 'demo-choice',
    label: 'Escolha demonstrativa',
    help: 'Opções ilustrativas — não representam ingredientes ou variações reais.',
    required: true,
    multiple: false,
    min: 1,
    max: 1,
    options: [
      { id: 'demo-a', label: 'Opção demonstrativa A', price: null },
      { id: 'demo-b', label: 'Opção demonstrativa B', price: null },
    ],
  },
  {
    id: 'demo-extras',
    label: 'Adicionais demonstrativos',
    help: 'Seleção opcional ilustrativa; valores aguardam confirmação.',
    required: false,
    multiple: true,
    min: 0,
    max: 2,
    options: [
      { id: 'extra-a', label: 'Adicional demonstrativo 1', price: null },
      { id: 'extra-b', label: 'Adicional demonstrativo 2', price: null },
      { id: 'extra-c', label: 'Adicional demonstrativo 3', price: null },
    ],
  },
];

// Produto demonstrativo sem `optionGroups` recebe as opções genéricas; produto real sem `optionGroups` não tem personalização.
export const orderMenu = demoProducts.map((product) => ({
  ...product,
  optionGroups: product.optionGroups ?? (product.isDemo ? demoOptionGroups : []),
}));
