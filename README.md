# Gula Burger Recife

Landing page institucional para a Gula Burger Recife, construída em React + Vite com identidade preto, amarelo e branco. Esta entrega é uma demonstração visual; ainda não tem backend, checkout ou cardápio comercial confirmado.

## Como executar

Requisitos: Node.js e npm.

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar no terminal, normalmente `http://localhost:5173/` (site) e `http://localhost:5173/pedir/` (cardápio de pedidos). Não abra `index.html` pelo Live Server na porta 5500: o Vite precisa processar os módulos React e JSX.

Para validar ou gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Dois cardápios separados

- **Destaques (site, `/#destaques`)**: a seção "Destaques da Gula" só apresenta os alimentos. Um prato grande fica no centro, os outros em botões redondos ao redor; ao clicar em um botão (ou usar Anterior/Próximo, as setas do teclado ou deslizar o dedo) o prato vai para o centro, o texto muda e as cores da seção inteira acompanham o produto. Não tem preço, sacola, quantidade nem opções; todos os caminhos para pedir levam ao cardápio de pedidos. Dados em `src/showcaseData.js` (até 7 destaques, cada um com seu `theme` de cores), componente em `src/Destaques.jsx`.
- **Cardápio de pedidos (`/pedir/`)**: página própria (`pedir/index.html`, entrada `src/order/main.jsx`), com pacote, dados e estilos separados do site. É onde ficam busca, categorias, personalizações, observações, quantidades, sacola e revisão do pedido, com persistência no navegador. Dados em `src/order/orderMenu.js`, componente em `src/order/OrderApp.jsx`. `/pedir` e `/cardapio` (sem a barra final) redirecionam para `/pedir/`.

Os produtos de ambos seguem fictícios e a revisão do pedido bloqueia qualquer envio. Para consultar a Gula, use o Linktree oficial exibido na página.

### Pedidos pelo WhatsApp

Na revisão do pedido, o cliente informa unidade, retirada ou entrega, nome e (na entrega) endereço, e o botão **Enviar pedido pelo WhatsApp** abre a conversa com a mensagem pronta (itens, opções, observações e total). O pedido só é enviado quando o cliente toca em "Enviar" no WhatsApp. O envio só é liberado quando:

1. `siteConfig.orders.whatsappNumber` (em `src/siteConfig.js`) tem o número da Gula, em qualquer formato (`'(81) 99999-9999'`, `'81999999999'`...); e
2. os produtos de `src/order/orderMenu.js` já estão aprovados, ou seja, sem `isDemo` e com `price` preenchido.

**Horário de funcionamento:** preenchendo `schedule` em cada unidade (`siteConfig.units`), o site mostra "Aberto agora / Fechado agora" e bloqueia o envio do pedido enquanto a unidade escolhida estiver fechada (fuso de Recife; aceita fechar depois da meia-noite e pausas no dia). Com `schedule: null` nada é bloqueado. A lógica fica em `src/hours.js`.

**Pausar pedidos e item esgotado:** `siteConfig.orders.pause` pausa todas ou só algumas unidades, com mensagem opcional e retomada automática (`until`); o site mostra uma faixa de aviso e o envio fica bloqueado. `available: false` em um produto de `src/order/orderMenu.js` marca o item como esgotado. A regra "pausa + horário" está em `src/availability.js`; os exemplos estão em `docs/ATIVAR-PEDIDOS.md`.

Enquanto isso não acontece, a página continua em modo demonstrativo: avisa que é uma simulação e bloqueia o envio. Ao remover `isDemo`, os textos de "demonstração" somem sozinhos. A montagem da mensagem fica em `src/order/whatsapp.js`.

**Está tudo pronto, falta só o número e o cardápio real.** O cardápio pode ser mantido pela equipe numa **planilha do Google**, sem mexer no site (`docs/PLANILHA-DE-CARDAPIO.md`). Para ver o que falta, rode `npm run check:pedidos`. O passo a passo para ativar está em [`docs/ATIVAR-PEDIDOS.md`](docs/ATIVAR-PEDIDOS.md).

## O que já foi feito

