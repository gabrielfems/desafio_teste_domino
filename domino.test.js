'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
    pecas,
    embaralhar,
    criarPartida,
    distribuir,
    encaixa,
    jogar,
    passar,
    podePjogar,
    comprar,
    travado,
    totalPontos,
    vencedor
} = require('./domino');

// ---------------------------------------------------------------------------
// Helpers
// Peças em formato curto: '3-5' = { lado1: 3, lado2: 5 }
// ---------------------------------------------------------------------------

const pc = s => {
    const [lado1, lado2] = s.split('-').map(Number);
    return { lado1, lado2 };
};
const chave = peca => `${peca.lado1}-${peca.lado2}`;

// Monta uma partida direto no estado desejado, sem passar pela distribuição
function partidaCom({ mao0 = [], mao1 = [], mesa = [], esq = null, dir = null, estoque = [], vez = 0 } = {}) {
    const p = criarPartida();
    p.jogadores[0].mao = mao0.map(pc);
    p.jogadores[1].mao = mao1.map(pc);
    p.mesa = mesa.map(pc);
    p.extremidadeEsquerda = esq;
    p.extremidadeDireita = dir;
    p.estoque = estoque.map(pc);
    p.vez = vez;
    return p;
}

// Baralho de 28 peças com as mãos escolhidas no início (7 + 7) e o resto no estoque
function deckCom(mao0, mao1) {
    const escolhidas = [...mao0, ...mao1].map(pc);
    const usadas = new Set(escolhidas.map(chave));
    const resto = pecas().filter(peca => !usadas.has(chave(peca)));
    return [...escolhidas, ...resto];
}

// ---------------------------------------------------------------------------
// Preparação da partida
// ---------------------------------------------------------------------------

describe('Preparação da partida', () => {
    test('CT01 - cria partida com 2 jogadores de ids 0 e 1', () => {
        const p = criarPartida();

        assert.equal(p.jogadores.length, 2);
        assert.deepEqual(p.jogadores.map(j => j.id), [0, 1]);
    });

    test('CT01 - estado inicial da partida', () => {
        const p = criarPartida();

        p.jogadores.forEach(j => assert.deepEqual(j.mao, []));
        assert.deepEqual(p.mesa, []);
        assert.deepEqual(p.estoque, []);
        assert.equal(p.extremidadeEsquerda, null);
        assert.equal(p.extremidadeDireita, null);
        assert.equal(p.vez, 0);
        assert.equal(p.encerrada, false);
        assert.equal(p.vencedorId, null);
    });

    test('CT02 - conjunto com 28 peças sem repetição', () => {
        const lista = pecas();

        assert.equal(lista.length, 28);
        assert.equal(new Set(lista.map(chave)).size, 28);
    });

    test('CT02 - vai de [0|0] até [6|6], com cada combinação uma vez', () => {
        const lista = pecas();

        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                const quantidade = lista.filter(x => x.lado1 === i && x.lado2 === j).length;
                assert.equal(quantidade, 1, `[${i}|${j}]`);
            }
        }
    });

    test('CT02 - os 168 pontos do conjunto completo', () => {
        const soma = pecas().reduce((s, x) => s + x.lado1 + x.lado2, 0);

        assert.equal(soma, 168);
    });

    test('CT03 - embaralhar mantém as mesmas 28 peças', () => {
        const original = pecas();
        const embaralhado = embaralhar(original);

        assert.equal(embaralhado.length, 28);
        assert.deepEqual(embaralhado.map(chave).sort(), original.map(chave).sort());
    });

    test('CT03 - embaralhar muda a ordem das peças', () => {
        const original = pecas();

        assert.notDeepEqual(embaralhar(original).map(chave), original.map(chave));
    });

    test('CT03 - embaralhar não altera a lista original', () => {
        const original = pecas();
        const copia = original.map(chave);

        embaralhar(original);

        assert.deepEqual(original.map(chave), copia);
    });

    test('CT04 - 7 peças por jogador e 14 no estoque', () => {
        const p = distribuir(criarPartida());

        assert.equal(p.jogadores[0].mao.length, 7);
        assert.equal(p.jogadores[1].mao.length, 7);
        assert.equal(p.estoque.length, 14);
    });

    test('CT04 - distribuição aleatória usa as 28 peças sem repetir', () => {
        const p = distribuir(criarPartida());
        const todas = [...p.jogadores[0].mao, ...p.jogadores[1].mao, ...p.estoque];

        assert.equal(todas.length, 28);
        assert.equal(new Set(todas.map(chave)).size, 28);
    });

    test('CT04 - cada parte do baralho vai para o lugar esperado', () => {
        const deck = pecas();
        const p = distribuir(criarPartida(), deck);

        assert.deepEqual(p.jogadores[0].mao, deck.slice(0, 7));
        assert.deepEqual(p.jogadores[1].mao, deck.slice(7, 14));
        assert.deepEqual(p.estoque, deck.slice(14));
    });

    test('CT04 - mesa vazia e jogador 0 começa', () => {
        const p = distribuir(criarPartida());

        assert.deepEqual(p.mesa, []);
        assert.equal(p.extremidadeEsquerda, null);
        assert.equal(p.extremidadeDireita, null);
        assert.equal(p.vez, 0);
    });

    test('CT04 - não altera o baralho recebido', () => {
        const deck = pecas();
        const copia = deck.map(chave);

        distribuir(criarPartida(), deck);

        assert.deepEqual(deck.map(chave), copia);
    });

    test('CT05 - rejeita baralho com peça repetida', () => {
        const deck = pecas();
        deck[27] = { ...deck[0] };

        assert.throws(() => distribuir(criarPartida(), deck), { message: 'Baralho inválido' });
    });

    test('CT05 - rejeita baralho com menos de 28 peças', () => {
        assert.throws(
            () => distribuir(criarPartida(), pecas().slice(0, 27)),
            { message: 'Baralho inválido' }
        );
    });

    test('CT05 - rejeita baralho com mais de 28 peças', () => {
        assert.throws(
            () => distribuir(criarPartida(), [...pecas(), pc('0-0')]),
            { message: 'Baralho inválido' }
        );
    });

    test('CT05 - baralho inválido não altera a partida', () => {
        const p = criarPartida();
        const deck = pecas();
        deck[27] = { ...deck[0] };

        assert.throws(() => distribuir(p, deck));

        p.jogadores.forEach(j => assert.deepEqual(j.mao, []));
        assert.deepEqual(p.estoque, []);
    });
});

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

