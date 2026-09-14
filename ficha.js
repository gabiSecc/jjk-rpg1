// public/ficha.js

const session = Api.getSession();
if (!session) window.location.href = '/login.html';

const params = new URLSearchParams(window.location.search);
const fichaId = params.get('id');
if (!fichaId) window.location.href = '/hub.html';

let ficha = null;
let catalogoItens = []; // cache do catálogo pra montar o select do inventário
let dirty = false;

document.getElementById('sessionInfo').textContent = session.nome + (session.role === 'master' ? ' · Mestre' : '');
document.getElementById('btnLogout').addEventListener('click', () => { Api.clearSession(); window.location.href = '/login.html'; });

function toast(msg, isErr){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=> t.classList.remove('show'), 2600);
}
function setSaveStatus(text, cls){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  el.className = 'save-status' + (cls ? ' '+cls : '');
}
function escapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function getPath(obj, path){ return path.split('.').reduce((o,k)=> (o ? o[k] : undefined), obj); }
function setPath(obj, path, value){
  const keys = path.split('.');
  let cur = obj;
  for(let i=0;i<keys.length-1;i++) cur = cur[keys[i]];
  cur[keys[keys.length-1]] = value;
}

window.addEventListener('beforeunload', (e) => { if(dirty){ e.preventDefault(); e.returnValue=''; } });

// ============================================================
// CARREGAR / SALVAR
// ============================================================
async function carregar(){
  setSaveStatus('Carregando ficha...');
  try{
    const [{ ficha: f }, { itens }] = await Promise.all([
      Api.obterFicha(fichaId),
      Api.listarItens()
    ]);
    ficha = f;
    catalogoItens = itens;
    setSaveStatus('');
    renderAll();
  }catch(err){
    setSaveStatus('Erro ao carregar ficha: ' + err.message, 'err');
  }
}

async function salvar(){
  setSaveStatus('Salvando...');
  try{
    const { ficha: atualizada } = await Api.salvarFicha(fichaId, ficha);
    ficha = atualizada;
    dirty = false;
    setSaveStatus('Ficha salva ✓', 'ok');
    renderStatusDerivado(); // reflete o cálculo oficial vindo do servidor
    setTimeout(()=> setSaveStatus(''), 2500);
  }catch(err){
    setSaveStatus('Erro ao salvar: ' + err.message, 'err');
  }
}
document.getElementById('btnSalvar').addEventListener('click', salvar);

// ============================================================
// RENDER
// ============================================================
function renderAll(){
  renderImagens();
  bindSimpleFields();
  renderAtributos();
  renderStatusDerivado();
  renderHabilidades();
  renderDominio();
  renderBlackFlash();
  renderInventario();
  aplicarPermissoes();
}

function aplicarPermissoes(){
  const card = document.getElementById('cardSegredos');
  if(session.role !== 'master') card.classList.add('hidden');
}

// ---------- BANNER / TOKEN ----------
function renderImagens(){
  const bannerImg = document.getElementById('bannerImg');
  const bannerEmpty = document.getElementById('bannerEmpty');
  const tokenImg = document.getElementById('tokenImg');
  const tokenEmpty = document.getElementById('tokenEmpty');

  if(ficha.imagens?.bannerUrl){
    bannerImg.src = ficha.imagens.bannerUrl;
    bannerImg.classList.remove('hidden');
    bannerEmpty.classList.add('hidden');
  } else {
    bannerImg.classList.add('hidden');
    bannerEmpty.classList.remove('hidden');
  }

  if(ficha.imagens?.tokenUrl){
    tokenImg.src = ficha.imagens.tokenUrl;
    tokenImg.classList.remove('hidden');
    tokenEmpty.classList.add('hidden');
  } else {
    tokenImg.classList.add('hidden');
    tokenEmpty.classList.remove('hidden');
  }
}

document.getElementById('btnEditBanner').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('bannerInput').click();
});
document.getElementById('bannerBox').addEventListener('click', () => {
  document.getElementById('bannerInput').click();
});
document.getElementById('tokenBox').addEventListener('click', () => {
  document.getElementById('tokenInput').click();
});

document.getElementById('bannerInput').addEventListener('change', (e) => handleImagemUpload(e, 'banner'));
document.getElementById('tokenInput').addEventListener('change', (e) => handleImagemUpload(e, 'token'));

