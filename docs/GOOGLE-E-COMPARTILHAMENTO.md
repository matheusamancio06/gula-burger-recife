# Google e prévia de compartilhamento

O site já está preparado para aparecer bem no Google e para mostrar um cartão bonito (foto + título) quando alguém compartilhar o link no WhatsApp, Instagram ou Facebook. Falta só o **endereço do site (domínio)** e o **conteúdo real**. Para ver o que falta a qualquer momento:

```bash
npm run check:seo
```

## O que já está pronto

- **Título e descrição para o Google** de cada página, em [`src/siteConfig.js`](../src/siteConfig.js) (`seo.pages`). O título do site tem as palavras que as pessoas buscam ("Hambúrguer em Casa Forte"); o cartão de compartilhamento mantém o slogan "A fome bateu? Vem de Gula!".
- **Imagem de prévia** 1200 × 630 px (128 KB) em `public/images/share.jpg`, feita da foto principal com o logo no canto. Para trocar, mantenha o tamanho e o peso (até ~300 KB) e ajuste `seo.shareImage` se mudar o nome do arquivo.
- **Dados estruturados** (JSON-LD, o "cartão" que o Google lê): marca com Instagram e Linktree, e uma entrada de restaurante para cada unidade que tem **endereço**. Hoje só a Casa Forte aparece (a unidade de Boa Viagem foi desativada); uma unidade nova entra sozinha quando for acrescentada em `siteConfig.units` com endereço. Se a unidade tiver `schedule` (horário), ele também vai para o Google, que passa a mostrar "aberto agora".
- **Ícones** do navegador e do celular (`public/favicon-48.png`, `public/apple-touch-icon.png`), gerados a partir do logo. Se trocar o logo ou a foto principal, gere a imagem de prévia e os ícones de novo com `powershell -File scripts/gerar-imagens-de-compartilhamento.ps1` (Windows).
- **`robots.txt`** e **`sitemap.xml`** criados sozinhos no `npm run build`.

Tudo isso é montado a partir da configuração; nada é inventado. Só vai para o Google o que está preenchido.

## Quando tiver o domínio

1. Em `src/siteConfig.js`, preencha `site.url` sem barra no final, por exemplo `url: 'https://www.gulaburger.com.br'`. Isso libera: endereço canônico, `og:image` e `og:url` com link completo (o WhatsApp e o Facebook só aceitam link completo), logo e imagem nos dados estruturados, e o `sitemap.xml`.
2. Publique em um serviço com **https** (Vercel, Netlify, Cloudflare Pages...) e aponte o domínio.
3. Rode `npm run check:seo` e resolva o que aparecer em "FALTA PARA FUNCIONAR".

## Por que o site está em "noindex" por enquanto

`seo.indexing` está em `'auto'`: o site **só pede para o Google indexar quando não houver mais conteúdo demonstrativo** (itens com `isDemo` em `src/showcaseData.js` e `src/order/orderMenu.js`). Assim textos como "Descrição oficial a confirmar" não viram o resultado que o Google mostra para a marca. O build avisa isso no final (`[SEO] Site marcado como noindex: ...`).

- Quando todos os itens forem reais, a indexação é liberada sozinha.
- Para forçar (por exemplo, publicar já com a vitrine provisória), use `indexing: true`; para bloquear de vez, `false`.
- A página `/pedir/` **nunca** é indexada (é uma ferramenta de pedido). Ela continua com prévia de compartilhamento normal.

## Depois de publicar (passo a passo)

1. **Testar a prévia:** cole o link do site em uma conversa de WhatsApp (ou no [Depurador de Compartilhamento do Facebook](https://developers.facebook.com/tools/debug/)) e confira foto, título e descrição. Se o WhatsApp mostrar uma versão antiga, é cache: ele atualiza depois de algum tempo ou ao trocar o link.
2. **Testar os dados estruturados:** cole o endereço no [Teste de Resultados Relevantes do Google](https://search.google.com/test/rich-results) e veja se a marca e as unidades aparecem sem erro.
3. **Google Search Console** (grátis): adicione o site, confirme que é seu e envie `https://SEU-DOMINIO/sitemap.xml`. É lá que você vê se o Google indexou e por quais buscas as pessoas chegam.
4. **Perfil da Empresa no Google** (antigo Google Meu Negócio), um por unidade: é o que mais ajuda em buscas como "hamburgueria perto de mim" e no Google Maps. Use o mesmo nome, endereço e telefone do site, coloque o link do site, o horário (o mesmo do `schedule`) e fotos. A categoria é "Hamburgueria".
5. **Divulgar o link** no Instagram (bio), no Linktree e em onde mais a marca aparece; links de sites conhecidos ajudam a subir nos resultados.

## Observações técnicas

- O site é uma aplicação em React. O Google executa JavaScript e lê o conteúdo, mas o WhatsApp e as redes sociais **não** executam; por isso título, descrição e imagem de prévia são colocados no HTML na hora do build (`vite.config.js` + `src/seo.js`), e não pelo React.
- Para mudar textos de busca ou de compartilhamento, edite `seo.pages` em `src/siteConfig.js` e rode o build de novo.
- O `<title>` ideal tem até ~60 caracteres e a descrição entre 70 e 160; o `npm run check:seo` avisa se passar.