- Hero responsivo com fotografia de fundo (`public/images/hero-bg.jpg`, com versões AVIF e WebP, configurada em `siteConfig.photos.hero`), exibida sem degradê nem filtro por cima (no celular e no tablet, até 900 px, usa a versão vertical `public/images/hero-bg-mobile.jpg`, que ocupa a hero inteira com o hambúrguer embaixo e o texto em cima; a altura reservada ao hambúrguer é medida pelo tamanho do texto, então o texto não passa por cima dele em nenhum tamanho de tela), selo "Hoje é dia de Gula", barra inferior com a frase da marca e animação suave.
- Cabeçalho fixo e **transparente sobre a hero**: no topo ele flutua sobre a foto (o nome da marca fica sobre uma base de vidro escuro para ler bem sobre as luzes) e ganha o fundo escuro ao rolar ou ao abrir o menu no celular. Navegação desktop e menu mobile com seção ativa. O logo enviado é um JPG com fundo preto, por isso aparece como um selo arredondado; com um logo em PNG/SVG transparente ele pode aparecer sem o selo, como em muitos sites de referência.
- Faixa de diferenciais com ícones SVG próprios.
- Faixa animada da marca (a frase se repete o bastante para preencher qualquer largura, até 4K, e as pontas esmaecem; com "reduzir animações" ligado no sistema ela fica parada e a frase quebra em linhas centralizadas, sem cortar as pontas no celular), seção promocional, apresentação da marca, unidades e rodapé.
- Seção Destaques no site com 6 itens de demonstração em carrossel circular (prato central, botões redondos ao redor e cores que mudam com o produto), com teclado, deslizar e leitor de tela, sem pedido, preço ou quantidade.
- **Cardápio pela planilha do Google:** a equipe edita pratos, preços, opções e "esgotado" numa planilha publicada como CSV e `/pedir/` se atualiza em poucos minutos, sem publicar de novo. Se a planilha sair do ar, o site mostra a última versão salva no aparelho do cliente (até 3 dias) e, sem ela, avisa "Cardápio indisponível" (nunca o de demonstração). Conferir: `npm run check:planilha`; testes: `npm run test:planilha`. Guia: `docs/PLANILHA-DE-CARDAPIO.md`. Ainda não testado com uma planilha publicada no Google de verdade.
- Página `/pedir/` separada do site para testar busca, filtros, opções configuráveis, sacola editável e revisão bloqueada, com persistência local.
- **Unidade única:** a unidade de Boa Viagem foi desativada e removida do site, dos pedidos e dos dados do Google. Hoje só existe Casa Forte (`siteConfig.units`); com uma unidade só, os textos ficam no singular e `/pedir/` já a deixa selecionada. Se abrir outra unidade, basta acrescentar um bloco em `siteConfig.units`: o site, o seletor de pedidos e o Google passam a listá-la sozinhos.
- Seleção de unidade persistente (quando houver mais de uma), opções obrigatórias sem pré-seleção automática e revisão que inclui personalizações e observações.
- Logo enviada aplicada no cabeçalho, rodapé e favicon.
- Links para Instagram, Linktree e mapa de Casa Forte.
- SEO e prévia de compartilhamento: título e descrição para o Google, Open Graph, imagem 1200 × 630, dados estruturados das unidades, `robots.txt`, `sitemap.xml` e `noindex` automático enquanto houver conteúdo demonstrativo (veja `docs/GOOGLE-E-COMPARTILHAMENTO.md` e `npm run check:seo`).
- Acessibilidade básica: foco visível, navegação por teclado e respeito a movimento reduzido.
- Capturas mobile e desktop em `artifacts/review/`, incluindo `artifacts/review/phase6/` e `artifacts/review/phase7/` (pasta só local, fora do GitHub).

## Desempenho (fotos e fontes)

- **Fotos locais em AVIF e WebP** (com o JPG de reserva para navegadores antigos): a foto principal passou de 228 KB para 59 KB no computador e de 203 KB para 50 KB no celular, sem diferença visível. Gerar versões de uma foto nova: `npm run otimizar:imagens`.
- **Fontes hospedadas no próprio site** (sem Google Fonts): menos uma consulta externa que bloqueava o carregamento, e 111 KB no total contra cerca de 216 KB antes, porque o DM Sans passou a ser um único arquivo variável. As duas fontes do topo são pré-carregadas no build.
- **Fotos provisórias do Unsplash** nos cards agora pedem o tamanho certo para cada tela (`srcset`), em vez de sempre baixar a versão grande.
- `npm run check:desempenho` confere tudo isso (formatos declarados existem, nada de Google Fonts, pré-carga apontando para arquivos reais).

## Legibilidade e acessibilidade

