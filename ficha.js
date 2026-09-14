// ============================================================
// RPG JJK — Lógica da Ficha
// ============================================================

let session = null;
let ficha = null;
let currentBinId = null;
let dirty = false;

// ---------- AUTH GUARD ----------
(function checkAuth(){
  const raw = sessionStorage.getItem('rpgjjk_session');
  if(!raw){ window.location.href = 'index.html'; return; }
  session = JSON.parse(raw);
})();

document.getElementById('btnLogout').addEventListener('click', () => {
  sessionStorage.removeItem('rpgjjk_session');
  window.location.href = 'index.html';
});

// ---------- HELPERS ----------
function getPath(obj, path){
  return path.split('.').reduce((o,k)=> (o ? o[k] : undefined), obj);
}
function setPath(obj, path, value){
  const keys = path.split('.');
  let cur = obj;
  for(let i=0;i<keys.length-1;i++){
    cur = cur[keys[i]];
  }
  cur[keys[keys.length-1]] = value;
}
function toast(msg, ms=2600){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=> t.classList.remove('show'), ms);
}
function setSaveStatus(text, cls){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  el.className = 'save-status' + (cls ? ' '+cls : '');
}

// ---------- JSONBIN I/O ----------
async function jsonbinGet(binId){
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_KEY }
  });
  if(!res.ok) throw new Error('Falha ao carregar ficha (' + res.status + ')');
  const data = await res.json();
  return data.record;
}
async function jsonbinPut(binId, record){
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY
    },
    body: JSON.stringify(record)
  });
  if(!res.ok) throw new Error('Falha ao salvar ficha (' + res.status + ')');
  return res.json();
}

// ---------- CARREGAR FICHA ----------
async function carregarFicha(userKey){
  const u = USERS[userKey];
  if(!u || !u.binId || u.binId.includes('COLE_')){
    toast('Bin não configurado para ' + (u ? u.nome : userKey) + ' — veja config.js');
    ficha = fichaVazia(u ? u.nome : userKey);
    currentBinId = null;
    renderAll();
    return;
  }
  setSaveStatus('Carregando ficha...');
  try{
    const record = await jsonbinGet(u.binId);
    ficha = (record && record.basico) ? record : fichaVazia(u.nome);
    currentBinId = u.binId;
    setSaveStatus('');
    renderAll();
  }catch(err){
    console.error(err);
    setSaveStatus('Erro ao carregar. Usando ficha em branco.', 'err');
    ficha = fichaVazia(u.nome);
    currentBinId = u.binId;
    renderAll();
  }
}

async function salvarFicha(){
  if(!currentBinId){
    toast('Sem bin configurado — não é possível salvar. Veja config.js');
    return;
  }
  ficha._meta.atualizadoEm = new Date().toISOString();
  setSaveStatus('Salvando...');
  try{
    await jsonbinPut(currentBinId, ficha);
    setSaveStatus('Ficha salva ✓', 'ok');
    dirty = false;
    setTimeout(()=> setSaveStatus(''), 2500);
  }catch(err){
    console.error(err);
    setSaveStatus('Erro ao salvar. Tente novamente.', 'err');
  }
}
document.getElementById('btnSalvar').addEventListener('click', salvarFicha);

// aviso ao sair com alterações não salvas
window.addEventListener('beforeunload', (e) => {
  if(dirty){ e.preventDefault(); e.returnValue = ''; }
});

// ---------- SELETOR DE FICHA (mestre vê todas, jogador só a própria) ----------
function montarSeletor(){
  const sel = document.getElementById('selectorFicha');
  sel.innerHTML = '';
  document.getElementById('sessionInfo').textContent = session.nome + (session.role==='master' ? ' · Mestre' : '');

  if(session.role === 'master'){
    ALL_PLAYER_KEYS.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = USERS[key].nome;
      sel.appendChild(opt);
    });
    sel.classList.remove('hidden');
    sel.addEventListener('change', () => carregarFicha(sel.value));
    carregarFicha(sel.value);
  } else {
    sel.classList.add('hidden');
    carregarFicha(session.user);
  }
}

// mostrar/ocultar seção de segredos (só mestre)
function aplicarPermissoes(){
  const card = document.getElementById('cardSegredos');
  if(session.role !== 'master'){
    card.classList.add('hidden');
  }
}

// ============================================================
// RENDER — liga a ficha aos campos da tela
// ============================================================

function renderAll(){
  bindSimpleFields();
  renderAtributos();
  renderStatusDerivado();
  renderHabilidades();
  renderDominio();
  renderBlackFlash();
  renderInventario();
  aplicarPermissoes();
}

// ---- campos simples com data-path ----
function bindSimpleFields(){
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path');
    const val = getPath(ficha, path);
    el.value = (val !== undefined && val !== null) ? val : '';

    // remove listener antigo clonando o nó (evita duplicar binds ao recarregar)
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  // re-seleciona (agora clonados) e liga eventos
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

// ---- atributos (selects de grau) ----
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
      atualizarModificador(def.key);
      renderStatusDerivado();
    });
    grid.appendChild(item);
    atualizarModificadorEl(item.querySelector(`#mod_${def.key}`), atual);
  });
}
function atualizarModificador(key){
  const el = document.getElementById('mod_' + key);
  atualizarModificadorEl(el, ficha.atributos[key]);
}
function atualizarModificadorEl(el, grauLabel){
  const mod = grauParaModificador(grauLabel);
  el.textContent = `1d20 + ${mod}`;
}

