# Cardápio pela planilha do Google

Com a planilha ligada, a equipe da casa muda **pratos, preços, descrições, opções e o "esgotado"** direto numa planilha do Google, e a página `/pedir/` se atualiza sozinha em poucos minutos, **sem mexer no site e sem publicar de novo**.

O que continua no código (não vem da planilha): os **Destaques** da página inicial (`src/showcaseData.js`), o **horário de funcionamento**, a **pausa de pedidos** e o **número do WhatsApp** (`src/siteConfig.js`).

Enquanto os links da planilha não forem preenchidos, o site usa o cardápio fixo de `src/order/orderMenu.js`, como antes.

## Passo a passo (uma vez)

### 1. Criar a planilha com o modelo

1. Crie uma planilha nova no Google Sheets.
2. **Arquivo > Importar > Enviar** e escolha [`docs/planilha-modelo/produtos.csv`](planilha-modelo/produtos.csv). Em "Local de importação", escolha **Substituir planilha atual**. Renomeie a aba para `Produtos`.
3. Crie uma segunda aba (botão **+** embaixo) e importe [`docs/planilha-modelo/opcoes.csv`](planilha-modelo/opcoes.csv) com **Substituir planilha atual**. Renomeie para `Opcoes`. A aba de opções é opcional: sem ela os produtos não têm personalização.
4. Troque os exemplos pelo cardápio real da casa (veja "O que preencher" abaixo).

### 2. Publicar cada aba como CSV

Para cada aba (`Produtos` e, se usar, `Opcoes`):

1. **Arquivo > Compartilhar > Publicar na Web**.
2. Em "Link", escolha a **aba** (não "Documento inteiro") e, ao lado, o formato **Valores separados por vírgula (.csv)**.
3. Clique em **Publicar** e copie o link. Ele termina em `output=csv`.

> **Atenção:** só o que está nas abas publicadas fica público para quem tiver o link. Não coloque nelas custos, telefones pessoais ou qualquer coisa interna. Outras abas da planilha não são publicadas, e você pode usar uma aba separada para anotações.

### 3. Colar os links no site

Em [`src/siteConfig.js`](../src/siteConfig.js):

```js
orders: {
  menuSheet: {
    products: 'https://docs.google.com/spreadsheets/d/e/....../pub?gid=0&single=true&output=csv',
    options: 'https://docs.google.com/spreadsheets/d/e/....../pub?gid=123456&single=true&output=csv',
  },
},
```

### 4. Conferir

```bash
npm run check:planilha
```

Mostra os produtos que o site vai exibir, por categoria, e lista o que está errado (linha ignorada) ou esquecido (sem preço, sem descrição). Depois abra `/pedir/` e confira. Com `--strict`, o comando falha se houver algum problema.

Publique o site uma vez (`npm run build` e subir). Daí em diante, **editar a planilha basta**.

## O que preencher

Os nomes das colunas não diferenciam maiúsculas nem acentos, e a ordem das colunas é livre.

### Aba `Produtos` (uma linha por produto)

| Coluna | O que é |
| --- | --- |
| `nome` | Nome do produto. **Obrigatório.** |
| `categoria` | Aparece como botão de filtro. Escreva igual em todos os produtos da categoria (ex.: `Hambúrgueres`). Categorias novas aparecem sozinhas, na ordem em que surgem. |
| `descricao` | Texto curto sob o nome. |
| `preco` | `29,90`, `R$ 29,90` ou `29.90`. Vazio mostra "Valor a confirmar". |
| `disponivel` | `sim` ou `não`. **`não` = esgotado**: o item continua no cardápio, em cinza, e não dá para pedir. Vazio = disponível. |
| `foto` | Opcional. Um endereço `https://...` ou o caminho de uma foto do projeto (ex.: `/images/picanha.jpg`, com o arquivo em `public/images/`). Vazio usa a logo da Gula. |
| `id` | Opcional. Só precisa se dois produtos tiverem o mesmo nome. |

