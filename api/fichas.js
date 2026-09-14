// api/fichas.js
const { getAdmin } = require('../lib/firebase');
const { requireSession } = require('../lib/auth');
const { calcularStatusDerivado, fichaVazia } = require('../lib/regras');

module.exports = async (req, res) => {
  const session = requireSession(req);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });

  const admin = getAdmin();
  const db = admin.firestore();
  const col = db.collection('fichas');

  try {
    // ---------- LISTAR (hub) ----------
    // GET /api/fichas -> lista fichas do próprio usuário (ou todas, se mestre)
    if (req.method === 'GET' && !req.query.id) {
      let snap;
      if (session.role === 'master') {
        snap = await col.orderBy('_meta.criadoEm', 'desc').get();
      } else {
        snap = await col.where('_meta.donoUserKey', '==', session.userKey)
                         .orderBy('_meta.criadoEm', 'desc').get();
      }
      const lista = snap.docs.map(d => {
        const f = d.data();
        return {
          id: d.id,
          nome: f.basico?.nome || '(sem nome)',
          tokenUrl: f.imagens?.tokenUrl || '',
          bannerUrl: f.imagens?.bannerUrl || '',
          donoUserKey: f._meta?.donoUserKey,
          atualizadoEm: f._meta?.atualizadoEm
        };
      });
      return res.status(200).json({ fichas: lista });
    }

    // ---------- LER UMA ----------
    if (req.method === 'GET' && req.query.id) {
      const doc = await col.doc(req.query.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Ficha não encontrada' });
      const f = doc.data();
      if (session.role !== 'master' && f._meta?.donoUserKey !== session.userKey) {
        return res.status(403).json({ error: 'Você não tem acesso a esta ficha' });
      }
      return res.status(200).json({ id: doc.id, ficha: f });
    }

    // ---------- CRIAR ----------
    if (req.method === 'POST') {
      const nome = (req.body?.nome || 'Novo Feiticeiro').trim();
      const nova = fichaVazia(nome);
      nova._meta.donoUserKey = session.userKey;
      nova._meta.criadoEm = Date.now();
      nova._meta.atualizadoEm = Date.now();
      const ref = await col.add(nova);
      return res.status(201).json({ id: ref.id, ficha: nova });
    }

    // ---------- ATUALIZAR ----------
    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'ID da ficha é obrigatório' });

      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Ficha não encontrada' });
      const atual = doc.data();
      if (session.role !== 'master' && atual._meta?.donoUserKey !== session.userKey) {
        return res.status(403).json({ error: 'Você não tem permissão para editar esta ficha' });
      }

      const nova = req.body?.ficha;
      if (!nova) return res.status(400).json({ error: 'Corpo da requisição sem ficha' });

      // Jogadores comuns não podem alterar as informações desconhecidas (só o mestre)
      if (session.role !== 'master') {
        nova.infoDesconhecidas = atual.infoDesconhecidas;
      }

      // Recalcula status derivado no servidor (fonte confiável)
      const derivado = calcularStatusDerivado(nova.atributos || {});
      nova.status = { ...nova.status, ...derivado };

      // Preserva metadados de dono/criação
      nova._meta = {
        ...atual._meta,
        atualizadoEm: Date.now()
      };

      await col.doc(id).set(nova);
      return res.status(200).json({ id, ficha: nova });
    }

    // ---------- DELETAR ----------
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'ID da ficha é obrigatório' });

      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Ficha não encontrada' });
      const atual = doc.data();
      if (session.role !== 'master' && atual._meta?.donoUserKey !== session.userKey) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir esta ficha' });
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
