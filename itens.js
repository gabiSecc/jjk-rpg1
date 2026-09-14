// api/itens.js
const { getAdmin } = require('../lib/firebase');
const { requireSession } = require('../lib/auth');

module.exports = async (req, res) => {
  const session = requireSession(req);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

  const admin = getAdmin();
  const db = admin.firestore();
  const col = db.collection('itens');

  try {
    // ---------- LISTAR (catálogo completo, todo mundo vê) ----------
    if (req.method === 'GET') {
      const snap = await col.orderBy('criadoEm', 'desc').get();
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ itens: lista });
    }

    // ---------- CRIAR ----------
    if (req.method === 'POST') {
      const { nome, descricao, dano, tipo, imagemUrl } = req.body || {};
      if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome do item é obrigatório' });

      const novo = {
        nome: nome.trim(),
        descricao: descricao || '',
        dano: dano || '',
        tipo: tipo || '',
        imagemUrl: imagemUrl || '',
        criadoPor: session.nome,
        criadoPorUserKey: session.userKey,
        criadoEm: Date.now()
      };
      const ref = await col.add(novo);
      return res.status(201).json({ id: ref.id, item: novo });
    }

    // ---------- DELETAR (só quem criou, ou mestre) ----------
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
