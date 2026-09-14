// public/regras.js
// Mesma lógica de lib/regras.js, mas em formato de script global pro navegador.
// O cálculo "oficial" que vale de verdade é sempre recalculado no backend ao salvar;
// isso aqui é só pra feedback visual instantâneo na tela.

const TABELA_GRAU = [
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

function grauParaPontos(label) {
  const g = TABELA_GRAU.find(g => g.label === label);
  return g ? g.pontos : 0;
}
function grauParaModificador(label) {
  return grauParaPontos(label);
}
function calcularStatusDerivado(atributos) {
  const vigorPts = grauParaPontos(atributos.vigor);
  const quantEAPts = grauParaPontos(atributos.quantidadeEA);
  const refinoPts = grauParaPontos(atributos.refinoEA);
  return {
    vidaMax: vigorPts * 10,
    eaMax: 25 + (quantEAPts * 50),
    bloquear: 5 + vigorPts,
    output: 5 + (refinoPts * 20)
  };
}