async function handleImagemUpload(e, tipo){
  const file = e.target.files[0];
  if(!file) return;
  toast('Enviando imagem...');
  try{
    const { base64, mimeType } = await fileToBase64(file);
    const { url } = await Api.uploadImagem(fichaId, tipo, base64, mimeType);
    ficha.imagens = ficha.imagens || {};
    ficha.imagens[tipo === 'banner' ? 'bannerUrl' : 'tokenUrl'] = url;
    dirty = true;
    renderImagens();
    toast('Imagem enviada. Não esqueça de salvar a ficha.');
  }catch(err){
    toast('Erro no upload: ' + err.message, true);
  }
  e.target.value = '';
}

// ---------- campos simples com data-path ----------
function bindSimpleFields(){
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path');
    const val = getPath(ficha, path);
    el.value = (val !== undefined && val !== null) ? val : '';
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });
  document.querySelectorAll('[data-path]').forEach(el => {
    el.addEventListener('input', () => {
      const path = el.getAttribute('data-path');
      let value = el.value;
      if(el.type === 'number') value = value === '' ? 0 : Number(value);
      setPath(ficha, path, value);
      dirty = true;
      if(path.startsWith('status.')) renderStatusDerivado();
    });
  });
}

// ---------- atributos ----------
const ATRIBUTOS_DEF = [
  { key:'quantidadeEA', label:'Quantidade de Energia Amaldiçoada' },
  { key:'refinoEA', label:'Refino de Energia Amaldiçoada' },
  { key:'combate', label:'Combate' },
  { key:'agilidade', label:'Agilidade' },
  { key:'intelecto', label:'Intelecto' },
  { key:'vigor', label:'Vigor' },
  { key:'presenca', label:'Presença' },
  { key:'velocidade', label:'Velocidade' }
];

function renderAtributos(){
  const grid = document.getElementById('attrGrid');
  grid.innerHTML = '';
  ATRIBUTOS_DEF.forEach(def => {
    const atual = ficha.atributos[def.key] || '-G4';
    const item = document.createElement('div');
    item.className = 'attr-item';
    item.innerHTML = `
      <span class="attr-name">${def.label}</span>
      <div class="attr-controls">
        <select data-attr="${def.key}"></select>
        <span class="attr-mod" id="mod_${def.key}"></span>
      </div>
    `;
    const select = item.querySelector('select');
    TABELA_GRAU.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.label;
      opt.textContent = g.label;
      if(g.label === atual) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      ficha.atributos[def.key] = select.value;
      dirty = true;
      atualizarModificadorEl(document.getElementById('mod_'+def.key), select.value);
      renderStatusDerivado();
    });
    grid.appendChild(item);
    atualizarModificadorEl(item.querySelector(`#mod_${def.key}`), atual);
  });
}
function atualizarModificadorEl(el, grauLabel){
  el.textContent = `1d20 + ${grauParaModificador(grauLabel)}`;
}

// ---------- status derivado ----------
function renderStatusDerivado(){
  const derivado = calcularStatusDerivado(ficha.atributos);
  ficha.status.vidaMax = derivado.vidaMax;
  ficha.status.eaMax = derivado.eaMax;
  ficha.status.bloquear = derivado.bloquear;
  ficha.status.output = derivado.output;

  document.getElementById('disp_vidaMax').textContent = derivado.vidaMax;
  document.getElementById('disp_eaMax').textContent = derivado.eaMax;
  document.getElementById('disp_bloquear').textContent = derivado.bloquear;
  document.getElementById('disp_output').textContent = derivado.output;

  document.getElementById('f_vidaAtual').value = ficha.status.vidaAtual || 0;
  document.getElementById('f_eaAtual').value = ficha.status.eaAtual || 0;

  const pctVida = derivado.vidaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.vidaAtual/derivado.vidaMax)*100)) : 0;
  const pctEA = derivado.eaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.eaAtual/derivado.eaMax)*100)) : 0;
  document.getElementById('bar_vida').style.width = pctVida + '%';
  document.getElementById('bar_ea').style.width = pctEA + '%';
}

// ============================================================
// BLOCOS DINÂMICOS
// ============================================================

