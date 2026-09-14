// api/upload-imagem.js
const { getAdmin, requireSession, uploadImagem } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const session = requireSession(req);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

  const { fichaId, tipo, imagemBase64, mimeType } = req.body || {};
  if (!imagemBase64 || !tipo || !['banner', 'token', 'item'].includes(tipo)) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }
  if (!mimeType || !mimeType.startsWith('image/')) {
    return res.status(400).json({ error: 'Arquivo precisa ser uma imagem' });
  }
  if (imagemBase64.length > 7_000_000) {
    return res.status(413).json({ error: 'Imagem muito grande (máx ~5MB)' });
  }

  try {
    if (tipo !== 'item') {
      if (!fichaId) return res.status(400).json({ error: 'fichaId é obrigatório' });
      const admin = getAdmin();
      const db = admin.firestore();
      const doc = await db.collection('fichas').doc(fichaId).get();
      if (!doc.exists) return res.status(404).json({ error: 'Ficha não encontrada' });
      const f = doc.data();
      if (session.role !== 'master' && f._meta?.donoUserKey !== session.userKey) {
        return res.status(403).json({ error: 'Sem permissão para editar esta ficha' });
      }
    }

    const url = await uploadImagem(imagemBase64, `rpgjjk/${tipo}s`);
    return res.status(200).json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao enviar imagem: ' + err.message });
  }
};
