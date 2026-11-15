# Good Vibes 🌊 — O Refúgio

Uma rede social privada entre amigos, agora com cara de **tela inicial de telefone**: cada menu é um aplicativo. Feita em HTML/CSS/JS puro (sem build), com Firebase (Auth + Firestore), instalável como **PWA** no celular.

## 🏦 Banco do Refúgio & Quadro de Freelas (v4.0)

O ouro agora tem **dono registrado** e o trabalho é **definido pela própria galera**:

- **🏦 Banco do Refúgio (app próprio)** — conta do refúgio com saldo e **extrato completo** de todo gold que entra ou sai (renda, trabalhos, compras, presentes, penhoras…). Empréstimo com taxas transparentes: **6%** na liberação · **mora de 3%/dia** · **+25%** de surcharge após 30 dias · **penhora de 50%** de tudo que você ganhar até quitar · **Caderneta dos Devedores** (pública no app) após 30 dias de atraso. Score de crédito (0–100) sobe pagando em dia (+12) e cai pagando atrasado (−10) — e o **limite de crédito** (até 3.000 gold) depende do score
- **📜 Quadro de Freelas (Trabalho → Quadro)** — **os usuários definem o trabalho**: publique qualquer tarefa com recompensa (mín. 10, máx. 10.000 gold). O gold sai do seu bolso na publicação (**escrow**) e só vai para quem aceitar e concluir — você paga quando aprovar, ou o trabalhador libera sozinho após **7 dias sem resposta**. Cancelar devolve tudo pro autor. "Trabalhinhos da ilha" continuam disponíveis como renda casual
- **💳 Débito** — transferências de gold instantâneas pelo banco (via sistema; a pessoa recebe ao abrir o app)
- **📒 Posse registrada** — cada movimento de gold vira entrada no seu **extrato** (`users/{uid}/ledger`); ninguém altera depois

> ⚠️ **Ainda exige publicar as regras do Firestore** (`firestore.rules`): os blocos `loans` (empréstimos), `jobs` (freelas), `users/{uid}/ledger` (extrato) e a atualização de `gifts` para aceitar `type`/`jobId`. Sem publicar, o Quadro e o Empréstimo falham em silêncio. **É a terceira vez que peço esse republish — faça de uma vez, são 2 minutos** 🙏
>
> ⚠️ Sem servidor, nada impede trapaça via Console (gerar gold do nada) — o extrato prova o histórico, mas a fonte continua client-side. Para inviolabilidade total: Cloud Functions (Blaze). O banco pune, mas não faz milagre.

## 🪙 Economia do Refúgio (v3.0 — a maior atualização até agora)

A rede social agora tem uma **economia própria**, com a moeda **gold**:

- **🪙 Loja** — 1.000 cosméticos (10 categorias × 20 temas × 5 raridades: molduras, emblemas, títulos, auras, fundos, capas, selos…), comprados com gold e equipáveis; equipado, seu cosmético aparece **ao lado do seu nome no feed e nos comentários**. Venda o que não quer por 60% do preço
- **🧺 Comprar e Vender materiais** — 100 matérias-primas brutas (madeira, pedra, minério de ferro a platina, cristais, flores, pérolas…) com preço de vitrine +26 refinados
- **💼 Trabalho** — 8 freelas (de Carregador de Feira à Lenda do Surf) com cooldown próprio e bônus de material, e **🌿 Coleta** em 6 pontos (Floresta, Mina Velha, Rio & Praia, Campo Florido, Montanha, Pântano), 25s de recarga, 2 drops por visita
- **⚒️ Refinaria** — 36 receitas transformando matéria-prima em refinados (barras, tijolos, gemas lapidadas, pergaminho…)
- **🏗️ Construção** — 12 estruturas (Barraca → 👑 Trono do Refúgio) com custo em gold/materiais e **renda passiva em gold/min** (até 12h acumuladas, botão Coletar)
- **🎒 Inventário** — saldo de gold, baú visual com todos os materiais, baú de cosméticos + equipar — e o botão **🎁 Enviar presente**: mande gold ou materiais para qualquer amigo direto de lá (o presente é resgatado quando a pessoa abre o app, via coleção `gifts`)
- **🏦 Economia de verdade** — o gold é salvo no Firestore (`users/{uid}`), funciona offline nos lançamentos e re-sincroniza ao abrir
- Starter: 250 gold de presente de boas-vindas

