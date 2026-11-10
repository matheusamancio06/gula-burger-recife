/**
 * Central source for owner supplied brand assets, photographs, public links and unit details.
 * Keep the current public links; replace pending fields only with owner-confirmed information.
 */
export const siteConfig = {
  brand: {
    name: 'Gula Burger Recife',
    logoPath: '/brand/gula-burger-logo.jpg',
    faviconPath: '/brand/gula-burger-logo.jpg',
    faviconIsOfficial: true,
  },
  // >>> ENDEREÇO DO SITE NA INTERNET. Preencha quando tiver o domínio, sem barra no final: 'https://www.exemplo.com.br'
  // Sem isto o site não consegue gerar os links completos que o Google e o WhatsApp exigem (imagem de prévia,
  // endereço canônico, sitemap). Passo a passo: docs/GOOGLE-E-COMPARTILHAMENTO.md · Conferir: npm run check:seo
  site: {
    url: null,
    locale: 'pt_BR',
  },
  seo: {
    // Quem pode indexar o site no Google.
    //   'auto' (padrão): só indexa quando NÃO há mais conteúdo demonstrativo (isDemo) nos cardápios.
    //   true  = sempre indexar;  false = nunca indexar.
    // A página /pedir/ nunca é indexada (é uma ferramenta de pedido, não conteúdo para busca).
    indexing: 'auto',
    // Imagem que aparece quando alguém compartilha o link (WhatsApp, Instagram, Facebook...). 1200 x 630 px, JPG, até ~300 KB.
    shareImage: {
      path: '/images/share.jpg',
      width: 1200,
      height: 630,
      alt: 'Hambúrguer com queijo, bacon e rúcula numa tábua de madeira, com batata-doce frita e molho, em um ambiente aconchegante',
    },
    pages: {
      site: {
        // <title> e descrição que aparecem no Google (até ~60 e ~160 caracteres).
        title: 'Gula Burger Recife | Hambúrguer em Casa Forte',
        description: 'Hambúrgueres da Gula Burger no Recife. Conheça os destaques da casa e venha à unidade de Casa Forte.',
        // Texto que aparece no cartão de compartilhamento (WhatsApp, Facebook...).
        shareTitle: 'Gula Burger Recife | A fome bateu? Vem de Gula!',
        shareDescription: 'Hambúrgueres no Recife: conheça os destaques e venha à unidade de Casa Forte.',
      },
      order: {
        title: 'Cardápio de pedidos | Gula Burger Recife',
        description: 'Cardápio de pedidos da Gula Burger Recife. Escolha seus itens e envie o pedido pelo WhatsApp.',
        // Usada enquanto o cardápio de pedidos ainda tiver itens demonstrativos (isDemo).
        descriptionDemo: 'Cardápio de pedidos da Gula Burger Recife em versão de demonstração: produtos e preços ainda não são os oficiais e nenhum pedido é enviado.',
      },
    },
  },
  links: {
    instagram: 'https://instagram.com/gulaburgerrecife',
    orderHub: 'https://linktr.ee/gulaburgercasaforte',
    // Página do cardápio de pedidos (pedir/index.html), separada do site.
    order: '/pedir/',
  },
  orders: {
    // >>> COLOQUE AQUI O WHATSAPP DA GULA QUANDO TIVER, entre aspas. Pode ser do jeito que foi copiado:
    //     '(81) 99999-9999'  ou  '81999999999'  ou  '+55 81 99999-9999'   (o 55 é acrescentado sozinho)
    // Enquanto for null, ou enquanto o cardápio de pedidos tiver itens `isDemo`, o envio do pedido fica bloqueado.
    // Passo a passo: docs/ATIVAR-PEDIDOS.md · Conferir o que falta: npm run check:pedidos
    whatsappNumber: null,
    // Modalidades oferecidas na revisão do pedido. Coloque false na que a Gula não fizer (ex.: delivery: false).
    services: { pickup: true, delivery: true },
    // >>> PAUSAR PEDIDOS (feriado, cozinha lotada, falta de insumo...). Mude, salve e publique de novo.
    //   all      true pausa todas as unidades;  units  pausa só as listadas, ex.: ['casa-forte']
    //   message  texto opcional para o cliente, ex.: 'Estamos com a cozinha lotada.'
    //   until    opcional: a pausa acaba sozinha nesse momento (fuso de Recife), ex.: '2026-12-25T18:00:00-03:00'
    // Com a pausa ligada o cliente ainda vê o cardápio e monta a sacola, mas não consegue enviar o pedido.
    pause: { all: false, units: [], message: '', until: null },
    // >>> CARDÁPIO PELA PLANILHA DO GOOGLE (a equipe muda pratos e preços sozinha, sem mexer no site).
    //   products  link CSV da aba "Produtos" (Arquivo > Compartilhar > Publicar na Web > aba Produtos > CSV)
    //   options   link CSV da aba "Opcoes" (opcional: ponto da carne, adicionais, tamanhos...)
    // Com `products` em null o site usa o cardápio fixo de src/order/orderMenu.js. Preenchido, o cardápio de /pedir/ vem da planilha
    // (se ela sair do ar, o site mostra o último cardápio salvo no aparelho do cliente). Passo a passo: docs/PLANILHA-DE-CARDAPIO.md ·
    // Conferir: npm run check:planilha
    menuSheet: { products: null, options: null },
  },
  // Fotos. localPath = arquivo local (em public/); sourceId = foto provisória do Unsplash.
  // formats = versões modernas já geradas ao lado do JPG (npm run otimizar:imagens). O site as usa com o JPG como reserva.
  photos: {
    hero: { sourceId: null, localPath: '/images/hero-bg.jpg', formats: ['avif', 'webp'] },
    heroMobile: { sourceId: null, localPath: '/images/hero-bg-mobile.jpg', formats: ['avif', 'webp'] },
    menuBurger: { sourceId: 'photo-1568901346375-23c9450c58cd', localPath: null },
    menuClassic: { sourceId: 'photo-1550547660-d9450f859349', localPath: null },
    menuCombo: { sourceId: 'photo-1571091718767-18b5b1457add', localPath: null },
    menuFries: { sourceId: 'photo-1573080496219-bb080dd4f877', localPath: null },
    promoBurger: { sourceId: 'photo-1561758033-d89a9ad46330', localPath: null },
    promoFries: { sourceId: 'photo-1573080496219-bb080dd4f877', localPath: null },
    promoDrink: { sourceId: 'photo-1544145945-f90425340c7e', localPath: null },
    about: { sourceId: 'photo-1550547660-d9450f859349', localPath: null },
  },
  // `schedule` = horário de funcionamento de cada unidade (fuso de Recife).
//   null  -> horário ainda não confirmado: o site mostra "Horários a confirmar" e NÃO bloqueia pedidos.
//   preenchido -> o site mostra "Aberto agora / Fechado agora" e o pedido só pode ser enviado com a unidade aberta.
// Preencha por dia da semana (sun, mon, tue, wed, thu, fri, sat) com faixas ['abre', 'fecha'] no formato 'HH:MM'.
// Dia que não aparece (ou []) = fechado. Se fechar depois da meia-noite, escreva o horário normal: ['18:00', '01:00'].
// EXEMPLO (não é o horário real da Gula):
//   schedule: {
//     tue: [['18:00', '23:00']], wed: [['18:00', '23:00']], thu: [['18:00', '23:00']],
//     fri: [['18:00', '23:30']], sat: [['12:00', '23:30']], sun: [['12:00', '22:00']],
//   },
  units: [
    {
      id: 'casa-forte',
      name: 'Casa Forte',
      address: 'Praça de Casa Forte, 409, loja 4',
      neighborhood: 'Casa Forte · Recife, PE',
      schedule: null,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+de+Casa+Forte%2C+409%2C+Recife',
      orderUrl: 'https://linktr.ee/gulaburgercasaforte',
    },
    // A unidade de Boa Viagem foi desativada e removida. Se abrir outra unidade, copie o bloco acima com um `id` novo:
    // o site (seção "Unidades", rodapé, hero), a página de pedidos (seletor de unidade) e o Google passam a listá-la sozinhos.
  ],
};

