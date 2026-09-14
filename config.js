// ============================================================
// CONFIGURAÇÃO — RPG JJK
// ============================================================
// 1. Crie uma conta grátis em https://jsonbin.io
// 2. Pegue sua "X-Master-Key" em https://jsonbin.io/api-keys
// 3. Cole abaixo em JSONBIN_KEY
// 4. Para cada jogador, crie um bin vazio com conteúdo {} em
//    https://jsonbin.io/ e cole o ID de cada bin abaixo em BIN_ID
// ============================================================

const JSONBIN_KEY = "$2a$10$OC9tpJVxy7PBokT/i5z.iu9PVPc47Y1uViFSr/itrbR/1Q/tfgdLW";

const USERS = {
  "rpgjjk_kaue":  { senha: "jjk_dos_cri4a$_001", nome: "Kauê",  binId: "6aa7553dac6210605ac99973", role: "player" },
  "rpgjjk_kaua":  { senha: "jjk_dos_cri4a$_002", nome: "Kauã",  binId: "COLE_O_BIN_ID_AQUI", role: "player" },
  "rpgjjk_igor":  { senha: "jjk_dos_cri4a$_003", nome: "Igor",  binId: "COLE_O_BIN_ID_AQUI", role: "player" },
  "rpgjjk_dudu":  { senha: "jjk_dos_cri4a$_004", nome: "Dudu",  binId: "COLE_O_BIN_ID_AQUI", role: "player" },
  "rpgjjk_mestre":{ senha: "jjk_dos_cri4a$_005", nome: "Mestre",binId: null, role: "master" }
};

// Lista de todos os bins que o mestre pode visualizar (todas as fichas)
const ALL_PLAYER_KEYS = ["rpgjjk_kaue", "rpgjjk_kaua", "rpgjjk_igor", "rpgjjk_dudu"];

// Tabela de grau: nome -> pontos
const TABELA_GRAU = [
  { label: "-G4", pontos: 1 }, { label: "G4", pontos: 2 }, { label: "+G4", pontos: 3 },
  { label: "-G3", pontos: 4 }, { label: "G3", pontos: 5 }, { label: "+G3", pontos: 6 },
  { label: "-semi G2", pontos: 7 }, { label: "semi G2", pontos: 8 }, { label: "+semi G2", pontos: 9 },
  { label: "-G2", pontos: 10 }, { label: "G2", pontos: 11 }, { label: "+G2", pontos: 12 },
  { label: "-semi G1", pontos: 13 }, { label: "semi G1", pontos: 14 }, { label: "+semi G1", pontos: 15 },
  { label: "-G1", pontos: 16 }, { label: "G1", pontos: 17 }, { label: "+G1", pontos: 18 },
  { label: "-semi Especial", pontos: 19 }, { label: "semi Especial", pontos: 20 }, { label: "+semi Especial", pontos: 21 },
  { label: "-Especial", pontos: 22 }, { label: "Especial", pontos: 23 }, { label: "+Especial", pontos: 24 },
  { label: "-Calamidade", pontos: 25 }, { label: "Calamidade", pontos: 26 }, { label: "+Calamidade", pontos: 27 },
  { label: "++Calamidade", pontos: 28 }, { label: "+++Calamidade", pontos: 29 }, { label: "++++Calamidade", pontos: 30 }
];

function grauParaPontos(label) {
  const g = TABELA_GRAU.find(g => g.label === label);
  return g ? g.pontos : 0;
}

function grauParaModificador(label) {
  // modificador = pontos do grau (regra: +G3 = 1d20+6)
  return grauParaPontos(label);
}

// Ficha em branco (estrutura padrão de uma ficha nova)
function fichaVazia(nome) {
  return {
    basico: {
      nome: nome || "", tecnica: "", cla: "", classe: "",
      nacionalidade: "", idade: "", altura: "", peso: ""
    },
    descricao: "",
    status: {
      emocaoAtual: "", buffDebuffEmocao: "",
      vidaAtual: 0, vidaMax: 0,
      bloquear: 0,
      eaAtual: 0, eaMax: 0,
      output: 0
    },
    atributos: {
      quantidadeEA: "-G4",
      refinoEA: "-G4",
      combate: "-G4",
      agilidade: "-G4",
      intelecto: "-G4",
      vigor: "-G4",
      presenca: "-G4",
      velocidade: "-G4"
    },
    tecnicaInata: {
      nome: "", descricao: "", funcionamento: "",
      condicoes: "", limitacoes: "", custos: "", efeitosAdicionais: ""
    },
    habilidadesEspeciais: [
      // { nome, funcionamento, condicoes, custo, efeitos, limitacoes }
    ],
    inventario: ["", "", "", "", "", "", "", ""],
    tecnicasDominio: [
      // Expansão de Domínio, Reversão de Maldição, etc.
      // { nome, tipo, descricao, custo, cooldown }
    ],
    blackFlash: {
      contador: 0,
      historico: [] // { data, descricao }
    },
    historiaLore: "",
    personalidade: {
      personalidade: "", gostos: "", desgostos: "",
      medos: "", objetivos: "", motivacoes: "", manias: ""
    },
    relacionamentos: {
      familia: "", aliados: "", amigos: "", rivais: "", inimigos: "", mentores: ""
    },
    observacoes: "",
    infoDesconhecidas: {
      segredos: "", potencialOculto: "", habilidadesDesconhecidas: "",
      condicoesDesconhecidas: "", outros: ""
    },
    _meta: {
      atualizadoEm: null
    }
  };
}
