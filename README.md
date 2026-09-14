# RPG JJK — Ficha de Personagem

Site estático com 2 páginas (`index.html` login + `ficha.html` ficha), feito para
rodar no **GitHub Pages** com salvamento real via **JSONBin.io** (grátis).

## Passo a passo para deixar funcionando

### 1. Criar conta no JSONBin
1. Vá em https://jsonbin.io e crie uma conta grátis.
2. Em https://jsonbin.io/api-keys, copie sua **X-Master-Key**.
3. Abra o arquivo `config.js` e cole a key em `JSONBIN_KEY`.

### 2. Criar um "bin" para cada jogador
Para cada jogador (Kauê, Kauã, Igor, Dudu):
1. No painel do JSONBin, crie um novo bin com o conteúdo `{}`.
2. Copie o **Bin ID** gerado.
3. Cole esse ID no `config.js`, no campo `binId` da pessoa correspondente.

> O Mestre (conta que era do Davi) não precisa de bin próprio — ele acessa as
> fichas dos 4 jogadores através de um seletor no topo da tela.

### 3. Senhas de cada jogador
Já estão pré-definidas em `config.js` seguindo o padrão pedido:
`jjk_dos_cri4a$_XXX` (troque os 3 números se quiser personalizar).
Usuários: `rpgjjk_kaue`, `rpgjjk_kaua`, `rpgjjk_igor`, `rpgjjk_dudu`, `rpgjjk_mestre`.

⚠️ Isso é uma trava simples de acesso, não segurança de verdade — qualquer
pessoa que abrir o `config.js` no código-fonte vê as senhas e a API key. Não é
recomendado usar para nada sensível, só para organizar a mesa.

### 4. Subir pro GitHub Pages
1. Crie um repositório novo no GitHub.
2. Suba os arquivos: `index.html`, `ficha.html`, `ficha.css`, `ficha.js`, `config.js`.
3. Em **Settings → Pages**, ative o Pages apontando pra branch `main` (pasta raiz).
4. O site fica em `https://SEU_USUARIO.github.io/SEU_REPO/`.

## Como funciona

- **Login** (`index.html`): usuário/senha fixos, validados no navegador via `config.js`.
- **Ficha** (`ficha.html`): carrega o JSON do jogador direto do JSONBin, edita em
  tela com cálculo automático de status, e salva de volta no JSONBin ao clicar
  em **Salvar ficha**.
- **Mestre**: vê um seletor no topo com as 4 fichas dos jogadores, incluindo a
  seção **Informações Desconhecidas**, que fica oculta para os jogadores.

## Cálculos automatizados

- **Teste de atributo:** 1d20 + pontos do grau (ex: +G3 = 1d20+6) — mostrado ao lado de cada atributo.
- **Vida máxima:** pontos de grau do Vigor × 10.
- **Energia Amaldiçoada máxima:** 25 + (pontos de grau de Quantidade de EA × 50).
- **Bloquear:** 5 (base) + pontos de grau do Vigor.
- **Output:** 5 + (pontos de grau do Refino de EA × 20).

Tudo isso recalcula sozinho quando você muda o grau de um atributo.

## Mecânicas com espaço reservado (ainda a definir pela mesa)

- **Habilidades Especiais / Técnicas** — lista dinâmica, adicione quantas quiser.
- **Domínio, Reversão & Técnicas Avançadas** — Expansão de Domínio, Reversão de
  Maldição, Amplificação Simples etc. — campo livre de tipo + descrição.
- **Black Flash** — contador + histórico de ocorrências.
- **Inventário** — lista dinâmica (adicionar/remover itens).
- **Emoção atual / buff-debuff** — campo de texto livre, aguardando regra fechada da mesa.

Esses blocos foram deixados **estruturados mas sem regra de cálculo fixa** de
propósito, já que a mesa ainda não fechou como cada mecânica funciona
numericamente. Quando definirem, é só me chamar para eu adicionar o cálculo.