- **Tamanho do texto:** nenhum texto abaixo de 12 px (apoio e rótulos 12 a 13 px, descrições 14 a 15 px, títulos maiores). Ao criar novos estilos em `src/styles/`, respeite esse mínimo; `npm run check:legibilidade` falha se encontrar algo menor.
- **Contraste:** todo texto tem pelo menos 4,5:1 contra o fundo (3:1 nos títulos grandes), medido nas páginas do site e dos pedidos. Os cinzas sobre fundo claro foram escurecidos e o amarelo de destaque não é usado como cor de texto sobre fundo claro.
- **Teclado e leitor de tela:** link "Pular para o conteúdo" (e "Pular para o cardápio" em `/pedir/`) ao apertar Tab; foco visível em dois anéis (preto + amarelo), que aparece em fundo claro e escuro; ícones e enfeites decorativos escondidos do leitor de tela.
- **Tablet estreito (até 860 px):** o menu vira botão (hambúrguer) para o texto maior caber.
- **Conferência de layout:** o site foi percorrido em larguras de 320 a 2560 px, com animações ligadas e com "reduzir animações", procurando texto cortado, elementos fora da tela e textos sobrepostos (hero, faixa animada, diferenciais, Destaques, promo, unidades, rodapé e `/pedir/`). A auditoria usada está em `scripts/auditoria-de-layout.js` (instruções no topo do arquivo: cola no console do navegador e mostra o que está cortado ou sobreposto naquela largura). Rode nela sempre que mudar textos, fontes ou fotos, e confira também o modo "reduzir animações", que muda a faixa da marca. Ao mexer em textos da hero, no tamanho de fontes ou em fotos, confira de novo no celular (ex.: 360, 393 e 430 px) e no tablet (ex.: 768 e 900 px). O item ativo do menu acompanha a rolagem, inclusive "Contato" no fim da página.
- **"Reduzir animações":** se o Windows, o macOS ou o celular estiver com animações reduzidas, o site respeita isso: a faixa da marca e o giro dos Destaques não se movem. Para ver o movimento ao testar, desligue essa opção do sistema.

## Kit comercial (PDFs para vender o site)

> A pasta `comercial/` fica **só no computador de quem a criou**: está no `.gitignore` e não vai para o GitHub, porque tem o plano de vendas interno, preços e contatos. Os comandos `npm run comercial:*` só funcionam onde ela existe.

A pasta `comercial/` tem três PDFs prontos, no mesmo raciocínio dos do Ponto da Costela: **plano de prospecção** (14 páginas, interno), **valores** (4 páginas) e **proposta** (11 páginas, para o cliente). A primeira versão do kit (prospecção, apresentação em slides e plano) fica em `comercial/pdf/versao-1/`. Confira os preços e os dados em `comercial/dados.js` e rode `npm run comercial:pdf`. As telas vêm do site de verdade (`npm run comercial:capturar` atualiza). Guia completo e avisos antes de enviar em `comercial/README.md`.

## Onde atualizar

- Canais, logo, fotografias e dados das unidades: `src/siteConfig.js`.
- Destaques do site (nome, descrição, ingredientes, foto, categoria e cores de cada alimento): `src/showcaseData.js`.
- Cardápio de pedidos (produtos, preços, opções, adicionais e disponibilidade): pela **planilha do Google** (`docs/PLANILHA-DE-CARDAPIO.md`, `npm run check:planilha`) ou, sem planilha, em `src/order/orderMenu.js`.
- Identidade, assets locais, conteúdo oficial e publicação: `docs/ASSETS-E-DADOS-OFICIAIS.md`.

Os produtos atuais têm `isDemo: true`, sem preço comercial confirmado, e não podem ser pedidos de fato. Só remova a marcação demonstrativa depois de inserir informações aprovadas e confirmar os dados e o canal oficial de atendimento.

## Pendências para publicação

- Cardápio real, preços e descrições aprovados pelo proprietário, nos dois arquivos (`src/showcaseData.js` e `src/order/orderMenu.js`).
- Informar o número de WhatsApp que recebe os pedidos (`siteConfig.orders.whatsappNumber`) e o cardápio real com preços (`src/order/orderMenu.js`): sem isso a revisão do pedido em `/pedir/` não envia nada.
- Na hospedagem, servir `pedir/index.html` em `/pedir/` (a maioria dos serviços de hospedagem estática já faz isso).
- Horário de funcionamento da unidade de Casa Forte (`schedule` em `siteConfig.units`, que também ativa o bloqueio de pedidos fora do horário).
- Fotografias oficiais hospedadas localmente; as das seções abaixo da hero são ilustrativas e carregadas do Unsplash. A foto de fundo da hero já é local, mas confirme se é uma imagem autorizada para uso comercial.
- Domínio de produção: preencher `site.url` em `src/siteConfig.js` (libera imagem de prévia com link completo, endereço canônico e sitemap) e cadastrar o site no Google Search Console e as unidades no Perfil da Empresa no Google.
- Verificar se a logo JPG enviada tem uma versão vetorial ou PNG de alta resolução para uso futuro.
