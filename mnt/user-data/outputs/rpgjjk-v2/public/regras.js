// public/regras.js  (navegador)  — mesma lógica do backend (api/_shared.js)
const TABELA_GRAU = [
  { label: 'RESTRITO', pontos: 0 },
  { label: '-G4', pontos: 1 }, { label: 'G4', pontos: 2 }, { label: '+G4', pontos: 3 },
  { label: '-G3', pontos: 4 }, { label: 'G3', pontos: 5 }, { label: '+G3', pontos: 6 },
  { label: '-semi G2', pontos: 7 }, { label: 'semi G2', pontos: 8 }, { label: '+semi G2', pontos: 9 },
  { label: '-G2', pontos: 10 }, { label: 'G2', pontos: 11 }, { label: '+G2', pontos: 12 },
  { label: '-semi G1', pontos: 13 }, { label: 'semi G1', pontos: 14 }, { label: '+semi G1', pontos: 15 },
  { label: '-G1', pontos: 16 }, { label: 'G1', pontos: 17 }, { label: '+G1', pontos: 18 },
  { label: '-semi Especial', pontos: 19 }, { label: 'semi Especial', pontos: 20 }, { label: '+semi Especial', pontos: 21 },
  { label: '-Especial', pontos: 22 }, { label: 'Especial', pontos: 23 }, { label: '+Especial', pontos: 24 },
  { label: '-Calamidade', pontos: 25 }, { label: 'Calamidade', pontos: 26 }, { label: '+Calamidade', pontos: 27 },
  { label: '++Calamidade', pontos: 28 }, { label: '+++Calamidade', pontos: 29 }, { label: '++++Calamidade', pontos: 30 }
];
const GRAUS_FAIXA = ['G4','G3','semi G2','G2','semi G1','G1','semi Especial','Especial','Calamidade','++ Calamidade'];

function grauParaPontos(label) {
  const g = TABELA_GRAU.find(g => g.label === label);
  return g ? g.pontos : 0;
}
function pontosParaGrau(pts) {
  const p = Math.max(0, Math.min(30, Math.round(pts)));
  return TABELA_GRAU[p].label;
}
function grauParaModificador(label) { return grauParaPontos(label); }

// EA base por pontos de Quantidade de EA
// 0 = 0 | faixa0 (1-3): 50/75/100 | faixa>=1: 200/250/300, 400/500/600...
function eaBase(pts) {
  if (pts <= 0) return 0;
  const faixa = Math.floor((pts - 1) / 3);
  const pos = (pts - 1) % 3;
  if (faixa === 0) return 50 + pos * 25;
  const base = 100 * Math.pow(2, faixa);
  const stack = 50 * Math.pow(2, faixa - 1);
  return base + pos * stack;
}

// ============================================================
// STATUS DERIVADO
// ============================================================
const KOKUSEN_PERC = 0.2;

// Status que aceitam bônus temporário
const STATS_BONUS = [
  { key: 'vidaMax', label: 'Vida máxima' },
  { key: 'eaMax', label: 'EA máxima' },
  { key: 'bloquear', label: 'Bloquear' },
  { key: 'cd', label: 'CD' },
  { key: 'output', label: 'Output' }
];

function gerarId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// Valores "puros" vindos só dos atributos (sem Kokusen e sem bônus temporário)
function calcularBase(atributos) {
  const a = atributos || {};
  const vigor = grauParaPontos(a.vigor);
  const agi = grauParaPontos(a.agilidade);
  return {
    vidaMax: vigor * 10,
    eaBase: eaBase(grauParaPontos(a.quantidadeEA)),
    outputBase: grauParaPontos(a.refinoEA) * 20,
    bloquear: 5 + vigor,
    cd: agi + vigor
  };
}

// Soma dos bônus FIXOS de Kokusen guardados em cada registro do histórico
function somaBlackFlash(historico) {
  let ea = 0, out = 0;
  (historico || []).forEach(h => { ea += Number(h.eaGanho) || 0; out += Number(h.outGanho) || 0; });
  return { ea, out };
}

