// public/ficha.js

const session = Api.getSession();
if (!session) window.location.href = '/login.html';

const params = new URLSearchParams(window.location.search);
const fichaId = params.get('id');
if (!fichaId) window.location.href = '/hub.html';

let ficha = null;
let catalogoItens = [];
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
function fmt(n){ return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }

window.addEventListener('beforeunload', (e) => { if(dirty){ e.preventDefault(); e.returnValue=''; } });

// ============================================================
// DESCRIÇÕES DOS GRAUS (tom Jujutsu)
// ============================================================
const DESC_GRAU = {
  'RESTRITO': 'Sem energia amaldiçoada utilizável, ou abaixo do nível humano. Não enxerga maldições.',
  '-G4': 'Abaixo de um feiticeiro comum; mais próximo de um humano comum com um fio de energia.',
  'G4': 'Nível de um feiticeiro comum. Cumpre missões básicas contra maldições fracas.',
  '+G4': 'Acima do feiticeiro comum; à beira de ser promovido a G3.',
  '-G3': 'Feiticeiro sólido em missões de rotina. Ainda sofre contra maldições organizadas.',
  'G3': 'Profissional confiável, capaz de exorcizar maldições de grau 3 sozinho.',
  '+G3': 'Veterano de campo, ameaça real para maldições de grau 3 e alguns grau 2.',
  '-semi G2': 'Ponte entre feiticeiros comuns e de nível superior; já chama atenção da Jujutsu.',
  'semi G2': 'Combatente tático, consegue sustentar lutas longas contra maldições G2.',
  '+semi G2': 'Quase G2 pleno; sua técnica já começa a definir o resultado da luta.',
  '-G2': 'Feiticeiro experiente, já lidera equipes em missões de risco.',
  'G2': 'Pilar das operações da Jujutsu; enfrenta maldições de grau 2 com segurança.',
  '+G2': 'Topo do G2. Um passo de ser reconhecido como elite.',
  '-semi G1': 'Talento fora da curva. Superiores começam a considerá-lo para grau 1.',
  'semi G1': 'Reconhecido como elite emergente, capaz de derrotar G1 em condições favoráveis.',
  '+semi G1': 'Praticamente G1; só falta o título e a chancela oficial.',
  '-G1': 'Feiticeiro de elite, um dos poucos capazes de enfrentar maldições de grau 1.',
  'G1': 'Elite da Jujutsu. Uma missão G1 sem ele custa vidas.',
  '+G1': 'Topo dos G1. Sua presença muda o rumo de qualquer confronto.',
  '-semi Especial': 'Aproxima-se do limiar Especial; poucos no mundo chegam aqui.',
  'semi Especial': 'Poder que rivaliza com maldições especiais. Convocado para crises nacionais.',
  '+semi Especial': 'A um passo da categoria dos monstros; um exército em uma pessoa.',
  '-Especial': 'Grau Especial iniciante. Uma anomalia entre os feiticeiros.',
  'Especial': 'Um dos feiticeiros mais fortes do mundo. Ameaça e salvação ao mesmo tempo.',
  '+Especial': 'Topo do Especial; poucos mortais chegam perto.',
  '-Calamidade': 'Poder capaz de derrubar cidades. Não é mais tratado como humano comum.',
  'Calamidade': 'Um desastre ambulante. Sua existência altera o equilíbrio do mundo.',
  '+Calamidade': 'Calamidade plena, com controle absoluto sobre o próprio campo de batalha.',
  '++Calamidade': 'Além do que a Jujutsu sabe medir. Lendas viram sussurros perto dele.',
  '+++Calamidade': 'Perto do divino; só maldições ancestrais e mestres de era existem nesse nível.',
  '++++Calamidade': 'O ápice absoluto. Mais que feiticeiro: um fenômeno.'
};

