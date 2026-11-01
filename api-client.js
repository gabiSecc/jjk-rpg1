// public/api-client.js
// Wrapper de fetch com token de sessão, usado em todas as páginas.

const Api = (function () {
  function getToken() {
    return localStorage.getItem('rpgjjk_token');
  }
  function getSession() {
    const raw = localStorage.getItem('rpgjjk_session');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setSession(token, session) {
    localStorage.setItem('rpgjjk_token', token);
    localStorage.setItem('rpgjjk_session', JSON.stringify(session));
  }
  function clearSession() {
    localStorage.removeItem('rpgjjk_token');
    localStorage.removeItem('rpgjjk_session');
  }

  async function request(path, opts = {}) {
    const token = getToken();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {},
      opts.headers || {}
    );
    const res = await fetch(path, { ...opts, headers });
    // 401 no login = senha errada (não desloga/redireciona)
    if (res.status === 401 && path !== '/api/login') {
      clearSession();
      window.location.href = '/login.html';
      throw new Error('Sessão expirada');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('Erro ' + res.status));
    return data;
  }

  return {
    getSession, setSession, clearSession,
    login: (userKey, senha) => request('/api/login', { method: 'POST', body: JSON.stringify({ userKey, senha }) }),
    listarFichas: () => request('/api/fichas'),
    obterFicha: (id) => request('/api/fichas?id=' + encodeURIComponent(id)),
    criarFicha: (nome) => request('/api/fichas', { method: 'POST', body: JSON.stringify({ nome }) }),
    salvarFicha: (id, ficha) => request('/api/fichas?id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ ficha }) }),
    excluirFicha: (id) => request('/api/fichas?id=' + encodeURIComponent(id), { method: 'DELETE' }),
    uploadImagem: (fichaId, tipo, imagemBase64, mimeType) => request('/api/upload-imagem', {
      method: 'POST', body: JSON.stringify({ fichaId, tipo, imagemBase64, mimeType })
    }),
    listarItens: () => request('/api/itens'),
    criarItem: (item) => request('/api/itens', { method: 'POST', body: JSON.stringify(item) }),
    excluirItem: (id) => request('/api/itens?id=' + encodeURIComponent(id), { method: 'DELETE' })
  };
})();

function lerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Lê a imagem e, se for grande (> 1,5MB), reduz para no máx. 1600px em JPEG.
// Assim nunca estoura o limite de ~4,5MB de corpo da Vercel.
// GIF/SVG não são reduzidos (para não perder animação/vetor).
async function fileToBase64(file) {
  const tipoSemReduzir = file.type === 'image/gif' || file.type === 'image/svg+xml';
  if (file.size <= 1.5 * 1024 * 1024 || tipoSemReduzir) {
    const result = await lerComoDataUrl(file);
    return { base64: result.split(',')[1], mimeType: file.type };
  }
  const dataUrl = await lerComoDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Não foi possível ler a imagem'));
    i.src = dataUrl;
  });
  const MAX = 1600;
  const escala = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: out.split(',')[1], mimeType: 'image/jpeg' };
}