describe('Peças', () => {
    test('CT06 - encaixa quando um dos lados coincide', () => {
        assert.equal(encaixa(pc('3-5'), 3), true);
        assert.equal(encaixa(pc('3-5'), 5), true);
    });

    test('CT06 - peça dupla encaixa no próprio valor', () => {
        assert.equal(encaixa(pc('4-4'), 4), true);
    });

    test('CT06 - o zero também encaixa', () => {
        assert.equal(encaixa(pc('0-6'), 0), true);
        assert.equal(encaixa(pc('0-0'), 0), true);
    });

    test('CT07 - não encaixa quando nenhum lado coincide', () => {
        assert.equal(encaixa(pc('3-5'), 4), false);
        assert.equal(encaixa(pc('3-5'), 0), false);
        assert.equal(encaixa(pc('4-4'), 3), false);
    });

    test('CT08 - soma os dois lados de todas as peças da mão', () => {
        const p = partidaCom({ mao0: ['6-6', '0-1', '2-3'], mao1: ['1-1'] });

        assert.equal(totalPontos(p, 0), 18);
        assert.equal(totalPontos(p, 1), 2);
    });

    test('CT08 - mão vazia vale zero', () => {
        const p = partidaCom();

        assert.equal(totalPontos(p, 0), 0);
    });

    test('CT08 - [0|0] não soma pontos', () => {
        const p = partidaCom({ mao0: ['0-0'] });

        assert.equal(totalPontos(p, 0), 0);
    });
});

// ---------------------------------------------------------------------------
// Jogadas
// ---------------------------------------------------------------------------