// ============================================================
// CARREGAR / SALVAR
// ============================================================
function normalizarFicha(f){
  f.mecanicaKaue = f.mecanicaKaue || { ativo: false };
  f.tecnicaInata = f.tecnicaInata || {};
  if(!f.tecnicaInata.grau) f.tecnicaInata.grau = 'G4';
  f.stacksMalditos = f.stacksMalditos || {};
  FAIXAS_STACK.forEach(k => { if(f.stacksMalditos[k] === undefined) f.stacksMalditos[k] = 0; });
  f.habilidadesEspeciais = f.habilidadesEspeciais || [];
  f.habilidadesEspeciais.forEach(h => { if(!h.grau) h.grau = 'G4'; });
  f.inventario = f.inventario || [];
  f.tecnicasDominio = f.tecnicasDominio || [];
  f.blackFlash = f.blackFlash || { contador: 0, historico: [] };
  f.blackFlash.historico = f.blackFlash.historico || [];
  return f;
}

async function carregar(){
  setSaveStatus('Carregando ficha...');
  try{
    const [{ ficha: f }, { itens }] = await Promise.all([Api.obterFicha(fichaId), Api.listarItens()]);
    ficha = normalizarFicha(f);
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
    ficha = normalizarFicha(atualizada);
    dirty = false;
    setSaveStatus('Ficha salva ✓', 'ok');
    renderStatusDerivado();
    renderAtributos();
    renderStacks();
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
  renderMecanicaKaue();
  renderAtributos();
  renderStatusDerivado();
  renderTecnicaGrau();
  renderStacks();
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
document.getElementById('btnEditBanner').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('bannerInput').click(); });
document.getElementById('bannerBox').addEventListener('click', () => document.getElementById('bannerInput').click());
document.getElementById('tokenBox').addEventListener('click', () => document.getElementById('tokenInput').click());
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

// ---------- MECÂNICA DO KAUÊ ----------
function renderMecanicaKaue(){
  const btn = document.getElementById('btnMecanicaKaue');
  const ativo = !!ficha.mecanicaKaue.ativo;
  btn.textContent = 'Mecânica do Kauê: ' + (ativo ? 'ATIVA' : 'inativa');
  btn.classList.toggle('kaue-on', ativo);
  // só o mestre liga/desliga
  btn.disabled = session.role !== 'master';
  btn.title = session.role === 'master' ? 'Clique para ativar/desativar' : 'Somente o mestre pode ativar';
}
document.getElementById('btnMecanicaKaue').addEventListener('click', () => {
  if(session.role !== 'master') return;
  ficha.mecanicaKaue.ativo = !ficha.mecanicaKaue.ativo;
  dirty = true;
  renderMecanicaKaue();
  renderAtributos();
});

// ---------- ATRIBUTOS ----------
const ATRIBUTOS_DEF = [
  { key:'quantidadeEA', label:'Quantidade de Energia Amaldiçoada', desc:'Define o tamanho do seu reservatório de EA.' },
  { key:'refinoEA', label:'Refino de Energia Amaldiçoada', desc:'Define a qualidade e a potência (Output) da sua EA.' },
  { key:'combate', label:'Combate', desc:'Habilidade de luta corpo a corpo e com armas.' },
  { key:'agilidade', label:'Agilidade', desc:'Reflexos, esquiva e coordenação motora.' },
  { key:'intelecto', label:'Intelecto', desc:'Raciocínio tático, leitura de combate e conhecimento.' },
  { key:'vigor', label:'Vigor', desc:'Resistência física; define Vida e Bloquear.' },
  { key:'presenca', label:'Presença', desc:'Aura, intimidação e força de vontade.' },
  { key:'velocidade', label:'Velocidade', desc:'Rapidez de movimento e de ação no turno.' }
];

