// api/itens.js
const { getAdmin, requireSession } = require('./_shared');

// Aceita só URL https sem caracteres que quebrem o CSS/HTML; senão vira ''
function urlSegura(u) {
  const s = String(u || '');
  return /^https:\/\/[^\s'"()<>\\]+$/.test(s) ? s : '';
}

// Peso: número >= 0; vazio/inválido vira 1
function pesoSeguro(p) {
  if (p === '' || p === null || p === undefined) return 1;
  const n = Number(p);
  if (!isFinite(n) || n < 0) return 1;
  return Math.min(1000, Math.round(n * 100) / 100);
}

module.exports = async (req, res) => {
  const session = requireSession(req);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

  try {
    const admin = getAdmin();
    const db = admin.firestore();
    const col = db.collection('itens');

    if (req.method === 'GET') {
      const snap = await col.get();
      const lista = snap.docs
        .map(d => {
          const it = { id: d.id, ...d.data() };
          if (typeof it.peso !== 'number') it.peso = 1; // itens antigos entram com peso 1
          return it;
        })
        .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      return res.status(200).json({ itens: lista });
    }

    if (req.method === 'POST') {
      const { nome, descricao, dano, tipo, imagemUrl, peso } = req.body || {};
      if (!nome || !String(nome).trim()) return res.status(400).json({ error: 'Nome do item é obrigatório' });

      const novo = {
        nome: String(nome).trim().slice(0, 100),
        descricao: String(descricao || '').slice(0, 2000),
        dano: String(dano || '').slice(0, 100),
        tipo: String(tipo || '').slice(0, 100),
        peso: pesoSeguro(peso),
        imagemUrl: urlSegura(imagemUrl),
        criadoPor: session.nome,
        criadoPorUserKey: session.userKey,
        criadoEm: Date.now()
      };
      const ref = await col.add(novo);
      return res.status(201).json({ id: ref.id, item: novo });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'ID do item é obrigatório' });
      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Item não encontrado' });
      const item = doc.data();
      if (session.role !== 'master' && item.criadoPorUserKey !== session.userKey) {
        return res.status(403).json({ error: 'Só quem criou o item (ou o mestre) pode removê-lo' });
      }
      await col.doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
};