Linhas em branco são ignoradas, e linhas que começam com `#` são comentários.

### Aba `Opcoes` (uma linha por opção)

Cada linha é **uma opção de um grupo** (ex.: "Ponto da carne: Ao ponto"). As linhas de um mesmo grupo repetem o nome do grupo.

| Coluna | O que é |
| --- | --- |
| `aplica a` | A quem vale: o **nome do produto**, o **nome de uma categoria** (vale para todos dela) ou `*` (vale para todos). |
| `grupo` | Nome da pergunta (ex.: `Ponto da carne`, `Adicionais`, `Tamanho`). |
| `obrigatorio` | `sim` = o cliente precisa escolher para continuar. |
| `multiplo` | `sim` = pode marcar mais de uma (caixas). `não` = escolhe uma só (bolinhas). |
| `min` / `max` | Só para grupos múltiplos: quantas pode marcar no mínimo e no máximo. Vazio = de 0 (ou 1, se obrigatório) até o número de opções. |
| `opcao` | Nome da opção (ex.: `Ao ponto`). |
| `preco` | **Valor somado ao preço do produto** (`0` ou vazio = sem custo). |
| `ajuda` | Texto de apoio do grupo (basta na primeira linha dele). |

**Tamanhos com preços diferentes:** deixe o preço do produto como o do menor tamanho e crie um grupo obrigatório `Tamanho`, com `500 g` a `0` e `1 kg` com a diferença (ex.: `55` se for R$ 125 e R$ 180).

## Quando aparece a mudança

O Google atualiza o link publicado a cada poucos minutos (cerca de 5), então uma edição pode demorar um pouco. Clientes com `/pedir/` já aberta veem a mudança ao recarregar a página. Para tirar um item do ar na hora, marque `não` em `disponivel` e aguarde esses minutos.

## E se algo der errado

- **Linha com erro** (sem nome, produto de opção que não existe, preço de opção inválido): essa linha é ignorada, o resto funciona. `npm run check:planilha` diz qual.
- **Preço inválido ou ausente no produto:** aparece "Valor a confirmar" e o total do pedido fica "a confirmar".
- **Planilha fora do ar ou link quebrado:** o site mostra a **última versão salva no aparelho do cliente** (por até 3 dias), com um aviso de que os preços podem ter mudado. Se o cliente nunca abriu o cardápio, aparece "Cardápio indisponível" com o botão de tentar de novo. O site **nunca** volta a mostrar o cardápio de demonstração no lugar do real.
- **Tentou abrir `/pedir/` e ficou no "Carregando o cardápio…"?** A página espera a planilha por até 6 segundos e então usa as cópias acima.

## Detalhes úteis

- Os textos da planilha são mostrados como texto simples (não executam nada) e têm tamanho limitado (nome 100 caracteres, descrição 500).
- A sacola do cliente fica guardada no aparelho dele. Se um produto sair da planilha, ele some da sacola; preços sempre vêm da planilha na hora.
- Com a planilha funcionando, o `npm run check:pedidos` e o build (Google/SEO) passam a tratar o cardápio de pedidos como real. O site da página inicial continua marcado como demonstração enquanto os **Destaques** (`src/showcaseData.js`) tiverem `isDemo`.
- Para o pedido ser liberado de verdade ainda é preciso o **número do WhatsApp** (`docs/ATIVAR-PEDIDOS.md`).
- Se o link CSV tiver um erro, o `check:planilha` explica. Links de edição da planilha (`.../edit`) **não funcionam**: use sempre o de "Publicar na Web".

## O que foi e o que não foi testado

Testado: o leitor da planilha (testes automáticos em `npm run test:planilha`), a página `/pedir/` lendo CSVs de exemplo (desenvolvimento e versão de produção), a edição de preço, disponibilidade e produto novo, e as reservas (última cópia salva e "indisponível"). **Ainda não foi testado com uma planilha publicada no Google de verdade.** Faça esse primeiro teste com uma planilha de teste sua, seguindo o passo a passo acima, antes de usar com um cliente.