function renderAtributos(){
  const grid = document.getElementById('attrGrid');
  grid.innerHTML = '';
  const kaue = !!ficha.mecanicaKaue.ativo;

  ATRIBUTOS_DEF.forEach(def => {
    const atual = ficha.atributos[def.key] || '-G4';
    const item = document.createElement('div');
    item.className = 'attr-item';
    item.innerHTML = `
      <div class="attr-left">
        <span class="attr-name">${def.label}</span>
      </div>
      <div class="attr-controls">
        <select data-attr="${def.key}"></select>
        ${kaue ? `<button type="button" class="btn-plus" data-plus="${def.key}" title="Sobe 1 grau">+</button>` : ''}
        <span class="attr-mod" id="mod_${def.key}"></span>
      </div>
    `;
    const select = item.querySelector('select');
    TABELA_GRAU.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.label; opt.textContent = g.label;
      if(g.label === atual) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      ficha.atributos[def.key] = select.value;
      dirty = true;
      atualizarModificadorEl(document.getElementById('mod_'+def.key), select.value);
      renderStatusDerivado();
    });
    const plus = item.querySelector('[data-plus]');
    if(plus){
      plus.addEventListener('click', () => {
        const pts = grauParaPontos(ficha.atributos[def.key]);
        if(pts >= 30) return;
        ficha.atributos[def.key] = pontosParaGrau(pts + 1);
        dirty = true;
        renderAtributos();
        renderStatusDerivado();
      });
    }
    grid.appendChild(item);
    atualizarModificadorEl(item.querySelector(`#mod_${def.key}`), atual);
  });
}
function atualizarModificadorEl(el, grauLabel){
  el.textContent = `1d20 + ${grauParaModificador(grauLabel)}`;
}

// ---------- status derivado ----------
function renderStatusDerivado(){
  const kk = ficha.blackFlash?.contador || 0;
  const d = calcularStatusDerivado(ficha.atributos, kk);
  ficha.status.vidaMax = d.vidaMax;
  ficha.status.eaMax = d.eaMax;
  ficha.status.bloquear = d.bloquear;
  ficha.status.output = d.output;

  document.getElementById('disp_vidaMax').textContent = fmt(d.vidaMax);
  document.getElementById('disp_eaMax').textContent = fmt(d.eaMax);
  document.getElementById('disp_bloquear').textContent = d.bloquear;
  document.getElementById('disp_output').textContent = fmt(d.output);
  const kEl = document.getElementById('disp_kokusenMult');
  if(kEl) kEl.textContent = kk > 0 ? `Kokusen ×${multKokusen(kk).toFixed(2)} em EA e Output` : '';

  document.getElementById('f_vidaAtual').value = ficha.status.vidaAtual || 0;
  document.getElementById('f_eaAtual').value = ficha.status.eaAtual || 0;

  const pctVida = d.vidaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.vidaAtual/d.vidaMax)*100)) : 0;
  const pctEA = d.eaMax > 0 ? Math.max(0, Math.min(100, (ficha.status.eaAtual/d.eaMax)*100)) : 0;
  document.getElementById('bar_vida').style.width = pctVida + '%';
  document.getElementById('bar_ea').style.width = pctEA + '%';
}

// ---------- GRAU DA TÉCNICA INATA ----------
function montarSelectGrau(sel, valor){
  sel.innerHTML = '';
  TABELA_GRAU.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.label; opt.textContent = g.label;
    if(g.label === valor) opt.selected = true;
    sel.appendChild(opt);
  });
}
function renderTecnicaGrau(){
  const sel = document.getElementById('ti_grau');
  montarSelectGrau(sel, ficha.tecnicaInata.grau || 'G4');
  sel.onchange = () => { ficha.tecnicaInata.grau = sel.value; dirty = true; };
}