function somaBonusTemp(lista) {
  const t = { vidaMax: 0, eaMax: 0, bloquear: 0, cd: 0, output: 0 };
  (lista || []).forEach(b => {
    if (b && Object.prototype.hasOwnProperty.call(t, b.stat)) t[b.stat] += Number(b.valor) || 0;
  });
  return t;
}

// Ganho de um NOVO Kokusen: 20% do valor que você tem NO MOMENTO do registro
// (base + Kokusen anteriores). Depois de registrado, o valor fica fixo.
function ganhoKokusen(base, historicoAnterior) {
  const s = somaBlackFlash(historicoAnterior);
  return {
    eaGanho: Math.round((base.eaBase + s.ea) * KOKUSEN_PERC),
    outGanho: Math.round((base.outputBase + s.out) * KOKUSEN_PERC)
  };
}

function calcularStatusDerivado(atributos, blackFlash, bonusTemp) {
  const base = calcularBase(atributos);
  const bf = somaBlackFlash(blackFlash && blackFlash.historico);
  const bt = somaBonusTemp(bonusTemp);
  return {
    vidaMax: base.vidaMax + bt.vidaMax,
    eaMax: base.eaBase + bf.ea + bt.eaMax,
    bloquear: base.bloquear + bt.bloquear,
    cd: base.cd + bt.cd,
    output: base.outputBase + bf.out + bt.output
  };
}

// ---------- STACKS DE MALDIÇÕES MORTAS ----------
const FAIXAS_STACK = ['G4','G3','semi G2','G2','semi G1','G1','semi Especial','Especial','Calamidade'];
function converterStack(qtd, deFaixa, paraFaixa) {
  const i = FAIXAS_STACK.indexOf(deFaixa), j = FAIXAS_STACK.indexOf(paraFaixa);
  if (i < 0 || j < 0) return 0;
  return qtd * Math.pow(2, i - j);
}
function totalStackEm(stacksObj, faixaAlvo) {
  let total = 0;
  FAIXAS_STACK.forEach(f => {
    const mortos = Number((stacksObj || {})[f]) || 0;
    total += converterStack(mortos * 0.25, f, faixaAlvo);
  });
  return total;
}

