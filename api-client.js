// public/api-client.js
// Wrapper de fetch com token de sessão, usado em todas as páginas.

const Api = (function () {
  function getToken() {
    return localStorage.getItem('rpgjjk_token');
  }
  function getSession() {
    const raw = localStorage.getItem('rpgjjk_session');
    return raw ? JSON.parse(raw) : null;
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
    if (res.status === 401) {
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // data:image/png;base64,AAAA
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
