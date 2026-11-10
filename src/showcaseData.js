// Seção "Destaques" do SITE: uma vitrine que apresenta os alimentos da Gula Burger e não vende nada.
// Aqui NÃO há preço, opções, quantidade nem disponibilidade; quem faz o pedido é o cardápio da página /pedir/ (src/order/orderMenu.js).
//
// A seção mostra UM destaque grande no centro e os outros ao redor, em botões redondos. Ao clicar em um deles ele vai para o centro,
// e as cores da seção inteira mudam para as do produto escolhido (campo `theme`). Cabem até 7 destaques (MAX_HIGHLIGHTS).
//
// Os textos e fotos abaixo são provisórios. Para cada destaque, substitua por conteúdo aprovado pela Gula Burger:
//   name         nome do prato
//   category     rótulo pequeno que aparece junto do número (ex.: 'Hambúrgueres')
//   description  texto que apresenta o prato
//   ingredients  lista de ingredientes (ex.: ['Pão brioche', 'Blend bovino']); enquanto for null o site mostra "A confirmar"
//   image        chave da foto em siteConfig.photos. O ideal é uma foto com o prato bem centralizado: ela é cortada em círculo
//   theme        cores da seção quando este destaque está no centro:
//                  bg      cor de fundo, bem escura (para o texto branco ler bem)
//                  glow    cor da luz suave atrás do prato (um tom mais vivo da cor do prato)
//                  accent  cor dos detalhes em texto (clara; precisa ter contraste com o fundo)
// Remova `isDemo` de um destaque somente depois de colocar nome, descrição e foto oficiais.
export const MAX_HIGHLIGHTS = 7;

const pending = 'Descrição e composição oficiais a confirmar com a Gula Burger.';

export const showcaseItems = [
  { id: 'burger-01', name: 'Destaque da casa', category: 'Hambúrgueres', description: pending, ingredients: null, image: 'menuBurger', isDemo: true, theme: { bg: '#1a1008', glow: '#8a4a14', accent: '#ffb04d' } },
  { id: 'burger-02', name: 'Clássico Gula', category: 'Hambúrgueres', description: pending, ingredients: null, image: 'menuClassic', isDemo: true, theme: { bg: '#1f0e0b', glow: '#8f2f1f', accent: '#ff9a85' } },
  { id: 'burger-03', name: 'Hambúrguer demonstrativo 03', category: 'Hambúrgueres', description: pending, ingredients: null, image: 'menuCombo', isDemo: true, theme: { bg: '#12170a', glow: '#55691a', accent: '#d2e66f' } },
  { id: 'combo-02', name: 'Combo demonstrativo 02', category: 'Combos', description: 'Itens e composição oficiais a confirmar.', ingredients: null, image: 'promoBurger', isDemo: true, theme: { bg: '#1c1407', glow: '#94680f', accent: '#ffd34d' } },
  { id: 'side-01', name: 'Batata da casa', category: 'Acompanhamentos', description: pending, ingredients: null, image: 'menuFries', isDemo: true, theme: { bg: '#0e1520', glow: '#2f5078', accent: '#9bc9ff' } },
  { id: 'drink-01', name: 'Bebida demonstrativa 01', category: 'Bebidas', description: 'Opções disponíveis a confirmar.', ingredients: null, image: 'promoDrink', isDemo: true, theme: { bg: '#0a1b1b', glow: '#1f7d6f', accent: '#68e3d2' } },
];
