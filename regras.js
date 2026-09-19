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
// 0 = 0 | faixa0 (1-3): 50/75/100 | faixa>=1: base=100*2^faixa, stack=50*2^(faixa-1)... (200/250/300, 400/500/600...)
function eaBase(pts) {
  if (pts <= 0) return 0;
  const faixa = Math.floor((pts - 1) / 3);
  const pos = (pts - 1) % 3;
  if (faixa === 0) return 50 + pos * 25;
  const base = 100 * Math.pow(2, faixa);
  const stack = 50 * Math.pow(2, faixa - 1);
  return base + pos * stack;
}

const KOKUSEN_MULT = 1.2;
function multKokusen(n) { return Math.pow(KOKUSEN_MULT, Math.max(0, Number(n) || 0)); }

function calcularStatusDerivado(atributos, kokusen) {
  const vigorPts = grauParaPontos(atributos.vigor);
  const quantEAPts = grauParaPontos(atributos.quantidadeEA);
  const refinoPts = grauParaPontos(atributos.refinoEA);
  const m = multKokusen(kokusen);
  return {
    vidaMax: vigorPts * 10,
    eaMax: Math.round(eaBase(quantEAPts) * m),
    bloquear: 5 + vigorPts,
    output: Math.round(refinoPts * 20 * m)
  };
}

// ---------- STACKS DE MALDIÇÕES MORTAS ----------
// Cada morto = +0.25 stack do grau dele. Subir de faixa ÷2 ; descer ×2.
const FAIXAS_STACK = ['G4','G3','semi G2','G2','semi G1','G1','semi Especial','Especial','Calamidade'];
function converterStack(qtd, deFaixa, paraFaixa) {
  const i = FAIXAS_STACK.indexOf(deFaixa), j = FAIXAS_STACK.indexOf(paraFaixa);
  if (i < 0 || j < 0) return 0;
  return qtd * Math.pow(2, i - j) ; // descer (j<i) multiplica; subir divide
}
function totalStackEm(stacksObj, faixaAlvo) {
  let total = 0;
  FAIXAS_STACK.forEach(f => {
    const mortos = Number((stacksObj || {})[f]) || 0;
    total += converterStack(mortos * 0.25, f, faixaAlvo);
  });
  return total;
}
