// lib/auth.js
const crypto = require('crypto');

// ============================================================
// USUÁRIOS FIXOS — troque as senhas via variável de ambiente
// se quiser (ver USERS_OVERRIDE abaixo), ou edite direto aqui.
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
  const session = {
    userKey,
    nome: u.nome,
    role: u.role,
    exp: Date.now() + SESSION_TTL_MS
  };
  return sign(session);
}

// Extrai e valida sessão a partir do header Authorization: Bearer <token>
function requireSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = verify(token);
  return session; // null se inválido/expirado
}

module.exports = { USERS, login, verify, requireSession };
