# RPG JJK — v2 (Node + Vercel + Firestore + Cloudinary)

Stack: frontend estático + backend Node (Vercel Serverless Functions) +
Firestore (banco de fichas/itens) + Cloudinary (imagens: banner, token, itens).

Sem Firebase Storage — ele exige plano pago (Blaze). Cloudinary resolve
imagens de graça (25GB), sem pedir cartão.

## 1. Firebase (só Firestore, sem Storage)

1. https://console.firebase.google.com → criar projeto.
2. Menu lateral → **Firestore Database** → Criar banco → modo produção → região `southamerica-east1` (ou a mais próxima).
3. **Firestore → Regras**, cole:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
   (ninguém acessa direto pelo navegador — tudo passa pelo backend com Admin SDK)
4. **⚙️ Configurações do projeto → Contas de serviço → Firebase Admin SDK → Gerar nova chave privada**. Baixa um `.json` — guarde, é a credencial do backend.

## 2. Cloudinary (imagens)

1. Entre em https://cloudinary.com/console (você já tem conta).
2. No Dashboard, copie: **Cloud name**, **API Key**, **API Secret**.

## 3. Vercel (hospedagem)

1. Suba a pasta inteira (`rpgjjk-v2`) pra um repositório novo no GitHub.
2. https://vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `FIREBASE_PROJECT_ID` | campo `project_id` do json do Firebase |
| `FIREBASE_CLIENT_EMAIL` | campo `client_email` do json |
| `FIREBASE_PRIVATE_KEY` | campo `private_key` do json (cole inteiro, com `\n`) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret do Cloudinary |
| `SESSION_SECRET` | qualquer string aleatória longa (senha interna de assinatura) |

4. **Deploy**.

## 4. Usuários (login fixo)

Já vêm prontos em `lib/auth.js`:

| Usuário | Senha | Papel |
|---|---|---|
| `rpgjjk_kaue` | `jjk_dos_cri4a$_001` | jogador |
| `rpgjjk_kaua` | `jjk_dos_cri4a$_002` | jogador |
| `rpgjjk_igor` | `jjk_dos_cri4a$_003` | jogador |
| `rpgjjk_dudu` | `jjk_dos_cri4a$_004` | jogador |
| `rpgjjk_mestre` | `jjk_dos_cri4a$_005` | mestre |

Pra trocar, edite direto o objeto `USERS` em `lib/auth.js` antes de subir
(ou depois, redeployando).

⚠️ É uma trava simples de acesso, não segurança de verdade — só pra
organizar a mesa. As senhas ficam no backend, não expostas no código do
navegador (isso já é uma melhoria em relação à v1 estática).

## Como o sistema funciona

- **Login** (`/login.html`): valida usuário/senha no backend, recebe um
  token assinado guardado no `localStorage`.
- **Hub** (`/hub.html`): mostra as fichas do jogador (ou todas, se mestre).
  Cada ficha aparece como um card com o banner de fundo e o token
  sobreposto. Dá pra criar quantas fichas quiser.
- **Ficha** (`/ficha.html?id=...`): edição completa, com cálculo automático
  de status. Banner (imagem grande, tipo capa) e token (foto redonda,
  avatar) ficam no topo — clique pra trocar, ambos armazenados via
  Cloudinary. Só o dono da ficha (ou o mestre) pode editar/trocar imagens.
- **Catálogo de Itens** (`/itens.html`): itens globais, visíveis a toda a
  mesa. Qualquer jogador cria (com imagem, nome, tipo, dano, descrição); só
  quem criou (ou o mestre) pode excluir. Da ficha, cada jogador escolhe
  itens do catálogo pra colocar no próprio inventário, com quantidade.
- **Mestre**: enxerga todas as fichas de todos no hub, pode editar
  qualquer uma, e é o único que vê a seção "Informações Desconhecidas" em
  cada ficha.

## Cálculos automatizados

- **Teste de atributo:** 1d20 + pontos do grau (ex: +G3 = 1d20+6).
- **Vida máxima:** pontos de grau do Vigor × 10.
- **Energia Amaldiçoada máxima:** 25 + (pontos de grau de Quantidade de EA × 50).
- **Bloquear:** 5 (base) + pontos de grau do Vigor.
- **Output:** 5 + (pontos de grau do Refino de EA × 20).

O cálculo "oficial" sempre roda de novo no backend ao salvar — o que
aparece na tela em tempo real é só pra feedback visual, não dá pra
manipular o resultado final adulterando o navegador.

## Mecânicas com espaço reservado (ainda a definir pela mesa)

- **Habilidades Especiais / Técnicas** — lista dinâmica.
- **Domínio, Reversão & Técnicas Avançadas** — Expansão de Domínio, Reversão
  de Maldição, Amplificação Simples etc.
- **Black Flash** — contador + histórico de ocorrências.
- **Emoção atual / buff-debuff** — campo livre, aguardando regra numérica.

Quando a mesa fechar a regra de cálculo de alguma dessas, é só pedir que eu
ligo a mecânica no `lib/regras.js` / `public/regras.js`.