// ---------- HABILIDADES ESPECIAIS ----------
function renderHabilidades(){
  const wrap = document.getElementById('habilidadesList');
  wrap.innerHTML = '';
  if(ficha.habilidadesEspeciais.length === 0){
    wrap.innerHTML = '<div class="empty-state">Nenhuma habilidade registrada ainda.</div>';
  }
  ficha.habilidadesEspeciais.forEach((hab, idx) => {
    const item = document.createElement('div');
    item.className = 'dyn-item';
    item.innerHTML = `
      <div class="dyn-item-head">
        <input type="text" placeholder="Nome da habilidade" value="${escapeHtml(hab.nome)}" data-hab-field="nome" data-idx="${idx}">
        <button class="btn-remove" data-hab-remove="${idx}" type="button">✕</button>
      </div>
      <div class="field-block"><label>Funcionamento</label><textarea rows="2" data-hab-field="funcionamento" data-idx="${idx}">${escapeHtml(hab.funcionamento)}</textarea></div>
      <div class="two-col">
        <div class="field-block"><label>Condições</label><textarea rows="2" data-hab-field="condicoes" data-idx="${idx}">${escapeHtml(hab.condicoes)}</textarea></div>
        <div class="field-block"><label>Custo</label><textarea rows="2" data-hab-field="custo" data-idx="${idx}">${escapeHtml(hab.custo)}</textarea></div>
      </div>
      <div class="two-col">
        <div class="field-block"><label>Efeitos</label><textarea rows="2" data-hab-field="efeitos" data-idx="${idx}">${escapeHtml(hab.efeitos)}</textarea></div>
        <div class="field-block"><label>Limitações</label><textarea rows="2" data-hab-field="limitacoes" data-idx="${idx}">${escapeHtml(hab.limitacoes)}</textarea></div>
      </div>
    `;
    wrap.appendChild(item);
  });
  wrap.querySelectorAll('[data-hab-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-idx'));
      ficha.habilidadesEspeciais[idx][el.getAttribute('data-hab-field')] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-hab-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.habilidadesEspeciais.splice(Number(btn.getAttribute('data-hab-remove')),1);
      dirty = true;
      renderHabilidades();
    });
  });
}
document.getElementById('btnAddHabilidade').addEventListener('click', () => {
  ficha.habilidadesEspeciais.push({ nome:'', funcionamento:'', condicoes:'', custo:'', efeitos:'', limitacoes:'' });
  dirty = true;
  renderHabilidades();
});

// ---------- DOMÍNIO / TÉCNICAS AVANÇADAS ----------
function renderDominio(){
  const wrap = document.getElementById('dominioList');
  wrap.innerHTML = '';
  if(ficha.tecnicasDominio.length === 0){
    wrap.innerHTML = '<div class="empty-state">Nenhuma técnica de domínio/avançada registrada ainda.</div>';
  }
  ficha.tecnicasDominio.forEach((t, idx) => {
    const item = document.createElement('div');
    item.className = 'dyn-item';
    item.innerHTML = `
      <div class="dyn-item-head">
        <input type="text" placeholder="Nome (ex: Expansão de Domínio)" value="${escapeHtml(t.nome)}" data-dom-field="nome" data-idx="${idx}">
        <button class="btn-remove" data-dom-remove="${idx}" type="button">✕</button>
      </div>
      <div class="field-block"><label>Tipo</label><input type="text" placeholder="ex: Expansão de Domínio, Reversão de Maldição..." value="${escapeHtml(t.tipo)}" data-dom-field="tipo" data-idx="${idx}"></div>
      <div class="field-block"><label>Descrição</label><textarea rows="2" data-dom-field="descricao" data-idx="${idx}">${escapeHtml(t.descricao)}</textarea></div>
      <div class="two-col">
        <div class="field-block"><label>Custo</label><textarea rows="2" data-dom-field="custo" data-idx="${idx}">${escapeHtml(t.custo)}</textarea></div>
        <div class="field-block"><label>Cooldown / Restrição</label><textarea rows="2" data-dom-field="cooldown" data-idx="${idx}">${escapeHtml(t.cooldown)}</textarea></div>
      </div>
    `;
    wrap.appendChild(item);
  });
  wrap.querySelectorAll('[data-dom-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-idx'));
      ficha.tecnicasDominio[idx][el.getAttribute('data-dom-field')] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-dom-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.tecnicasDominio.splice(Number(btn.getAttribute('data-dom-remove')),1);
      dirty = true;
      renderDominio();
    });
  });
}
document.getElementById('btnAddDominio').addEventListener('click', () => {
  ficha.tecnicasDominio.push({ nome:'', tipo:'', descricao:'', custo:'', cooldown:'' });
  dirty = true;
  renderDominio();
});