// ============================================================
// EMOÇÕES (6 sentimentos × 4 níveis)
// ============================================================
const EMOCOES = [
  {
    key: 'Felicidade',
    niveis: [
      { nome: 'Alegria', texto: 'Você está mais alegre do que o normal: algo bom aconteceu e você está melhor que o habitual. Se falhar em um teste, ganha +1 no seu próximo teste (não acumulativo).' },
      { nome: 'Animado', texto: 'Você está muito feliz, a ponto de estar animado. Os pontos agora são acumulativos, mas a cada falha você perde 1 de vida se tirar menos que 5 em qualquer teste.' },
      { nome: 'Empolgado', texto: 'Você não perde os pontos até o final da cena, mas a cada falha perde 1d4 de vida se tirar menos que 10 em qualquer teste.' },
      { nome: 'Eufórico', texto: 'Você está no seu limite, tudo está perfeito e nada que der errado vai te afetar. Qualquer teste abaixo de 15 causa 1d4 de dano em você e dá +1d4 no próximo teste, além dos bônus de falha.' }
    ]
  },
  {
    key: 'Concentração',
    niveis: [
      { nome: 'Atento', texto: 'Sua mente está alinhada com o momento. O primeiro teste de cada turno recebe +1 (não acumulativo).' },
      { nome: 'Focado', texto: 'Você bloqueia as distrações. +2 em testes de Intelecto e Combate. Se tirar menos que 5 em qualquer teste, perde esse bônus até o início do seu próximo turno.' },
      { nome: 'Imerso', texto: 'O mundo ao redor some. +3 em todos os testes e imunidade a distrações e provocações. Em troca, sofre -2 em testes de Agilidade para reagir a ataques surpresa e a tudo que não seja seu alvo.' },
      { nome: 'Fluxo', texto: 'Corpo e mente em sincronia perfeita. +5 em todos os testes contra o alvo em que você está focado (escolhido ao entrar neste nível); contra qualquer outro alvo, -3. Ao final da cena, perde 2d4 de EA pelo desgaste mental.' }
    ]
  },
  {
    key: 'Coragem',
    niveis: [
      { nome: 'Determinado', texto: 'Você se recusa a recuar. +1 em testes de Presença para resistir a medo e intimidação.' },
      { nome: 'Destemido', texto: 'Medo comum não te afeta. Contra inimigos de grau maior que o seu, ganha +1 em todos os testes de ataque.' },
      { nome: 'Intrépido', texto: 'Quanto mais ferido, mais firme. Com menos da metade da vida, +2 em todos os testes. Para recuar ou fugir, precisa passar em um teste de Presença (CD 12).' },
      { nome: 'Heroico', texto: 'Você ultrapassa seus limites. +3 em todos os testes; uma vez por cena, ao cair a 0 de vida, faz um teste de Vigor (CD 15) e, se passar, fica com 1 de vida. Em troca, qualquer teste de ataque abaixo de 10 causa 1d4 de dano em você pela imprudência.' }
    ]
  },
  {
    key: 'Raiva',
    niveis: [
      { nome: 'Irritado', texto: 'Sua paciência está curta. +1 de dano em ataques corpo a corpo, mas -1 em testes de Intelecto.' },
      { nome: 'Furioso', texto: 'A raiva ferve. +2 de dano corpo a corpo e +1 de dano adicional a cada golpe que você sofrer (máx. +3 extra, até o fim da cena). -2 em testes de Intelecto e Presença.' },
      { nome: 'Enfurecido', texto: 'Você só enxerga o alvo. +1d4 de dano em todos os ataques e -3 em Intelecto. Para trocar de alvo ou parar de lutar, precisa passar em um teste de Intelecto (CD 12).' },
      { nome: 'Fúria cega', texto: 'Você perdeu o controle. +2d4 de dano em todos os ataques e ignora penalidades por ferimentos. Em um 1 natural, ataca o aliado mais próximo. Ao final da cena fica exausto: -2 em todos os testes até um descanso.' }
    ]
  },
  {
    key: 'Insegurança',
    niveis: [
      { nome: 'Hesitante', texto: 'Você duvida de si. -1 no primeiro teste de ataque de cada turno, mas +1 de CD por estar na defensiva.' },
      { nome: 'Receoso', texto: 'Você mede cada passo. -1 em todos os testes de ataque e de Presença; +2 de CD.' },
      { nome: 'Abalado', texto: 'Cada erro pesa. -2 em ataque e Presença, e cada teste abaixo de 10 aumenta a penalidade em -1 até o fim da cena (máx. -5). +2 de CD.' },
      { nome: 'Paralisado', texto: 'A dúvida te trava. -3 em todos os testes e, antes de qualquer ação ofensiva, precisa passar em um teste de Presença (CD 10) ou perde a ação. Em compensação, +3 de CD.' }
    ]
  },
  {
    key: 'Tristeza',
    niveis: [
      { nome: 'Melancólico', texto: 'Um peso silencioso. -1 em testes de Presença; +1 em testes de Intelecto, pelo olhar mais atento.' },
      { nome: 'Abatido', texto: 'Falta ânimo. -1 em todos os testes e recuperações de vida e EA rendem 25% a menos.' },
      { nome: 'Desolado', texto: 'A dor domina. -2 em todos os testes; cada teste abaixo de 8 faz você perder 1d4 de EA. +2 de Bloquear pela resignação.' },
      { nome: 'Desespero', texto: 'Nada mais importa. -3 em todos os testes e perde 1d4 de EA no início de cada turno. A dor vira poder: +1d4 de dano nas técnicas amaldiçoadas.' }
    ]
  }
];