// ---------- STACKS DE MALDIÇÕES MORTAS ----------
function renderStacks(){
  const wrap = document.getElementById('stacksGrid');
  wrap.innerHTML = '';
  const alvoSel = document.getElementById('stackAlvo');
  if(!alvoSel.options.length){
    FAIXAS_STACK.forEach(f => {
      const o = document.createElement('option'); o.value = f; o.textContent = f; alvoSel.appendChild(o);
    });
    alvoSel.value = 'G4';
    alvoSel.addEventListener('change', renderStacks);
  }
  FAIXAS_STACK.forEach(f => {
    const mortos = Number(ficha.stacksMalditos[f]) || 0;
    const row = document.createElement('div');
    row.className = 'stack-row';
    row.innerHTML = `
      <span class="stack-grau">${f}</span>
      <span class="stack-mortos">${mortos} mortos</span>
      <span class="stack-valor">${fmt(mortos * 0.25)} stack</span>
      <button type="button" class="btn btn-ghost btn-sm" data-stack-add="${f}">+1 morto</button>
      <button type="button" class="btn-remove" data-stack-sub="${f}" title="Remover 1">−</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-stack-add]').forEach(b => b.addEventListener('click', () => {
    const k = b.getAttribute('data-stack-add');
    ficha.stacksMalditos[k] = (Number(ficha.stacksMalditos[k]) || 0) + 1;
    dirty = true; renderStacks();
  }));
  wrap.querySelectorAll('[data-stack-sub]').forEach(b => b.addEventListener('click', () => {
    const k = b.getAttribute('data-stack-sub');
    ficha.stacksMalditos[k] = Math.max(0, (Number(ficha.stacksMalditos[k]) || 0) - 1);
    dirty = true; renderStacks();
  }));
  const alvo = alvoSel.value;
  document.getElementById('stackTotal').textContent =
    `Total equivalente em ${alvo}: ${fmt(totalStackEm(ficha.stacksMalditos, alvo))} stacks`;
}

// ---------- HABILIDADES ESPECIAIS ----------
function grauOptionsHtml(valor){
  return TABELA_GRAU.map(g => `<option value="${g.label}" ${g.label === valor ? 'selected' : ''}>${g.label}</option>`).join('');
}
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
        <select class="grau-select" data-hab-field="grau" data-idx="${idx}">${grauOptionsHtml(hab.grau || 'G4')}</select>
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
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const idx = Number(el.getAttribute('data-idx'));
      ficha.habilidadesEspeciais[idx][el.getAttribute('data-hab-field')] = el.value;
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-hab-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.habilidadesEspeciais.splice(Number(btn.getAttribute('data-hab-remove')),1);
      dirty = true; renderHabilidades();
    });
  });
}
document.getElementById('btnAddHabilidade').addEventListener('click', () => {
  ficha.habilidadesEspeciais.push({ nome:'', grau:'G4', funcionamento:'', condicoes:'', custo:'', efeitos:'', limitacoes:'' });
  dirty = true; renderHabilidades();
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
      dirty = true; renderDominio();
    });
  });
}
document.getElementById('btnAddDominio').addEventListener('click', () => {
  ficha.tecnicasDominio.push({ nome:'', tipo:'', descricao:'', custo:'', cooldown:'' });
  dirty = true; renderDominio();
});

// ---------- BLACK FLASH (KOKUSEN) ----------
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
      ficha.blackFlash.contador = Math.max(0, (ficha.blackFlash.contador || 0) - 1);
      dirty = true; renderBlackFlash(); renderStatusDerivado();
    });
  });
}
document.getElementById('bf_contador').addEventListener('input', (e) => {
  ficha.blackFlash.contador = Math.max(0, Number(e.target.value || 0));
  dirty = true; renderStatusDerivado();
});
document.getElementById('btnAddBF').addEventListener('click', () => {
  ficha.blackFlash.historico.push({ data:'', descricao:'' });
  ficha.blackFlash.contador = (ficha.blackFlash.contador || 0) + 1;
  dirty = true; renderBlackFlash(); renderStatusDerivado();
});

// ---------- INVENTÁRIO ----------
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
      ficha.inventario[Number(el.getAttribute('data-inv-qty'))].quantidade = Number(el.value || 1);
      dirty = true;
    });
  });
  wrap.querySelectorAll('[data-inv-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      ficha.inventario.splice(Number(btn.getAttribute('data-inv-remove')),1);
      dirty = true; renderInventario();
    });
  });
}
document.getElementById('btnAddInvItem').addEventListener('click', () => {
  const sel = document.getElementById('invSelectItem');
  if(!sel.value) return;
  const existente = ficha.inventario.find(e => e.itemId === sel.value);
  if(existente) existente.quantidade = (existente.quantidade || 1) + 1;
  else ficha.inventario.push({ itemId: sel.value, quantidade: 1 });
  dirty = true; renderInventario();
});

// ---------- TABELA DE GRAU (referência) ----------
function renderTabelaGrau(){
  const table = document.getElementById('tabelaGrauTable');
  let html = '<tr><th>Nível</th><th>Pontos</th><th>Modificador</th><th>EA base</th></tr>';
  TABELA_GRAU.forEach(g => { html += `<tr><td>${g.label}</td><td>${g.pontos}</td><td>1d20 + ${g.pontos}</td><td>${fmt(eaBase(g.pontos))}</td></tr>`; });
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

carregar();