// ---------- BLACK FLASH ----------
function renderBlackFlash(){
  document.getElementById('bf_contador').value = ficha.blackFlash.contador || 0;
  const wrap = document.getElementById('bfList');
  wrap.innerHTML = '';
  if(ficha.blackFlash.historico.length === 0){
    wrap.innerHTML = '<div class="empty-state">Nenhum Black Flash registrado ainda.</div>';
  }
  ficha.blackFlash.historico.forEach((h, idx) => {
    const row = document.createElement('div');
    row.className = 'bf-entry';
    row.innerHTML = `
      <input type="text" class="bf-date" placeholder="data/sessão" value="${escapeHtml(h.data)}" data-bf-field="data" data-idx="${idx}">
      <input type="text" placeholder="descrição do momento" value="${escapeHtml(h.descricao)}" data-bf-field="descricao" data-idx="${idx}">
      <button class="btn-remove" data-bf-remove="${idx}" type="button">✕</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-bf-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-idx'));
      ficha.blackFlash.historico[idx][el.getAttribute('data-bf-field')] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-bf-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.blackFlash.historico.splice(Number(btn.getAttribute('data-bf-remove')),1);
      dirty = true;
      renderBlackFlash();
    });
  });
}
document.getElementById('bf_contador').addEventListener('input', (e) => {
  ficha.blackFlash.contador = Number(e.target.value || 0);
  dirty = true;
});
document.getElementById('btnAddBF').addEventListener('click', () => {
  ficha.blackFlash.historico.push({ data:'', descricao:'' });
  ficha.blackFlash.contador = (ficha.blackFlash.contador || 0) + 1;
  dirty = true;
  renderBlackFlash();
});

// ---------- INVENTÁRIO (referencia catálogo global) ----------
function montarSelectCatalogo(){
  const sel = document.getElementById('invSelectItem');
  sel.innerHTML = '<option value="">Selecione um item do catálogo...</option>';
  catalogoItens.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.nome + (it.tipo ? ` (${it.tipo})` : '');
    sel.appendChild(opt);
  });
}

function renderInventario(){
  montarSelectCatalogo();
  const wrap = document.getElementById('inventarioList');
  wrap.innerHTML = '';
  if(ficha.inventario.length === 0){
    wrap.innerHTML = '<div class="empty-state">Inventário vazio. Adicione itens do catálogo acima.</div>';
    return;
  }
  ficha.inventario.forEach((entry, idx) => {
    const item = catalogoItens.find(i => i.id === entry.itemId);
    const row = document.createElement('div');
    row.className = 'inv-item';
    row.innerHTML = `
      <div class="inv-item-img" style="${item?.imagemUrl ? `background-image:url('${item.imagemUrl}')` : ''}"></div>
      <div class="inv-item-info">
        <div class="inv-item-name">${escapeHtml(item ? item.nome : '(item removido do catálogo)')}</div>
        <div class="inv-item-meta">${item?.dano ? 'dano: ' + escapeHtml(item.dano) : ''}</div>
      </div>
      <input type="number" class="inv-item-qty" min="1" value="${entry.quantidade || 1}" data-inv-qty="${idx}">
      <button class="btn-remove" data-inv-remove="${idx}" type="button">✕</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-inv-qty]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-inv-qty'));
      ficha.inventario[idx].quantidade = Number(el.value || 1);
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-inv-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.inventario.splice(Number(btn.getAttribute('data-inv-remove')),1);
      dirty = true;
      renderInventario();
    });
  });
}
document.getElementById('btnAddInvItem').addEventListener('click', () => {
  const sel = document.getElementById('invSelectItem');
  if(!sel.value) return;
  const existente = ficha.inventario.find(e => e.itemId === sel.value);
  if(existente){
    existente.quantidade = (existente.quantidade || 1) + 1;
  } else {
    ficha.inventario.push({ itemId: sel.value, quantidade: 1 });
  }
  dirty = true;
  renderInventario();
});

// ---------- TABELA DE GRAU (referência) ----------
function renderTabelaGrau(){
  const table = document.getElementById('tabelaGrauTable');
  let html = '<tr><th>Nível</th><th>Pontos</th><th>Modificador</th></tr>';
  TABELA_GRAU.forEach(g => { html += `<tr><td>${g.label}</td><td>${g.pontos}</td><td>1d20 + ${g.pontos}</td></tr>`; });
  table.innerHTML = html;
}
renderTabelaGrau();

function setupCollapsible(toggleId, bodyId){
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  body.classList.add('collapsed');
  toggle.querySelector('.chev').style.transform = 'rotate(-90deg)';
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.querySelector('.chev').style.transform = body.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
  });
}
setupCollapsible('toggleTabela', 'tabelaGrauWrap');
setupCollapsible('toggleRegras', 'regrasWrap');

// ============================================================
// INIT
// ============================================================
carregar();
