# Como ativar os pedidos pelo WhatsApp

Tudo já está construído. Hoje a página `/pedir/` está em **modo demonstrativo** (avisa que é simulação e bloqueia o envio). Ela passa sozinha para o **modo real** quando duas coisas estiverem verdadeiras:

1. o número de WhatsApp da Gula estiver configurado; e
2. nenhum produto do cardápio de pedidos tiver `isDemo`.

Para ver o que falta a qualquer momento:

```bash
npm run check:pedidos
```

## Passo a passo

### 1. Colocar o número do WhatsApp

Abra [`src/siteConfig.js`](../src/siteConfig.js) e troque `null` pelo número, entre aspas:

```js
orders: {
  whatsappNumber: '(81) 99999-9999',
},
```

Qualquer formato copiado serve: `'(81) 99999-9999'`, `'81999999999'` ou `'+55 81 99999-9999'`. O DDI 55 é acrescentado sozinho. Se o número não for válido, o `npm run check:pedidos` avisa.

### 2. Cadastrar o cardápio real

> **Jeito mais fácil: pela planilha do Google.** A equipe da casa cadastra e muda pratos, preços, opções e o "esgotado" numa planilha, e o site se atualiza sozinho, sem publicar de novo. Passo a passo em [`docs/PLANILHA-DE-CARDAPIO.md`](PLANILHA-DE-CARDAPIO.md) (conferir com `npm run check:planilha`). Com a planilha ligada, esta etapa e o `orderMenu.js` abaixo não são necessários. Se preferir o cardápio dentro do código, siga abaixo.

Abra [`src/order/orderMenu.js`](../src/order/orderMenu.js). No topo há um **modelo de produto real** em comentário. Em resumo, cada produto tem:

| Campo | O que é |
| --- | --- |
| `id` | identificador único, sem espaços nem acentos |
| `name`, `note` | nome e descrição aprovados pela Gula |
| `category` | `burgers`, `combos`, `sides` ou `drinks` |
| `image` | chave da foto em `siteConfig.photos` (veja `docs/ASSETS-E-DADOS-OFICIAIS.md`) |
| `price` | preço em reais, como número (`29.9`); `null` mostra "Valor a confirmar" |
| `optionGroups` | personalizações (ponto da carne, adicionais...), cada opção com seu `price` (use `0` se não tiver custo) |

Substitua os 12 produtos demonstrativos pelos reais. **Produtos reais não levam `isDemo`.** Em cada grupo de opções: `required` (obrigatório), `multiple` (escolhe mais de uma), `min` e `max`.

### 3. Informar o horário de funcionamento (bloqueia pedidos fora do horário)

Em [`src/siteConfig.js`](../src/siteConfig.js), cada unidade tem um campo `schedule`. Com `null` o site mostra "Horários a confirmar" e **não** bloqueia nada. Preenchido, o site passa a:

- mostrar o horário e "Aberto agora" / "Fechado agora" nos cartões das unidades e em `/pedir/`;
- impedir o envio do pedido enquanto a unidade escolhida estiver fechada (o cliente ainda pode montar a sacola; aparece "Casa Forte está fechada agora. Abre amanhã às 18h");
- atualizar sozinho enquanto a página está aberta (a cada 30 s).

Formato (dias: `sun, mon, tue, wed, thu, fri, sat`; cada faixa é `['abre', 'fecha']` em `'HH:MM'`):

```js
schedule: {
  tue: [['18:00', '23:00']],
  wed: [['18:00', '23:00']],
  fri: [['18:00', '23:30']],
  sat: [['12:00', '23:30']],
  sun: [['12:00', '22:00']],
},
```

- Dia que não aparece, ou `[]`, é dia fechado (aqui: segunda e quinta).
- Fecha depois da meia-noite? Escreva o horário normal: `['18:00', '01:00']` vale até 1h da madrugada seguinte.
- Pausa no meio do dia: duas faixas, `[['11:00', '15:00'], ['18:00', '23:00']]`.
- O horário é sempre o de Recife, mesmo que o cliente esteja em outro fuso.
- Feriado ou fechamento de última hora: o horário não conhece datas; nesses casos o jeito é tirar o número do WhatsApp temporariamente ou pedir que eu inclua um botão de "pausar pedidos".

O `npm run check:pedidos` avisa se alguma faixa estiver mal escrita (isso bloqueia, para não fechar a unidade por engano).

### 4. Atualizar os Destaques do site

A seção Destaques do site, só de apresentação, usa [`src/showcaseData.js`](../src/showcaseData.js). Preencha `name`, `description`, `ingredients` e `image` de cada destaque, ajuste o `theme` (cores) à foto e remova `isDemo`. São até 7 destaques. Quando o prato mudar, atualize os dois arquivos.

### 5. Conferir

```bash
npm run check:pedidos
```

