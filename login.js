// api/login.js
const { login } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  const { userKey, senha } = req.body || {};
  if (!userKey || !senha) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const token = login(userKey, senha);
  if (!token) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  return res.status(200).json({ token });
};