/** Lista de nomes em português: ['A'] -> "A"; ['A','B'] -> "A e B"; ['A','B','C'] -> "A, B e C" (conjunção "e" ou "ou"). */
export function joinList(items, conjunction = 'e') {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

// Fotos do cardápio da planilha podem vir como endereço direto (https://... ou /images/prato.jpg) em vez de uma chave de `photos`.
const isDirectImage = (key) => typeof key === 'string' && (/^https:\/\/\S+$/i.test(key) || /^\/(?!\/)\S*$/.test(key));

/** Set localPath to e.g. `/images/gula-hero.jpg` to serve a local approved photo. */
export function photoSrc(key, width = 850) {
  if (isDirectImage(key)) return key;
  const photo = siteConfig.photos[key];
  if (!photo) return '';
  if (photo.localPath) return photo.localPath;
  // auto=format: o Unsplash entrega WebP/AVIF sozinho aos navegadores que aceitam
  return `https://images.unsplash.com/${photo.sourceId}?auto=format&fit=crop&w=${width}&q=80`;
}

/** Lista de larguras para o navegador escolher a menor foto que serve (só para fotos remotas; locais devolvem undefined). */
export function photoSrcSet(key, widths) {
  if (isDirectImage(key)) return undefined;
  const photo = siteConfig.photos[key];
  if (!photo || photo.localPath) return undefined;
  return widths.map((width) => `${photoSrc(key, width)} ${width}w`).join(', ');
}

/** Versões modernas de uma foto local, na ordem em que o navegador deve preferir: [{ type, src }]. Vazio se não houver. */
export function photoFormats(key) {
  const photo = siteConfig.photos[key];
  if (!photo?.localPath || !photo.formats?.length) return [];
  const types = { avif: 'image/avif', webp: 'image/webp' };
  return photo.formats.map((format) => ({ type: types[format], src: photo.localPath.replace(/\.jpe?g$/i, `.${format}`) }));
}