Quando aparecer **PRONTO**, o botão "Enviar pedido pelo WhatsApp" está liberado. A seção "Atenção" lista o que não bloqueia, mas costuma ser esquecido (produto sem preço, descrição ainda provisória).

### 6. Testar antes de divulgar

1. Se quiser testar sem incomodar a Gula, coloque **seu próprio número** no passo 1 e rode `npm run dev`.
2. Abra `http://localhost:5173/pedir/`, monte um pedido de retirada e outro de entrega, e toque em **Enviar pedido pelo WhatsApp**. Confira a mensagem na conversa que abrir; o pedido só vai de fato quando você toca em "Enviar" no WhatsApp.
3. Troque pelo número da Gula e publique (`npm run build`).

## Pausar pedidos e marcar item esgotado (dia a dia)

Para situações pontuais (feriado, cozinha lotada, falta de gás ou de insumo) não precisa mexer no horário: use a pausa. Em [`src/siteConfig.js`](../src/siteConfig.js), em `orders.pause`:

```js
pause: { all: false, units: [], message: '', until: null },
```

| Campo | O que faz |
| --- | --- |
| `all` | `true` pausa todas as unidades |
| `units` | pausa só as unidades listadas, pelo `id` em `siteConfig.units`: hoje `['casa-forte']` (útil quando houver mais de uma unidade) |
| `message` | texto opcional para o cliente, curto: `'Estamos com a cozinha lotada.'` |
| `until` | opcional: a pausa **termina sozinha** nesse momento, por exemplo `'2026-12-26T18:00:00-03:00'` (o `-03:00` é o fuso de Recife) |

Exemplos:

```js
// Cozinha lotada em Casa Forte, sem hora para voltar (volte a deixar vazio quando normalizar)
pause: { all: false, units: ['casa-forte'], message: 'Estamos com a cozinha lotada.', until: null },

// Feriado: todas as unidades pausadas até o dia 26 às 18h, voltando sozinhas
pause: { all: true, units: [], message: 'Feriado de Natal.', until: '2026-12-26T18:00:00-03:00' },
```

O que o cliente vê com a pausa ligada:

- no site, uma faixa amarela no topo ("Pedidos pausados · Feriado de Natal. Voltamos em 26/12 às 18h.") quando `all` está ligado, e o status nos cartões das unidades;
- em `/pedir/`, um aviso vermelho, a unidade marcada como "pausado" e o botão do WhatsApp desligado. Ele ainda pode ver o cardápio e montar a sacola;
- com `until`, o aviso some e o envio volta sozinho no horário (a página confere a cada 30 s), sem precisar publicar de novo.

Sem `until`, a pausa só acaba quando você voltar o arquivo ao normal e publicar de novo. **Mudou, salvou, publica** (`npm run build` e subir): a configuração vale a partir da publicação. Se você ligar a pausa e esquecer, o `npm run check:pedidos` mostra "PAUSA LIGADA".

A pausa vale mesmo que a unidade esteja dentro do horário de funcionamento (ela vence o horário).

**Item esgotado:** em [`src/order/orderMenu.js`](../src/order/orderMenu.js), coloque `available: false` no produto. Ele continua aparecendo no cardápio, cinza, com "Esgotado", e não pode ser adicionado. Se um cliente já tinha o item na sacola, o envio fica bloqueado até ele remover. Quando voltar, apague a linha ou use `available: true`.

## O que o cliente vê

Na revisão do pedido ele escolhe a unidade, retirada ou entrega, informa o nome (e o endereço, na entrega) e toca no botão. O WhatsApp abre com a mensagem pronta:

```
*Novo pedido — Gula Burger Recife*

*Unidade:* Casa Forte · Praça de Casa Forte, 409, loja 4
*Atendimento:* Entrega
*Nome:* Maria Silva
*Endereço:* Rua A, 10

*Itens*
1x Nome do produto
   • Opção escolhida
   Obs.: sem cebola

*Total:* R$ 29,90
```

O texto da mensagem fica em [`src/order/whatsapp.js`](../src/order/whatsapp.js).

## Combinar com a Gula antes de abrir

- Se atendem **retirada, entrega** ou os dois. As duas aparecem hoje; para tirar uma, coloque `false` nela em `siteConfig.orders.services` (`src/siteConfig.js`).
- **Taxa de entrega e pagamento**: a página não calcula frete nem cobra; isso é combinado na conversa.
- Qual número recebe os pedidos de Casa Forte (a única unidade ativa; a de Boa Viagem foi desativada). Se abrir outra unidade, o mesmo número pode receber as duas, e a unidade escolhida vai na mensagem.
- O **horário de atendimento** de cada unidade (passo 3): é com ele que o site bloqueia pedidos fora do horário. Sem o horário preenchido, qualquer hora aceita pedido.
