# Dominó para 2 jogadores

Lógica de uma partida de Dominó para **dois jogadores**, escrita em JavaScript (CommonJS) e coberta por 28 casos de teste automatizados com o executor nativo do Node.js (`node:test`).

## Como rodar

Requisito: Node.js 18 ou mais novo. Não há dependências para instalar.

```bash
npm test
```

O comando executa os 28 casos de teste (CT01 a CT28). Alguns casos têm mais de um teste, então o total de testes executados é maior que 28. No `package.json`, o script é:

```json
{
  "scripts": {
    "test": "node --test domino.test.js"
  }
}
```

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `domino.js` | Regras da partida: peças, distribuição, jogadas, estoque, vitória e travamento |
| `domino.test.js` | Casos de teste automatizados (CT01 a CT28) |
| `package.json` | Configuração do projeto e script `npm test` |

## Regras implementadas

### Jogadores e peças

- 2 jogadores, com ids `0` e `1`. O jogador `0` sempre começa.
- O conjunto tem **28 peças**, de `[0|0]` até `[6|6]`, cada combinação uma única vez.
- Cada jogador recebe **7 peças**. As **14 restantes** formam o estoque.
- O baralho passado para a distribuição precisa ter exatamente 28 peças, sem repetição.

### Jogadas

- Cada jogador joga na sua vez. Jogar fora da vez é rejeitado.
- Só é possível jogar uma peça que está na própria mão.
- A primeira peça é livre e define as duas extremidades da mesa.
- As demais precisam encaixar: um dos lados da peça deve ser igual ao valor da extremidade escolhida (`'esquerda'` ou `'direita'`).
- Depois do encaixe, a extremidade passa a ser o outro lado da peça. Peça dupla mantém o mesmo valor.
- Um lado diferente de `'esquerda'` ou `'direita'` é rejeitado quando já há peças na mesa.

### Estoque e passar a vez

- Sem peça que encaixe, o jogador compra do estoque, uma peça por vez. Comprar não troca a vez.
- Com o estoque vazio, `comprar` retorna `null`.
- Só é possível passar a vez quando nenhuma peça da mão encaixa **e** o estoque está vazio.
- Com a mesa vazia sempre é possível jogar, então não dá para passar.

### Vitória e travamento

- Vence quem ficar sem peças primeiro. A partida passa para `encerrada` e o vencedor é registrado em `vencedorId`.
- O jogo **trava** quando nenhum dos dois pode jogar e o estoque está vazio.
- No travamento, vence quem tiver a **menor soma de pontos** na mão. Empate na soma não tem vencedor (`null`).
- Depois do encerramento, jogar e passar são rejeitados.

## Uso

```js
const { criarPartida, distribuir, jogar, comprar, passar, vencedor } = require('./domino');

const partida = distribuir(criarPartida());

const peca = partida.jogadores[0].mao[0];
jogar(partida, 0, peca, 'direita'); // primeira peça: o lado é ignorado

comprar(partida, 1);                // compra do estoque
vencedor(partida);                  // null enquanto a partida está em andamento
```

Para cenários controlados, `distribuir(partida, deck)` aceita um baralho já montado. Sem o segundo argumento, o baralho é embaralhado. As peças são objetos no formato `{ lado1, lado2 }`, e `jogar` compara os dois lados exatamente como estão na mão.

### Funções exportadas

| Função | O que faz |
|---|---|
| `pecas()` | Retorna as 28 peças em ordem |
| `embaralhar(lista)` | Retorna uma cópia embaralhada, sem alterar a original |
| `criarPartida()` | Cria a partida com 2 jogadores e a mesa vazia |
| `distribuir(partida, deck)` | Dá 7 peças a cada jogador e deixa 14 no estoque |
| `encaixa(peca, valor)` | Indica se algum lado da peça é igual ao valor |
| `jogar(partida, jogador, peca, lado)` | Joga a peça na extremidade escolhida e passa a vez |
| `passar(partida, jogador)` | Passa a vez quando não há peça que encaixe e o estoque está vazio |
| `podePjogar(partida, jogador)` | Indica se o jogador tem peça que encaixe, ou se a mesa está vazia |
| `comprar(partida, jogador)` | Tira uma peça do estoque para a mão, ou retorna `null` |
| `travado(partida)` | Indica se ninguém pode jogar e o estoque está vazio |
| `totalPontos(partida, jogador)` | Soma os dois lados de todas as peças da mão |
| `vencedor(partida)` | Retorna o id do vencedor, ou `null` |

### Estado da partida

| Campo | Descrição |
|---|---|
| `jogadores` | Lista com `id` e `mao` de cada jogador |
| `mesa` | Peças jogadas, da esquerda para a direita |
| `estoque` | Peças que ainda podem ser compradas |
| `extremidadeEsquerda` / `extremidadeDireita` | Valores abertos nas pontas da mesa, ou `null` com a mesa vazia |
| `vez` | Id do jogador que joga |
| `encerrada` | `true` quando alguém ficou sem peças |
| `vencedorId` | Id de quem esvaziou a mão, ou `null` |

## Casos de teste

Usam `node:test` e `node:assert/strict`. Os testes montam o estado da partida direto, com as mãos, a mesa e o estoque escolhidos, para que cada cenário seja reproduzível.

### Preparação da partida

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT01 | Criar partida | 2 jogadores com ids 0 e 1 |
| CT02 | Validar conjunto | 28 peças sem repetição |
| CT03 | Embaralhar | Mesmas 28 peças em outra ordem |
| CT04 | Distribuir | 7 peças por jogador e 14 no estoque |
| CT05 | Peça repetida no baralho | Distribuição rejeitada |

### Peças

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT06 | Encaixe verdadeiro | `true` quando um lado coincide |
| CT07 | Encaixe falso | `false` quando nenhum lado coincide |
| CT08 | Total de pontos | Soma dos dois lados de todas as peças da mão |

### Jogadas

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT09 | Jogar fora da vez | Jogada rejeitada |
| CT10 | Jogar peça que não está na mão | Jogada rejeitada |
| CT11 | Primeira peça | Define as extremidades esquerda e direita |
| CT12 | Encaixe válido na direita | Extremidade direita atualizada |
| CT13 | Encaixe válido na esquerda | Extremidade esquerda atualizada |
| CT14 | Encaixe inválido na direita | Jogada rejeitada |
| CT15 | Encaixe inválido na esquerda | Jogada rejeitada |
| CT16 | Encadeamento de três peças | Extremidades corretas após três jogadas |

### Estoque

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT17 | Comprar do estoque | Peça entregue ao jogador e estoque reduz em 1 |
| CT18 | Estoque vazio | Compra retorna `null` |
| CT19 | `podePjogar` com mesa vazia | Sempre `true` |
| CT20 | Peça que encaixa disponível | `podePjogar` retorna `true` |
| CT21 | Nenhuma peça encaixa | `podePjogar` retorna `false` |

### Vitória e travamento

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT22 | Passar a vez | Permitido quando não pode jogar e o estoque está vazio |
| CT23 | Passar com peça disponível | Passagem rejeitada |
| CT24 | Última peça jogada | Partida encerrada e vencedor definido |
| CT25 | Partida encerrada | Novas jogadas rejeitadas |
| CT26 | Jogo travado | Detectado quando ninguém pode jogar e o estoque está vazio |
| CT27 | Vencedor no travamento | Menor soma vence; empate retorna `null` |
| CT28 | Partida completa simulada | Jogador 0 vence ao esvaziar a mão |

## Colaboradores

Gabriel Felipe Martins, RA 26005039-2