> ⚠️ **Honesto como sempre:** a economia é **autoritativa no cliente** (não há servidor): tecnicamente dá para se dar gold pelo Console do navegador. Ela vale como diversão e conquista social, não como dinheiro. Se quiser economia à prova de trapaça, só com backend/Cloud Functions + Blaze — posso montar depois.
>
> ⚠️ **Para os presentes funcionarem**, publique as novas regras do `firestore.rules` (bloco `gifts`): Firebase Console → Firestore → Regras → cole → Publicar. Sem isso, envio/resgate de presente falha em silêncio (o resto da economia funciona normalmente — ela usa sua própria `users/{uid}`).

## ✨ O que há de novo na v2.0

- **Atualização de app funcionando de verdade** 🔧 — o Service Worker pré-cacheia a versão nova ignorando o cache HTTP do GitHub Pages e tudo mesma origem agora é *network-first*: ao tocar em **Atualizar 🔄**, a página recarrega com o código novo de verdade (antes servia o velho). Se nenhum worker novo estiver esperando, o botão apaga o cache do app shell e recarrega da rede
- 🌊 **Energia da casa** — a cada 3 minutos com o app aberto, a casa curte (80%) ou descurtida (20%) um post recente de outra pessoa. Transparente (está nas regras), ignora posts próprios, 🔞 e mais velhos de 7 dias, e não precisa de servidor nem de contas robô

🎬 **Citações no feed**

💬 **Notificação de PV**
- Mensagens privadas (chat direto) agora disparam aviso em tempo real para o destinatário — toast, badge no app Chat, chime e notificação do sistema (se ativada). Tocar no aviso **abre a conversa direto**. Funciona via coleção-índice `dms` (ver `firestore.rules`)

🔄 **Aviso de nova versão**
- O app verifica a cada 1 minuto (e sempre que volta para o primeiro plano) se há deploy novo — via Service Worker e via `version.json` — e mostra uma barrinha “Nova versão disponível!” com o botão **Atualizar 🔄** (e um “✕” para lembrar depois)

👤 **Cadastro aberto**
- Aba “Criar conta” na tela de login (nome de exibição + e-mail + senha), com criação automática do perfil no Firestore, boas-vindas e tratamento amigável de erros (e-mail já usado, senha fraca etc.)

🖼️ **Home de telefone de verdade**
- Tela de bloqueio animada (relógio, saudação, lanterna funcional 🔦 e câmera)
- Tela inicial com widget de relógio + frase do dia, grade de apps e dock translúcido
- Cada menu abre como um app em tela cheia (animação de zoom estilo iOS), com botão voltar e suporte à tecla `Esc` / botão voltar do Android

📷 **Galeria → Post em um toque**
- Botão **Galeria** no compositor (e nos Ajustes/Perfil e no Chat): escolha a foto na galeria, ela é enviada para a nuvem e o **link é colado direto no input do post**, com prévia automática
- Botão **🎥 Vídeo** no compositor: escolha o vídeo na galeria, ele é enviado pela mesma nuvem (Cloudinary) e o **link cola direto no input do post**, com prévia em vídeo — o feed renderiza como player

🔔 **Notificações reescritas**
- Bolinhas com **contador** nos ícones (Feed, Chat e Avisos)
- Central de Avisos com agrupamento (Hoje/Ontem/Anteriores), filtro *Todas/Não lidas*, "Ler todas" e "Limpar"
- Toasts in-app animados, chime suave (WebAudio) e notificação do sistema (opcional, ativada nas Ajustes)
- Comentários no seu post geram aviso para você (via coleção `inbox` do Firestore)

🐛 **Bugs corrigidos**
- XSS em posts, comentários, chat e busca (todo conteúdo passa por escape + URLs validadas)
- Upload da galeria travava com `closeModal('media-modal')` inexistente → fluxo reescrito
- `likePost`/`votarEnquete`/`sharePost` eram redefinidas a cada render do feed → agora no topo do módulo
- Notificação de "novo post" disparava para TODOS os posts antigos ao abrir o app → só conta após a carga inicial
- Enquetes agora funcionam de verdade: o mapa de votos é criado na publicação
- `comments-list` duplicado, tema/cor sem persistência local (flash no carregamento), autoscroll teimoso no chat, `alert()`/`confirm()` nativos → modais/toasts próprios

📲 **PWA (aplicativo para celular)**
- `manifest.json` + Service Worker (offline básico, cache do app shell)
- Ícones 192/512 (+ maskable e Apple touch icon) gerados a partir da arte oficial
- "Instalar app" aparece nos Ajustes quando o aparelho suporta
- No celular (≤560px) vira tela cheia, sem moldura, com safe-area do iPhone

## 🚀 Rodar localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

No desktop você verá o app **dentro de um telefone**; em telas de até 560px, ele ocupa a tela inteira.

## 📱 Instalar no celular (PWA)

