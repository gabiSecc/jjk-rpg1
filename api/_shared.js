// api/_shared.js
const crypto = require('crypto');
const admin = require('firebase-admin');

// ============================================================ AUTH
const USERS = {
  rpgjjk_kaue:   { senha: 'jjk_dos_cri4a$_001', nome: 'Kauê',   role: 'player' },
  rpgjjk_kaua:   { senha: 'jjk_dos_cri4a$_002', nome: 'Kauã',   role: 'player' },
  rpgjjk_igor:   { senha: 'jjk_dos_cri4a$_003', nome: 'Igor',   role: 'player' },
  rpgjjk_dudu:   { senha: 'jjk_dos_cri4a$_004', nome: 'Dudu',   role: 'player' },
  rpgjjk_mestre: { senha: 'jjk_dos_cri4a$_005', nome: 'Mestre', role: 'master' }
};
const SESSION_SECRET = process.env.SESSION_SECRET || 'troque-isto-no-vercel-env';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function sign(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch { return null; }
}
function login(userKey, senha) {
  const u = USERS[userKey];
  if (!u || u.senha !== senha) return null;
  return sign({ userKey, nome: u.nome, role: u.role, exp: Date.now() + SESSION_TTL_MS });
}
function requireSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verify(token);
}

// ============================================================ FIREBASE
function getAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (!projectId || !clientEmail || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Variáveis de ambiente do Firebase ausentes.');
    }
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
    if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
    try {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    } catch (err) { throw new Error('Falha ao inicializar Firebase Admin: ' + err.message); }
  }
  return admin;
}

// ============================================================ CLOUDINARY
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function uploadImagem(base64, folder) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) throw new Error('Cloudinary não configurado');
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + API_SECRET).digest('hex');
  const form = new URLSearchParams();
  form.append('file', `data:image/png;base64,${base64}`);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Falha no upload para o Cloudinary');
  return data.secure_url;
}

// ============================================================ REGRAS
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
function grauParaPontos(label) {
  const g = TABELA_GRAU.find(g => g.label === label);
  return g ? g.pontos : 0;
}
function eaBase(pts) {
  if (pts <= 0) return 0;
  const faixa = Math.floor((pts - 1) / 3);
  const pos = (pts - 1) % 3;
  if (faixa === 0) return 50 + pos * 25;
  return 100 * Math.pow(2, faixa) + pos * 50 * Math.pow(2, faixa - 1);
}

const KOKUSEN_PERC = 0.2;
const STATS_BONUS = ['vidaMax', 'eaMax', 'bloquear', 'cd', 'output'];
const EMOCOES_NOMES = ['Felicidade', 'Concentração', 'Coragem', 'Raiva', 'Insegurança', 'Tristeza'];

function gerarId() { return crypto.randomBytes(6).toString('hex'); }

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

// Black Flash: cada registro guarda o ganho de EA/Output do MOMENTO em que foi criado.
// Registros que já existiam no banco mantêm o ganho antigo (o cliente não consegue alterá-lo);
// registros novos (id desconhecido) têm o ganho calculado aqui, com os atributos atuais.
function processarBlackFlash(nova, atual) {
  const bf = nova.blackFlash || {};
  const hist = Array.isArray(bf.historico) ? bf.historico : [];
  const anteriores = new Map(
    ((atual && atual.blackFlash && atual.blackFlash.historico) || [])
      .filter(h => h && h.id && typeof h.eaGanho === 'number')
      .map(h => [h.id, h])
  );
  const base = calcularBase(nova.atributos);
  const resultado = [];
  hist.slice(0, 500).forEach(h => {
    const id = String((h && h.id) || gerarId());
    const antigo = anteriores.get(id);
    let eaGanho, outGanho;
    if (antigo) {
      eaGanho = antigo.eaGanho;
      outGanho = Number(antigo.outGanho) || 0;
    } else {
      const g = ganhoKokusen(base, resultado);
      eaGanho = g.eaGanho;
      outGanho = g.outGanho;
    }
    resultado.push({
      id,
      data: String((h && h.data) || '').slice(0, 80),
      descricao: String((h && h.descricao) || '').slice(0, 500),
      eaGanho,
      outGanho
    });
  });
  nova.blackFlash = { contador: resultado.length, historico: resultado };
}

function sanitizarBonusTemp(lista) {
  return (Array.isArray(lista) ? lista : [])
    .filter(b => b && STATS_BONUS.includes(b.stat))
    .slice(0, 50)
    .map(b => ({
      id: String(b.id || gerarId()),
      stat: b.stat,
      valor: Math.max(-1000000, Math.min(1000000, Number(b.valor) || 0)),
      nota: String(b.nota || '').slice(0, 80)
    }));
}

function sanitizarEmocao(status) {
  if (!EMOCOES_NOMES.includes(status.emocaoAtual)) {
    status.emocaoAtual = '';
    status.emocaoNivel = 0;
    return;
  }
  const n = Math.round(Number(status.emocaoNivel) || 1);
  status.emocaoNivel = Math.max(1, Math.min(4, n));
}

function fichaVazia(nome) {
  return {
    basico: { nome: nome || '', tecnica: '', cla: '', classe: '', nacionalidade: '', idade: '', altura: '', peso: '' },
    imagens: { bannerUrl: '', tokenUrl: '' },
    descricao: '',
    status: { emocaoAtual: '', emocaoNivel: 0, vidaAtual: 0, vidaMax: 0, bloquear: 0, cd: 0, eaAtual: 0, eaMax: 0, output: 0 },
    bonusTemp: [],
    atributos: { quantidadeEA: '-G4', refinoEA: '-G4', combate: '-G4', agilidade: '-G4', intelecto: '-G4', vigor: '-G4', presenca: '-G4', velocidade: '-G4' },
    mecanicaKaue: { ativo: false },
    tecnicaInata: { nome: '', grau: 'G4', descricao: '', funcionamento: '', condicoes: '', limitacoes: '', custos: '', efeitosAdicionais: '' },
    stacksMalditos: { 'G4': 0, 'G3': 0, 'semi G2': 0, 'G2': 0, 'semi G1': 0, 'G1': 0, 'semi Especial': 0, 'Especial': 0, 'Calamidade': 0 },
    habilidadesEspeciais: [],
    inventario: [],
    tecnicasDominio: [],
    blackFlash: { contador: 0, historico: [] },
    historiaLore: '',
    personalidade: { personalidade: '', gostos: '', desgostos: '', medos: '', objetivos: '', motivacoes: '', manias: '' },
    relacionamentos: { familia: '', aliados: '', amigos: '', rivais: '', inimigos: '', mentores: '' },
    observacoes: '',
    infoDesconhecidas: { segredos: '', potencialOculto: '', habilidadesDesconhecidas: '', condicoesDesconhecidas: '', outros: '' },
    _meta: { donoUserKey: null, criadoEm: null, atualizadoEm: null }
  };
}

module.exports = {
  USERS, login, verify, requireSession,
  getAdmin, uploadImagem,
  TABELA_GRAU, grauParaPontos, eaBase, calcularBase, ganhoKokusen,
  calcularStatusDerivado, processarBlackFlash, sanitizarBonusTemp, sanitizarEmocao,
  fichaVazia
};