describe('Jogadas', () => {
    test('CT09 - rejeita jogada fora da vez', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'], vez: 0 });

        assert.throws(() => jogar(p, 1, pc('3-4'), 'direita'), { message: 'Fora da vez' });

        assert.equal(p.jogadores[1].mao.length, 1);
        assert.deepEqual(p.mesa, []);
        assert.equal(p.vez, 0);
    });

    test('CT09 - rejeita o jogador que acabou de jogar', () => {
        const p = partidaCom({ mao0: ['1-2', '3-4'], mao1: ['5-6'] });

        jogar(p, 0, pc('1-2'), 'direita');

        assert.throws(() => jogar(p, 0, pc('3-4'), 'direita'), { message: 'Fora da vez' });
    });

    test('CT10 - rejeita peça que não está na mão', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'] });

        assert.throws(() => jogar(p, 0, pc('5-6'), 'direita'), { message: 'Peça não está na mão' });

        assert.equal(p.jogadores[0].mao.length, 1);
        assert.deepEqual(p.mesa, []);
        assert.equal(p.vez, 0);
    });

    test('CT10 - rejeita peça que está na mão do adversário', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'] });

        assert.throws(() => jogar(p, 0, pc('3-4'), 'direita'), { message: 'Peça não está na mão' });
    });

    test('CT11 - a primeira peça define as extremidades', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.deepEqual(p.mesa, [pc('3-5')]);
        assert.equal(p.extremidadeEsquerda, 3);
        assert.equal(p.extremidadeDireita, 5);
        assert.equal(p.jogadores[0].mao.length, 1);
        assert.equal(p.vez, 1);
    });

    test('CT11 - a primeira peça é aceita sem informar o lado', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['4-4'] });

        jogar(p, 0, pc('3-5'));

        assert.equal(p.extremidadeEsquerda, 3);
        assert.equal(p.extremidadeDireita, 5);
    });

    test('CT11 - peça dupla na mesa vazia', () => {
        const p = partidaCom({ mao0: ['6-6', '1-2'], mao1: ['4-4'] });

        jogar(p, 0, pc('6-6'), 'esquerda');

        assert.equal(p.extremidadeEsquerda, 6);
        assert.equal(p.extremidadeDireita, 6);
    });

    test('CT12 - encaixe válido na direita atualiza a extremidade direita', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['5-2', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('5-2'), 'direita');

        assert.deepEqual(p.mesa, [pc('3-5'), pc('5-2')]);
        assert.equal(p.extremidadeEsquerda, 3);
        assert.equal(p.extremidadeDireita, 2);
        assert.equal(p.vez, 0);
    });

    test('CT12 - peça que encaixa pelo segundo lado também funciona na direita', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['2-5', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('2-5'), 'direita');

        assert.equal(p.extremidadeDireita, 2);
    });

    test('CT12 - peça dupla na direita mantém a extremidade', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['5-5', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('5-5'), 'direita');

        assert.equal(p.extremidadeDireita, 5);
        assert.equal(p.mesa.length, 2);
    });

    test('CT13 - encaixe válido na esquerda atualiza a extremidade esquerda', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['4-3', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('4-3'), 'esquerda');

        assert.deepEqual(p.mesa, [pc('4-3'), pc('3-5')]);
        assert.equal(p.extremidadeEsquerda, 4);
        assert.equal(p.extremidadeDireita, 5);
        assert.equal(p.vez, 0);
    });

    test('CT13 - peça que encaixa pelo primeiro lado também funciona na esquerda', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['3-6', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('3-6'), 'esquerda');

        assert.equal(p.extremidadeEsquerda, 6);
    });

    test('CT13 - peça dupla na esquerda mantém a extremidade', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['3-3', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');
        jogar(p, 1, pc('3-3'), 'esquerda');

        assert.equal(p.extremidadeEsquerda, 3);
    });

    test('CT14 - rejeita peça que não encaixa na direita', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['1-2', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.throws(() => jogar(p, 1, pc('1-2'), 'direita'), { message: 'Peça não encaixa na direita' });

        assert.equal(p.jogadores[1].mao.length, 2);
        assert.deepEqual(p.mesa, [pc('3-5')]);
        assert.equal(p.extremidadeDireita, 5);
        assert.equal(p.vez, 1);
    });

    test('CT14 - o encaixe na esquerda não vale para a direita', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['3-6', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        // 3-6 encaixa no 3 (esquerda), mas não no 5 (direita)
        assert.throws(() => jogar(p, 1, pc('3-6'), 'direita'), { message: 'Peça não encaixa na direita' });
    });

    test('CT15 - rejeita peça que não encaixa na esquerda', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['1-2', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.throws(() => jogar(p, 1, pc('1-2'), 'esquerda'), { message: 'Peça não encaixa na esquerda' });

        assert.equal(p.jogadores[1].mao.length, 2);
        assert.deepEqual(p.mesa, [pc('3-5')]);
        assert.equal(p.extremidadeEsquerda, 3);
        assert.equal(p.vez, 1);
    });

    test('CT15 - o encaixe na direita não vale para a esquerda', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['5-6', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        // 5-6 encaixa no 5 (direita), mas não no 3 (esquerda)
        assert.throws(() => jogar(p, 1, pc('5-6'), 'esquerda'), { message: 'Peça não encaixa na esquerda' });
    });

    test('CT15 - rejeita lado inválido com a mesa em andamento', () => {
        const p = partidaCom({ mao0: ['3-5', '1-2'], mao1: ['5-6', '4-4'] });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.throws(() => jogar(p, 1, pc('5-6'), 'meio'), { message: /Lado inválido/ });
        assert.throws(() => jogar(p, 1, pc('5-6')), { message: /Lado inválido/ });
        assert.equal(p.jogadores[1].mao.length, 2);
    });

    test('CT16 - encadeamento de três peças deixa as extremidades corretas', () => {
        const p = partidaCom({ mao0: ['3-5', '1-3'], mao1: ['5-2', '6-6'] });

        jogar(p, 0, pc('3-5'), 'direita');     // esq 3 | dir 5
        jogar(p, 1, pc('5-2'), 'direita');     // esq 3 | dir 2
        jogar(p, 0, pc('1-3'), 'esquerda');    // esq 1 | dir 2

        assert.deepEqual(p.mesa, [pc('1-3'), pc('3-5'), pc('5-2')]);
        assert.equal(p.extremidadeEsquerda, 1);
        assert.equal(p.extremidadeDireita, 2);
        assert.equal(p.vez, 1);
    });

    test('CT16 - a vez alterna a cada jogada', () => {
        const p = partidaCom({ mao0: ['3-5', '1-3'], mao1: ['5-2', '6-6'] });

        assert.equal(p.vez, 0);
        jogar(p, 0, pc('3-5'), 'direita');
        assert.equal(p.vez, 1);
        jogar(p, 1, pc('5-2'), 'direita');
        assert.equal(p.vez, 0);
        jogar(p, 0, pc('1-3'), 'esquerda');
        assert.equal(p.vez, 1);
    });
});

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

