// lib/regras.js
// Regras de cálculo do sistema, compartilhadas entre backend e (via cópia) frontend.

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

// Recalcula os status derivados a partir dos atributos. Chamado sempre que
// a ficha é salva no backend, pra garantir que o valor salvo é confiável
// mesmo que o frontend tenha sido manipulado.
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

function fichaVazia(nome) {
  return {
    basico: {
      nome: nome || '', tecnica: '', cla: '', classe: '',
      nacionalidade: '', idade: '', altura: '', peso: ''
    },
    imagens: {
      bannerUrl: '',
      tokenUrl: ''
    },
    descricao: '',
    status: {
      emocaoAtual: '', buffDebuffEmocao: '',
      vidaAtual: 0, vidaMax: 0,
      bloquear: 0,
      eaAtual: 0, eaMax: 0,
      output: 0
    },
    atributos: {
      quantidadeEA: '-G4', refinoEA: '-G4', combate: '-G4', agilidade: '-G4',
      intelecto: '-G4', vigor: '-G4', presenca: '-G4', velocidade: '-G4'
    },
    tecnicaInata: {
      nome: '', descricao: '', funcionamento: '',
      condicoes: '', limitacoes: '', custos: '', efeitosAdicionais: ''
    },
    habilidadesEspeciais: [],
    inventario: [], // agora: [{ itemId, quantidade }]
    tecnicasDominio: [],
    blackFlash: { contador: 0, historico: [] },
    historiaLore: '',
    personalidade: {
      personalidade: '', gostos: '', desgostos: '', medos: '',
      objetivos: '', motivacoes: '', manias: ''
    },
    relacionamentos: {
      familia: '', aliados: '', amigos: '', rivais: '', inimigos: '', mentores: ''
    },
    observacoes: '',
    infoDesconhecidas: {
      segredos: '', potencialOculto: '', habilidadesDesconhecidas: '',
      condicoesDesconhecidas: '', outros: ''
    },
    _meta: {
      donoUserKey: null,
      criadoEm: null,
      atualizadoEm: null
    }
  };
}

module.exports = { TABELA_GRAU, grauParaPontos, calcularStatusDerivado, fichaVazia };
