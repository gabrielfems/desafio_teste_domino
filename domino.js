function pecas() {
    const lista = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            lista.push({ lado1: i, lado2: j });
        }
    }
    return lista;
}

function embaralhar(lista) {
    const deck = [...lista];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function criarPartida() {
    return {
        jogadores: [0, 1].map(id => ({ id, mao: [] })),
        mesa: [],
        estoque: [],
        extremidadeEsquerda: null,
        extremidadeDireita: null,
        vez: 0,
        encerrada: false,
        vencedorId: null
    };
}

function distribuir(p, deck = embaralhar(pecas())) {
    const chaves = new Set(deck.map(pc => `${pc.lado1}-${pc.lado2}`));
    if (deck.length !== 28 || chaves.size !== 28) {
        throw Error('Baralho inválido');
    }

    const copia = [...deck];
    for (const j of p.jogadores) {
        j.mao = copia.splice(0, 7);
    }

    p.estoque = [...copia];
    p.mesa = [];
    p.extremidadeEsquerda = null;
    p.extremidadeDireita = null;
    p.vez = 0;

    return p;
}

function encaixa(peca, valor) {
    return peca.lado1 === valor || peca.lado2 === valor;
}

function jogar(p, jogador, peca, lado) {
    if (p.encerrada) throw Error('Partida encerrada');
    if (jogador !== p.vez) throw Error('Fora da vez');

    const mao = p.jogadores[jogador].mao;
    const i = mao.findIndex(pc => pc.lado1 === peca.lado1 && pc.lado2 === peca.lado2);
    if (i < 0) throw Error('Peça não está na mão');

    if (p.mesa.length === 0) {
        mao.splice(i, 1);
        p.mesa.push(peca);
        p.extremidadeEsquerda = peca.lado1;
        p.extremidadeDireita = peca.lado2;
    } else if (lado === 'esquerda') {
        if (!encaixa(peca, p.extremidadeEsquerda)) throw Error('Peça não encaixa na esquerda');
        mao.splice(i, 1);
        p.mesa.unshift(peca);
        p.extremidadeEsquerda =
            peca.lado2 === p.extremidadeEsquerda ? peca.lado1 : peca.lado2;
    } else if (lado === 'direita') {
        if (!encaixa(peca, p.extremidadeDireita)) throw Error('Peça não encaixa na direita');
        mao.splice(i, 1);
        p.mesa.push(peca);
        p.extremidadeDireita =
            peca.lado1 === p.extremidadeDireita ? peca.lado2 : peca.lado1;
    } else {
        throw Error('Lado inválido: use "esquerda" ou "direita"');
    }

    p.vez = 1 - jogador;

    if (mao.length === 0) {
        p.encerrada = true;
        p.vencedorId = jogador;
    }

    return p;
}

function passar(p, jogador) {
    if (p.encerrada) throw Error('Partida encerrada');
    if (jogador !== p.vez) throw Error('Fora da vez');
    if (podePjogar(p, jogador)) throw Error('Não pode passar: há peça que encaixa na mesa');
    if (p.estoque.length > 0) throw Error('Deve comprar do estoque antes de passar');

    p.vez = 1 - jogador;
    return p;
}

function podePjogar(p, jogador) {
    if (p.mesa.length === 0) return true;
    return p.jogadores[jogador].mao.some(
        pc => encaixa(pc, p.extremidadeEsquerda) || encaixa(pc, p.extremidadeDireita)
    );
}

function comprar(p, jogador) {
    if (p.estoque.length === 0) return null;
    const peca = p.estoque.pop();
    p.jogadores[jogador].mao.push(peca);
    return peca;
}

function travado(p) {
    return p.jogadores.every((_, i) => !podePjogar(p, i)) && p.estoque.length === 0;
}

function totalPontos(p, jogador) {
    return p.jogadores[jogador].mao.reduce((s, pc) => s + pc.lado1 + pc.lado2, 0);
}

function vencedor(p) {
    if (p.vencedorId !== null) return p.vencedorId;
    if (travado(p)) {
        const pts = [totalPontos(p, 0), totalPontos(p, 1)];
        if (pts[0] < pts[1]) return 0;
        if (pts[1] < pts[0]) return 1;
        return null;
    }
    return null;
}

module.exports = {
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
};