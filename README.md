# Good Vibes 🌊 — O Refúgio

Uma rede social privada entre amigos, agora com cara de **tela inicial de telefone**: cada menu é um aplicativo. Feita em HTML/CSS/JS puro (sem build), com Firebase (Auth + Firestore), instalável como **PWA** no celular.

## ✨ O que há de novo na v2.0

👤 **Cadastro aberto**
- Aba “Criar conta” na tela de login (nome de exibição + e-mail + senha), com criação automática do perfil no Firestore, boas-vindas e tratamento amigável de erros (e-mail já usado, senha fraca etc.)

🖼️ **Home de telefone de verdade**
- Tela de bloqueio animada (relógio, saudação, lanterna funcional 🔦 e câmera)
- Tela inicial com widget de relógio + frase do dia, grade de apps e dock translúcido
- Cada menu abre como um app em tela cheia (animação de zoom estilo iOS), com botão voltar e suporte à tecla `Esc` / botão voltar do Android

📷 **Galeria → Post em um toque**
- Botão **Galeria** no compositor (e nos Ajustes/Perfil e no Chat): escolha a foto na galeria, ela é enviada para a nuvem e o **link é colado direto no input do post**, com prévia automática

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
icons/            # Ícones do app (192/512/maskable/apple-touch/favicon)
tests/smoke.mjs   # Teste de fumaça offline (jsdom, Firebase stubado)
```

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