describe('Estoque', () => {
    test('CT17 - comprar entrega a peça ao jogador e reduz o estoque em 1', () => {
        const p = partidaCom({ mao0: ['1-2'], estoque: ['6-6', '1-1'] });

        const comprada = comprar(p, 0);

        assert.deepEqual(comprada, pc('1-1'));
        assert.equal(p.jogadores[0].mao.length, 2);
        assert.deepEqual(p.jogadores[0].mao[1], pc('1-1'));
        assert.equal(p.estoque.length, 1);
        assert.deepEqual(p.estoque, [pc('6-6')]);
    });

    test('CT17 - a peça comprada sai do estoque e não fica duplicada', () => {
        const p = distribuir(criarPartida());
        const antes = p.estoque.length;

        const comprada = comprar(p, 1);

        assert.equal(p.estoque.length, antes - 1);
        assert.equal(p.estoque.some(x => chave(x) === chave(comprada)), false);
        assert.equal(p.jogadores[1].mao.length, 8);
    });

    test('CT17 - comprar não troca a vez', () => {
        const p = partidaCom({ mao0: ['1-2'], estoque: ['6-6'], vez: 0 });

        comprar(p, 0);

        assert.equal(p.vez, 0);
    });

    test('CT18 - com o estoque vazio a compra retorna null', () => {
        const p = partidaCom({ mao0: ['1-2'] });

        assert.equal(comprar(p, 0), null);
        assert.equal(p.jogadores[0].mao.length, 1);
        assert.equal(p.estoque.length, 0);
    });

    test('CT18 - esvaziar o estoque compra a compra', () => {
        const p = partidaCom({ estoque: ['6-6', '1-1'] });

        assert.notEqual(comprar(p, 0), null);
        assert.notEqual(comprar(p, 0), null);
        assert.equal(comprar(p, 0), null);
        assert.equal(p.jogadores[0].mao.length, 2);
    });

    test('CT19 - com a mesa vazia sempre pode jogar', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'] });

        assert.equal(podePjogar(p, 0), true);
        assert.equal(podePjogar(p, 1), true);
    });

    test('CT20 - peça que encaixa na direita', () => {
        const p = partidaCom({ mao0: ['5-6', '1-2'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(podePjogar(p, 0), true);
    });

    test('CT20 - peça que encaixa só na esquerda', () => {
        const p = partidaCom({ mao0: ['0-3', '1-2'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(podePjogar(p, 0), true);
    });

    test('CT21 - nenhuma peça encaixa', () => {
        const p = partidaCom({ mao0: ['1-2', '0-4'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(podePjogar(p, 0), false);
    });

    test('CT21 - mão vazia não pode jogar com a mesa em andamento', () => {
        const p = partidaCom({ mao0: [], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(podePjogar(p, 0), false);
    });

    test('CT21 - cada jogador é avaliado pela própria mão', () => {
        const p = partidaCom({ mao0: ['5-6'], mao1: ['1-2'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(podePjogar(p, 0), true);
        assert.equal(podePjogar(p, 1), false);
    });
});

// ---------------------------------------------------------------------------
// Vitória e travamento
// ---------------------------------------------------------------------------

describe('Vitória e travamento', () => {
    test('CT22 - passa a vez quando não pode jogar e o estoque está vazio', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'], mesa: ['3-5'], esq: 3, dir: 5, vez: 0 });

        passar(p, 0);

        assert.equal(p.vez, 1);
        assert.equal(p.jogadores[0].mao.length, 1);
    });

    test('CT22 - passar não altera a mesa', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'], mesa: ['3-5'], esq: 3, dir: 5, vez: 0 });

        passar(p, 0);

        assert.deepEqual(p.mesa, [pc('3-5')]);
        assert.equal(p.extremidadeEsquerda, 3);
        assert.equal(p.extremidadeDireita, 5);
    });

    test('CT22 - não pode passar fora da vez', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['0-4'], mesa: ['3-5'], esq: 3, dir: 5, vez: 0 });

        assert.throws(() => passar(p, 1), { message: 'Fora da vez' });
    });

    test('CT22 - não pode passar enquanto houver estoque', () => {
        const p = partidaCom({
            mao0: ['1-2'], mao1: ['3-4'], mesa: ['3-5'], esq: 3, dir: 5, estoque: ['6-6'], vez: 0
        });

        assert.throws(() => passar(p, 0), { message: 'Deve comprar do estoque antes de passar' });
        assert.equal(p.vez, 0);
    });

    test('CT23 - rejeita passar com peça que encaixa', () => {
        const p = partidaCom({ mao0: ['5-6', '1-2'], mao1: ['3-4'], mesa: ['3-5'], esq: 3, dir: 5, vez: 0 });

        assert.throws(() => passar(p, 0), { message: 'Não pode passar: há peça que encaixa na mesa' });
        assert.equal(p.vez, 0);
    });

    test('CT23 - rejeita passar com a mesa vazia', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['3-4'], vez: 0 });

        assert.throws(() => passar(p, 0), { message: 'Não pode passar: há peça que encaixa na mesa' });
    });

    test('CT24 - jogar a última peça encerra a partida e define o vencedor', () => {
        const p = partidaCom({ mao0: ['3-5'], mao1: ['1-2'], mesa: ['2-3'], esq: 2, dir: 3, vez: 0 });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.equal(p.jogadores[0].mao.length, 0);
        assert.equal(p.encerrada, true);
        assert.equal(p.vencedorId, 0);
        assert.equal(vencedor(p), 0);
    });

    test('CT24 - o jogador 1 também vence ao esvaziar a mão', () => {
        const p = partidaCom({ mao0: ['6-6'], mao1: ['3-5'], mesa: ['2-3'], esq: 2, dir: 3, vez: 1 });

        jogar(p, 1, pc('3-5'), 'direita');

        assert.equal(p.encerrada, true);
        assert.equal(p.vencedorId, 1);
        assert.equal(vencedor(p), 1);
    });

    test('CT24 - com peças na mão a partida continua', () => {
        const p = partidaCom({ mao0: ['3-5', '1-1'], mao1: ['1-2'], mesa: ['2-3'], esq: 2, dir: 3, vez: 0 });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.equal(p.encerrada, false);
        assert.equal(p.vencedorId, null);
        assert.equal(vencedor(p), null);
    });

    test('CT25 - partida encerrada rejeita novas jogadas', () => {
        const p = partidaCom({ mao0: ['3-5'], mao1: ['2-6'], mesa: ['2-3'], esq: 2, dir: 3, vez: 0 });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.throws(() => jogar(p, 1, pc('2-6'), 'esquerda'), { message: 'Partida encerrada' });
        assert.equal(p.jogadores[1].mao.length, 1);
        assert.equal(p.mesa.length, 2);
    });

    test('CT25 - partida encerrada rejeita passar', () => {
        const p = partidaCom({ mao0: ['3-5'], mao1: ['1-1'], mesa: ['2-3'], esq: 2, dir: 3, vez: 0 });

        jogar(p, 0, pc('3-5'), 'direita');

        assert.throws(() => passar(p, 1), { message: 'Partida encerrada' });
    });

    test('CT26 - jogo travado: ninguém pode jogar e o estoque está vazio', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['0-4'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(travado(p), true);
    });

    test('CT26 - não trava enquanto houver estoque', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['0-4'], mesa: ['3-5'], esq: 3, dir: 5, estoque: ['6-6'] });

        assert.equal(travado(p), false);
    });

    test('CT26 - não trava se um dos jogadores ainda pode jogar', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['5-6'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(travado(p), false);
    });

    test('CT26 - não trava com a mesa vazia', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['0-4'] });

        assert.equal(travado(p), false);
    });

    test('CT27 - no travamento vence o jogador com menor soma', () => {
        const p = partidaCom({ mao0: ['1-1'], mao1: ['2-2'], mesa: ['4-6'], esq: 4, dir: 6 });

        assert.equal(travado(p), true);
        assert.equal(vencedor(p), 0);
    });

    test('CT27 - a menor soma também pode ser a do jogador 1', () => {
        const p = partidaCom({ mao0: ['2-2'], mao1: ['1-1'], mesa: ['4-6'], esq: 4, dir: 6 });

        assert.equal(vencedor(p), 1);
    });

    test('CT27 - o peso da mão é a soma de todas as peças, não a quantidade', () => {
        // jogador 0 tem 2 peças (soma 4), jogador 1 tem 1 peça (soma 10)
        const p = partidaCom({ mao0: ['0-1', '1-2'], mao1: ['5-5'], mesa: ['3-4'], esq: 3, dir: 4 });

        assert.equal(totalPontos(p, 0), 4);
        assert.equal(totalPontos(p, 1), 10);
        assert.equal(vencedor(p), 0);
    });

    test('CT27 - empate na soma não tem vencedor', () => {
        const p = partidaCom({ mao0: ['1-2'], mao1: ['0-3'], mesa: ['4-6'], esq: 4, dir: 6 });

        assert.equal(totalPontos(p, 0), totalPontos(p, 1));
        assert.equal(vencedor(p), null);
    });

    test('CT27 - sem travamento nem vitória não há vencedor', () => {
        const p = partidaCom({ mao0: ['1-1'], mao1: ['5-6'], mesa: ['3-5'], esq: 3, dir: 5 });

        assert.equal(vencedor(p), null);
    });

    test('CT28 - partida completa: o jogador 0 vence ao esvaziar a mão', () => {
        const mao0 = ['0-1', '2-3', '4-5', '6-6', '0-0', '2-2', '4-4'];
        const mao1 = ['1-2', '3-4', '5-6', '0-6', '0-2', '2-4', '1-1'];

        const p = distribuir(criarPartida(), deckCom(mao0, mao1));

        assert.equal(p.jogadores[0].mao.length, 7);
        assert.equal(p.jogadores[1].mao.length, 7);
        assert.equal(p.estoque.length, 14);

        // [jogador, peça]: o jogador 0 abre e depois só se joga na direita
        const jogadas = [
            [0, '0-1'], [1, '1-2'], [0, '2-3'], [1, '3-4'], [0, '4-5'], [1, '5-6'], [0, '6-6'],
            [1, '0-6'], [0, '0-0'], [1, '0-2'], [0, '2-2'], [1, '2-4'], [0, '4-4']
        ];

        jogadas.forEach(([jogador, peca], i) => {
            assert.equal(p.encerrada, false, `a partida acabou antes da jogada ${i + 1}`);
            assert.equal(p.vez, jogador, `vez errada na jogada ${i + 1}`);
            jogar(p, jogador, pc(peca), 'direita');
        });

        assert.equal(p.jogadores[0].mao.length, 0);
        assert.equal(p.jogadores[1].mao.length, 1);
        assert.equal(p.mesa.length, 13);
        assert.equal(p.encerrada, true);
        assert.equal(p.vencedorId, 0);
        assert.equal(vencedor(p), 0);
        assert.equal(totalPontos(p, 1), 2);
    });

    test('CT28 - depois da vitória a mesa não aceita mais jogadas', () => {
        const mao0 = ['0-1'];
        const p = partidaCom({ mao0, mao1: ['1-2'], vez: 0 });

        jogar(p, 0, pc('0-1'), 'direita');

        assert.equal(p.encerrada, true);
        assert.throws(() => jogar(p, 1, pc('1-2'), 'direita'), { message: 'Partida encerrada' });
    });
});