- **Android/Chrome:** menu ⋮ → *Instalar app* (ou o card "Instalar o Good Vibes" nos Ajustes)
- **iPhone/Safari:** Compartilhar → *Adicionar à Tela de Início*

## 🗂️ Estrutura

```
index.html        # Marcação (tela de bloqueio, login, home, 8 apps, modais)
css/style.css     # Design system: moldura do telefone, temas claro/escuro, animações
js/app.js         # Lógica (ES module): Firebase, feed, chat, notificações, PWA
manifest.json     # Manifest PWA
sw.js             # Service Worker (app shell offline + cache de CDN)
version.json      # Versão publicada — o app compara com a APP_VERSION local para avisar de deploys
firestore.rules   # Regras de segurança do Firestore (publicar no Console)
icons/            # Ícones do app (192/512/maskable/apple-touch/favicon)
tests/smoke.mjs   # Teste de fumaça offline (jsdom, Firebase stubado)
```

## 🔄 Como funciona o aviso de nova versão (e como lançar uma)

O app avisa os usuários quando existe versão nova por **dois canais**:

1. **Service Worker**: o worker novo fica `waiting` (não assume o controle sozinho); o app detecta via `updatefound`/`waiting` e exibe a barrinha. Ao tocar em **Atualizar**, ele envia `SKIP_WAITING` e recarrega na versão nova.
2. **`version.json`**: o app busca o arquivo a cada 5 minutos (e ao voltar para o primeiro plano) com `cache: 'no-store'`. Se a `version` remota for diferente da `APP_VERSION` do `js/app.js`, a barrinha aparece — mesmo sem Service Worker.

### Para publicar uma atualização

1. `js/app.js` → mude `const APP_VERSION = 'x.y.z'`
2. `version.json` → `{ "version": "x.y.z", "notes": "o que mudou" }`
3. `sw.js` → mude `CACHE_VERSION` para `'good-vibes-vX.Y.Z'`
4. Commit + push no branch de deploy → pronto. Na próxima vez que os usuários abrirem o app (no máx. 1–5 min após o deploy, ou ao voltar para o app), todos verão **“Nova versão disponível!” → Atualizar 🔄**

O botão **✕** adia o aviso só naquela sessão (`sessionStorage`) — na próxima visita ele aparece de novo.

## 🔐 Firestore: corrigindo "Missing or insufficient permissions"

Se **você** vê tudo funcionando mas os **amigos** recebem `FirebaseError: Missing or insufficient permissions` (perfil, feed, chat, inbox), o problema está nas **Regras de Segurança do Firestore** — elas são avaliadas no servidor, no Console do Firebase, e nenhum código do site pode burlá-las.

Causa provável: as regras do seu projeto só liberam acesso à sua conta (ex.: `request.auth.uid == 'seu-uid'` ou e-mail fixo) **ou** o modo de teste do Firestore expirou (as regras com `request.time < timestamp.date(...)` vencem em 30 dias).

### Como resolver (2 minutos)

1. Acesse o [Console do Firebase](https://console.firebase.google.com) → seu projeto **good-vibes-8a13d**
2. **Firestore Database → Regras**
3. Cole o conteúdo do arquivo [`firestore.rules`](firestore.rules) deste repositório (versão refinada: cada usuário só escreve no próprio perfil, posts só alteram contadores, DM só entre os dois uids da sala, inbox só para o destinatário)
4. Clique em **Publicar**

Se preferir a versão simples (recomendada só para testes rápidos entre amigos):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Depois de publicar, peça para os amigos **recarregarem a página** (Ctrl+Shift+R). Nos logs vai aparecer `✅` no lugar dos erros. O app já mostra mensagens amigáveis em pt-BR quando as regras barram o acesso.

## 🧪 Teste de fumaça

```bash
npm install --no-save jsdom@24
node tests/smoke.mjs
```

Verifica boot do app, grade de apps, fluxo de desbloqueio → login simulado → abertura/fechamento de apps, lista de notificações e contador de caracteres do compositor.

## 🔒 Notas de segurança

- O chat usa AES **do lado do cliente** apenas como ofuscação; não é criptografia ponta-a-ponta real.
- As chaves da API (Firebase, Giphy, ImgBB, Cloudinary preset) são públicas por natureza em apps client-side; proteja-as por regras do Firestore e restrições de domínio/app.
- Recomenda-se configurar as regras do Firestore para leitura/escrita apenas de usuários autenticados.

## 🌐 Deploy (GitHub Pages)

Configuração → Pages → Branch `main` (ou o branch desejado) → `/ (root)`. O app já está pronto para ser servido estaticamente; o Service Worker só ativa em HTTPS (ou localhost).