// ---- status derivados (vida max, EA max, bloquear, output) ----
function renderStatusDerivado(){
  const vigorPts = grauParaPontos(ficha.atributos.vigor);
  const quantEAPts = grauParaPontos(ficha.atributos.quantidadeEA);
  const refinoPts = grauParaPontos(ficha.atributos.refinoEA);

  const vidaMax = vigorPts * 10;
  const eaMax = 25 + (quantEAPts * 50);
  const bloquear = 5 + vigorPts;
  const output = 5 + (refinoPts * 20);

  ficha.status.vidaMax = vidaMax;
  ficha.status.eaMax = eaMax;
  ficha.status.bloquear = bloquear;
  ficha.status.output = output;

  document.getElementById('disp_vidaMax').textContent = vidaMax;
  document.getElementById('disp_eaMax').textContent = eaMax;
  document.getElementById('disp_bloquear').textContent = bloquear;
  document.getElementById('disp_output').textContent = output;

  const vidaAtualInput = document.getElementById('f_vidaAtual');
  const eaAtualInput = document.getElementById('f_eaAtual');
  vidaAtualInput.value = ficha.status.vidaAtual || 0;
  eaAtualInput.value = ficha.status.eaAtual || 0;

  const pctVida = vidaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.vidaAtual/vidaMax)*100)) : 0;
  const pctEA = eaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.eaAtual/eaMax)*100)) : 0;
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
        <input type="text" placeholder="Nome da habilidade" value="${escapeAttr(hab.nome)}" data-hab-field="nome" data-idx="${idx}">
        <button class="btn-remove" data-hab-remove="${idx}" type="button">✕</button>
      </div>
      <div class="field-block">
        <label>Funcionamento</label>
        <textarea rows="2" data-hab-field="funcionamento" data-idx="${idx}">${escapeHtml(hab.funcionamento)}</textarea>
      </div>
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
      const field = el.getAttribute('data-hab-field');
      ficha.habilidadesEspeciais[idx][field] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-hab-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-hab-remove'));
      ficha.habilidadesEspeciais.splice(idx,1);
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
        <input type="text" placeholder="Nome (ex: Expansão de Domínio)" value="${escapeAttr(t.nome)}" data-dom-field="nome" data-idx="${idx}">
        <button class="btn-remove" data-dom-remove="${idx}" type="button">✕</button>
      </div>
      <div class="field-block">
        <label>Tipo</label>
        <input type="text" placeholder="ex: Expansão de Domínio, Reversão de Maldição, Amplificação..." value="${escapeAttr(t.tipo)}" data-dom-field="tipo" data-idx="${idx}">
      </div>
      <div class="field-block">
        <label>Descrição</label>
        <textarea rows="2" data-dom-field="descricao" data-idx="${idx}">${escapeHtml(t.descricao)}</textarea>
      </div>
      <div class="two-col">
        <div class="field-block"><label>Custo</label><textarea rows="2" data-dom-field="custo" data-idx="${idx}">${escapeHtml(t.custo)}</textarea></div>
        <div class="field-block"><label>Cooldown / Restrição de uso</label><textarea rows="2" data-dom-field="cooldown" data-idx="${idx}">${escapeHtml(t.cooldown)}</textarea></div>
      </div>
    `;
    wrap.appendChild(item);
  });
  wrap.querySelectorAll('[data-dom-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-idx'));
      const field = el.getAttribute('data-dom-field');
      ficha.tecnicasDominio[idx][field] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-dom-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-dom-remove'));
      ficha.tecnicasDominio.splice(idx,1);
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
      <input type="text" class="bf-date" placeholder="data/sessão" value="${escapeAttr(h.data)}" data-bf-field="data" data-idx="${idx}">
      <input type="text" placeholder="descrição do momento" value="${escapeAttr(h.descricao)}" data-bf-field="descricao" data-idx="${idx}">
      <button class="btn-remove" data-bf-remove="${idx}" type="button">✕</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-bf-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-idx'));
      const field = el.getAttribute('data-bf-field');
      ficha.blackFlash.historico[idx][field] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-bf-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-bf-remove'));
      ficha.blackFlash.historico.splice(idx,1);
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

// ---------- INVENTÁRIO ----------
function renderInventario(){
  const wrap = document.getElementById('inventarioList');
  wrap.innerHTML = '';
  ficha.inventario.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'inv-item';
    row.innerHTML = `
      <input type="text" placeholder="item ${idx+1}" value="${escapeAttr(item)}" data-inv-idx="${idx}">
      <button class="btn-remove" data-inv-remove="${idx}" type="button">✕</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-inv-idx]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = Number(el.getAttribute('data-inv-idx'));
      ficha.inventario[idx] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-inv-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-inv-remove'));
      ficha.inventario.splice(idx,1);
      dirty = true;
      renderInventario();
    });
  });
}
document.getElementById('btnAddItem').addEventListener('click', () => {
  ficha.inventario.push('');
  dirty = true;
  renderInventario();
});

// ---------- TABELA DE GRAU (referência) ----------
function renderTabelaGrau(){
  const table = document.getElementById('tabelaGrauTable');
  let html = '<tr><th>Nível</th><th>Pontos</th><th>Modificador</th></tr>';
  TABELA_GRAU.forEach(g => {
    html += `<tr><td>${g.label}</td><td>${g.pontos}</td><td>1d20 + ${g.pontos}</td></tr>`;
  });
  table.innerHTML = html;
}
renderTabelaGrau();

// ---------- collapsibles ----------
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

// ---------- escape helpers ----------
function escapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(str){ return escapeHtml(str); }

// ============================================================
// INIT
// ============================================================
montarSeletor();
