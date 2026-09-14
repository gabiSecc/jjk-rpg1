// api/_shared.js
// Tudo que as serverless functions precisam, num único arquivo dentro de
// api/. Isso evita problemas de empacotamento da Vercel com require('../lib/...')
// apontando pra fora da pasta api/.

const crypto = require('crypto');
const admin = require('firebase-admin');

// ============================================================
// AUTH
// ============================================================
const USERS = {
  rpgjjk_kaue:   { senha: 'jjk_dos_cri4a$_001', nome: 'Kauê',   role: 'player' },
  rpgjjk_kaua:   { senha: 'jjk_dos_cri4a$_002', nome: 'Kauã',   role: 'player' },
  rpgjjk_igor:   { senha: 'jjk_dos_cri4a$_003', nome: 'Igor',   role: 'player' },
  rpgjjk_dudu:   { senha: 'jjk_dos_cri4a$_004', nome: 'Dudu',   role: 'player' },
  rpgjjk_mestre: { senha: 'jjk_dos_cri4a$_005', nome: 'Mestre', role: 'master' }
};

const SESSION_SECRET = process.env.SESSION_SECRET || 'troque-isto-no-vercel-env';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

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
  } catch {
    return null;
  }
}

function login(userKey, senha) {
  const u = USERS[userKey];
  if (!u || u.senha !== senha) return null;
  const session = { userKey, nome: u.nome, role: u.role, exp: Date.now() + SESSION_TTL_MS };
  return sign(session);
}

function requireSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verify(token);
}

// ============================================================
// FIREBASE
// ============================================================
function getAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !clientEmail || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error(
        'Variáveis de ambiente do Firebase ausentes. Confira FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY nas Environment Variables da Vercel.'
      );
    }

    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    } catch (err) {
      throw new Error('Falha ao inicializar Firebase Admin: ' + err.message);
    }
  }
  return admin;
}

// ============================================================
// CLOUDINARY
// ============================================================
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function uploadImagem(base64, folder) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Cloudinary não configurado (variáveis de ambiente ausentes)');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + API_SECRET).digest('hex');

  const form = new URLSearchParams();
  form.append('file', `data:image/png;base64,${base64}`);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Falha no upload para o Cloudinary');
  return data.secure_url;
}

// ============================================================
// REGRAS DE CÁLCULO
// ============================================================
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
    basico: { nome: nome || '', tecnica: '', cla: '', classe: '', nacionalidade: '', idade: '', altura: '', peso: '' },
    imagens: { bannerUrl: '', tokenUrl: '' },
    descricao: '',
    status: { emocaoAtual: '', buffDebuffEmocao: '', vidaAtual: 0, vidaMax: 0, bloquear: 0, eaAtual: 0, eaMax: 0, output: 0 },
    atributos: { quantidadeEA: '-G4', refinoEA: '-G4', combate: '-G4', agilidade: '-G4', intelecto: '-G4', vigor: '-G4', presenca: '-G4', velocidade: '-G4' },
    tecnicaInata: { nome: '', descricao: '', funcionamento: '', condicoes: '', limitacoes: '', custos: '', efeitosAdicionais: '' },
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
  TABELA_GRAU, grauParaPontos, calcularStatusDerivado, fichaVazia
};
