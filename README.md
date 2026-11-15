# Good Vibes 🌊 — O Refúgio

Uma rede social privada entre amigos, agora com cara de **tela inicial de telefone**: cada menu é um aplicativo. Feita em HTML/CSS/JS puro (sem build), com Firebase (Auth + Firestore), instalável como **PWA** no celular.

## ⚔️ Arena — crie suas cartas e batalhe ao vivo (v4.6.0)

O 16º aplicativo (ícone ⚔️ no grid): uma arena de cartas **criadas por quem joga**, com deck de 30 pontos, árvore de poder e **batalha PvP ao vivo** (turnos em tempo real, direto no Firestore).

### 🃏 Criando cartas (Forja)

- Nome, **arte por imagem** (envie do celular/PC ou cole a URL — sem imagem, a carta usa o **emblema SVG da categoria**), categoria, custo em pontos e poder do efeito
- **Custo e poder escolhidos com "pips"** (1 a 5), com **dica de efeito ao vivo** ("Causa 14 de dano físico…"), contador de flavor (120) e **preview ao vivo** da carta
- **10 categorias de efeito**: Dano · Dano de Fogo · de Água · de Ar · de Terra · Cura · Defesa (escudo físico) · Defesa Mágica · Invocação (criatura que ataca nos próximos 3 turnos) · Estrutura (dano imediato + dano por turno, permanente)
- Teto de **30 cartas** por jogador; cada carta é única (nome não repete) e pode ser apagada quando quiser (some do deck junto)

### 🎴 Deck: 30 pontos, singleton, sem repetir

- Cada carta custa de 1 a 5 pontos — seu deck fecha no **máximo 30 pontos** e **não repete carta nenhuma**
- Mínimo de 5 cartas pra entrar em batalha
- Deck salvo por jogador no Firestore (sincroniza entre aparelhos)

### 🌳 A Árvore do Refúgio (mescla)

- Você tem **30 pontos pra espalhar** entre os 10 ramos — cada ponto num ramo turbinha as cartas dele em **+6%** pra sempre
- **Cada carta daquele ramo no seu deck soma +2% de afinidade** — jogar focado num elemento é jogar forte nele
- Os bônus entram em tudo que a carta faz: dano, cura, escudo, invocação e estrutura

### ⚔️ Batalha PvP ao vivo

- **PvP em tempo real por turnos**: crie um desafio, espere alguém aceitar (ou aceite o de alguém) e jogue — a mesa atualiza na hora no celular do rival (drag & drop da carta até a mesa, ou toque na carta e depois na mesa)
- Início de 60 de vida, escudos físico e mágico separados, criaturas com duração, estruturas permanentes, mão de 5 (compra automática por turno)
- **Desistir** vale derrota; o vencedor leva o pote

### 💰 Apostas: gold E cosméticos (custódia)

- No desafio você aposta **gold e/ou cosméticos** do seu baú (equipados ficam de fora)
- **Tudo entra em custódia na partida na hora**: quem perde já confirmou o prejuízo; quem vence resgata **o pote inteiro** (gold + cosméticos dos dois lados) numa liquidação só — automática ao abrir o app (botão "Receber pote 🏆" na tela de vitória também funciona)
- Taxa zero: o pote é seu
- Cosméticos equipados não podem ser apostados (evita perder o visual sem querer); desfazer o desafio antes de aceitar devolve 100%

### 🃏 Loja: molduras de carta

- A Loja ganhou a aba **🃏 Cartas**: **20 molduras exclusivas** (uma por tema — Solar, Água Viva, Chapada, Maré…) que mudam **todas as suas cartas na Arena** de uma vez
- Molduras por raridade: Comum 500 · Raro 1.200 · Épico 3.000 · Lendário 7.500 gold

### ⚠️ Limites honestos do PvP (sem servidor)

- **Não existe informação escondida de verdade**: o documento da partida é legível pelos dois jogadores — dá pra ver a mão do rival pelo Console se você quiser se dar esse trabalho
- Um rival com o cliente alterado pode forçar resultado — a arena vale como **aposta entre amigos**, não como cassino
- A liquidação do pote é feita pelo vencedor no cliente (custódia garante: quem perde já viu o cosmético sair do baú dele ao aceitar)
- **As regras do Firestore precisam ser republicadas** (`cards` + `arena_matches` novas na v4.5.0) — sem publicar, criar cartas e batalhas não funciona e o app avisa na tela
- Se o rival sumir no meio da partida, a partida fica "aberta" pra sempre (sem WO automático por enquanto) — Combine com o rival ou use Desistir

## 🧿 Artefatos + Coleta reformulada (v4.4.0)

### 🧿 Artefatos do Refúgio — renda passiva pequena, para sempre

Descobrir receitas agora **paga**: existem **7 artefatos craftáveis** na Mesa de Trabalho que, uma vez ativados, rendem **gold/min para sempre** — sem custo de manutenção, sem botões, só descoberta:

| Artefato | Formato (dica) | Renda |
|---|---|---|
| 🧿 Amuleto de Cobre | dois cobres lado a lado | +2 gold/min |
| 💍 Anel de Prata | prata sobre pérola polida | +3 gold/min |
| 🕯️ Candelabro de Aço | liga de aço sobre vidro | +4 gold/min |
| 📿 Rosário de Bronze | lã, bronze e lã na coluna | +5 gold/min |
| 🏺 Ídolo de Mármore | dois mármores e um pingo de tinta | +8 gold/min |
| 👑 Coroa do Refúgio | ouro, gema e ouro em coroa | +12 gold/min |
| 🔮 Orbe Encantado | lingote enfeitiçado, cristal e essência | +18 gold/min |

- Os artefatos **não vão pro baú** — ficam "instalados" na sua renda (ícone 🧿 na Construção, com a lista completa; os não descobertos aparecem como **???** com uma dica do formato)
- Empilháveis: craftou 2 Amuletos, +4/min. A renda entra no mesmo contador de sempre (**gold/min** na Construção, acumulando até o teto de 24h)
- É de propósito que a renda é **pouquinho** — artefato é conquista de quem descobre, não atalho de ouro (a Coroa não paga seu trono sozinha)

### ⛏️ Coleta reformulada — agora é só força de braço

O minigame de timing (parar o marcador na zona verde) foi aposentado por ser **difícil de entender**. No lugar: **Toque Rápido** — 5 segundos, um botão enorme, zero explicação:

- ⚡ A visita continua custando **20 de energia**; toque o botão ⛏️ o máximo que puder em **5 segundos**
- **55+ toques** (ajustado pelo peso do local) = **3 materiais** · **35+** = **2** · **18+** = **1** · menos que isso = **nada**
- Locais difíceis (Mina, Montanha) exigem mais toques pelo mesmo resultado — cada local tem um **peso de força** (Floresta/Campo 🟢 · Rio&Praia 🟡 · Pântano 🟡 · Mina/Montanha 🔴)

## 🛠️ Trabalho de verdade: Mesa de Trabalho, Coleta com energia e Perfil TikTok (v4.3.0)

### 🛒 Loja limpa — cosméticos de um lado, itens do outro

- **Sumiu a "compra de materiais"** da Loja (nada de sistema vendendo matéria-prima): a aba **Comprar** foi removida e o sistema não vende nem compra nada
- A Loja agora tem **duas abas**: ✨ **Cosméticos** e 🎒 **Itens** — e a aba Itens é uma **vitrine do próprio Refúgio**: os anúncios abertos no Mercado (itens de outros jogadores), com botão pra abrir o Mercado e anunciar os seus

### 🛠️ Mesa de Trabalho (ex-Refinaria) — craft estilo Minecraft

- A Refinaria virou **Mesa de Trabalho** 🛠️: uma **grade 3x3 de verdade**, igual Minecraft
- **Arraste** os materiais do seu baú para as células (funciona no toque/celular via pointer events) **ou toque no material e depois na célula**
- Cada uma das **36 receitas tem um formato próprio** (prancha deitada, barra de ferro na coluna, essências em 2x2…). O item do canto mostra o resultado **ao vivo** quando o formato fecha — senão fica "?"
- O botão **Craftar ⚒️** só acende quando a receita é reconhecida; os itens só saem do seu baú ao craftar, e a grade pode ser limpa a qualquer momento sem perder nada
- As receitas aceitam a grade em **qualquer posição** (o formato pode estar em cima, no meio, embaixo — o jogo reconhece), mas não girado de lado: decore os formatos!

### ⛏️ Coleta virou TRABALHO — energia + minigame

- Chega de coletar de graça a cada 25 segundos: agora cada visita custa **⚡ 20 de energia** (100 no máximo, recarrega +1 a cada 20s — cerca de 33min para encher)
- ~~Zona verde/timing~~ — esse minigame era difícil de entender; na **v4.4.0** ele virou **toque rápido**: 5 segundos de botão pra martelar 💪
- **Descanso real** por local: Floresta/Campo 2min · Rio&Praia/Pântano 2,5min · Mina 3min · Montanha 3,5min
- Sem energia? O botão mostra "⚡ sem energia" e a coleta recarrega com o tempo — trabalho mesmo 💪

### 👤 Perfil de qualquer jogador — direto do feed/chat (estilo TikTok)

- **Toque no nome ou avatar de qualquer post, comentário, mensagem ou contato** e abre o **perfil da pessoa**: capa (a capa cosmética que a pessoa mais recente usava, quando houver), avatar grande, nome com os cosméticos equipados, títulos e emblemas
- Abaixo, **todos os posts daquele usuário em ordem (mais recentes primeiro)** — os posts funcionam de verdade (curtir, comentar, NSFW, enquetes) sem sair do perfil
- "Carregar mais posts ⬇️" pagina a lista; **"Enviar mensagem 💬"** abre a conversa privada (criptografada) com a pessoa na hora
- Os contadores de posts vêm direto do Firestore (query `userId == uid`, ordenada no cliente — sem precisar de índice composto)

> Honestidade técnica, de novo: tudo isso continua **client-authoritative** — o craft, a energia e o minigame rodam no seu celular (o Firestore guarda o seu baú/energia, mas nada impede um console esperto de forjar o doc). E o **perfil público mostra o que os posts mostram**: capa e avatar vêm do último post público da pessoa (e do doc `users/{uid}`, que qualquer logado consegue ler por design — inclusive nome e avatar; a chave PIX também fica nesse doc, visível pra quem souber olhar o Console. Se quiser, num próximo passo eu blindo esses campos de outros usuários com regras).

## ✨ Cosméticos de verdade (v4.1.0 — o visual agora muda mesmo)

Os 1.000 cosméticos deixaram de ser "um nome ao lado do nick" e viraram **efeitos visuais reais**:

- **🖼️ Moldura** — anel gradiente animado do tema em volta do seu avatar no feed, comentários e chat
- **✨ Aura** — brilho pulsante em anéis atrás do seu avatar
- **🎨 Nome** — seu nome com o gradiente do tema no feed, comentários e chat
- **🎖️ Título** — pílula com o nome do tema ("Solar do Refúgio"…) ao lado do nick
- **🏅 Emblema** — medalha animada com brilho varrendo ao lado do nick (combinável com o título)
- **🌅 Fundo** — tinge os seus posts (degradê + borda) e o seu perfil
- **📸 Efeito de Post** — animação de borda no post: 🔥 chama · ⚡ flash · 💜 neon · ✨ faísca · 🌌 aurora · 🌈 rainbow (hue-rotate) · ☄️ cometa · 🌞 glow · 🌊 shimmer — cada tema tem o seu
- **🌄 Capa** — capa temática animada no topo do seu perfil (com o fundo do tema como reserva)
- **🏷️ Selo** — fita rotacionada no canto dos seus posts
- **🎉 Reação** — botão de reação **exclusivo seu** com o seu emoji no feed, com contador próprio (visível para todos)

**Loadout por categoria** — agora são **10 slots** (um por categoria): dá para equipar moldura + aura + nome + título ao mesmo tempo. O baú lista todos os slots equipados com swatch do tema (toque para remover). A migração do cosmético único antigo é automática.

**Vale a pena comprar** — cada card da loja e do baú mostra **exatamente o efeito que você leva** ("O que este cosmético faz"), e os 20 temas têm cores próprias (c1/c2) aplicadas em gradientes, glows e bordas.

> Honestidade técnica, como sempre: os efeitos são renderizados **no cliente** a partir do dado do post/mensagem (`authorCosmetics`, com fallback para posts antigos). Dá para forjar visualmente pelo Console — o cosmético nunca muda seu gold, só o visual. Contadores de reação usam merge no Firestore (`reactions.<emoji>`) e as regras de post agora aceitam `reactions` no update — **republicar `firestore.rules` de novo** (Console → Firestore → Regras → Publicar) para curtidas/reações funcionarem para todo mundo.

## 🛒 Mercado entre jogadores + Banco mais punitivo (v4.2.0)

### 🛒 Mercado do Refúgio (app próprio — 15º app na grade)

**O sistema não compra mais os seus itens.** Agora quem compra é a galera: anuncie qualquer material (bruto ou refinado) no **Mercado**, cobre o preço por unidade que quiser, e o item fica **travado no anúncio (escrow)** até alguém comprar ou você retirar. Na venda:

- Quem compra paga na hora — os itens vão pro baú dele
- O gold vai pro vendedor num documento `gifts` (tipo `market`), resgatado quando ele abre o app — **sem o sistema no meio e sem taxas**
- "Retirar" devolve os itens pro seu baú
- Anúncio não pode ser comprado por você mesmo; só quem anunciou pode retirar (regras do Firestore)
- Na Loja, a aba "Vender" (sistema comprava por 60%) virou um botão pro Mercado

### 🏦 Banco do Refúgio — punição piorada (v4.2)

| Coisa | Era | Agora |
|---|---|---|
| Mora | 3%/dia | **8%/dia** |
| Surcharge após 30 dias | +25% | **+50%** |
| Penhora sobre ganhos | 50% | **70%** (**100%** com 60+ dias de atraso) |
| Nome na Caderneta dos Devedores | após 30 dias | **após 14 dias** |
| Score ao pagar atrasado | −10 | **−18** (**−30** com 60+ dias) |

Pagar em dia continua +12. Mora continua crescendo ao infinito (cap de 90 dias no cálculo). O banco não tem dó.

> ⚠️ **Publicar o `firestore.rules` de novo** (Console → Firestore → Regras → cole → Publicar): além dos blocos da v4.0, agora tem a coleção **`market`** (anúncios + escrow + compra entre jogadores) e a chave **`marketId`** nos presentes.
>
> ⚠️ Como tudo no refúgio, o Mercado é client-authoritative: as regras impedem auto-compra e retirada alheia, mas nada impede um programador de forjar o doc do próprio baú pelo Console. O escrow é "de boa fé" como o resto da economia.

## 🏦 Banco do Refúgio & Quadro de Freelas (v4.0)

O ouro agora tem **dono registrado** e o trabalho é **definido pela própria galera**:

- **🏦 Banco do Refúgio (app próprio)** — conta do refúgio com saldo e **extrato completo** de todo gold que entra ou sai (renda, trabalhos, compras, presentes, penhoras…). Empréstimo com taxas transparentes: **6%** na liberação · **mora de 8%/dia** · **+50%** de surcharge após 30 dias · **penhora de 70%** de tudo que você ganhar até quitar (**100%** com 60+ dias) · **Caderneta dos Devedores** (pública no app) após 14 dias de atraso. Score de crédito (0–100) sobe pagando em dia (+12) e cai pagando atrasado (−18, ou −30 com 60+ dias) — e o **limite de crédito** (até 3.000 gold) depende do score
- **📜 Quadro de Freelas (Trabalho → Quadro)** — **os usuários definem o trabalho**: publique qualquer tarefa com recompensa (mín. 10, máx. 10.000 gold). O gold sai do seu bolso na publicação (**escrow**) e só vai para quem aceitar e concluir — você paga quando aprovar, ou o trabalhador libera sozinho após **7 dias sem resposta**. Cancelar devolve tudo pro autor. "Trabalhinhos da ilha" continuam disponíveis como renda casual
- **💳 Débito** — transferências de gold instantâneas pelo banco (via sistema; a pessoa recebe ao abrir o app)
- **📒 Posse registrada** — cada movimento de gold vira entrada no seu **extrato** (`users/{uid}/ledger`); ninguém altera depois

> ⚠️ **Ainda exige publicar as regras do Firestore** (`firestore.rules`): os blocos `loans` (empréstimos), `jobs` (freelas), `users/{uid}/ledger` (extrato) e a atualização de `gifts` para aceitar `type`/`jobId`. Sem publicar, o Quadro e o Empréstimo falham em silêncio. **É a terceira vez que peço esse republish — faça de uma vez, são 2 minutos** 🙏
>
> ⚠️ Sem servidor, nada impede trapaça via Console (gerar gold do nada) — o extrato prova o histórico, mas a fonte continua client-side. Para inviolabilidade total: Cloud Functions (Blaze). O banco pune, mas não faz milagre.

## 🪙 Economia do Refúgio (v3.0 — a maior atualização até agora)

A rede social agora tem uma **economia própria**, com a moeda **gold**:

- **🪙 Loja** — 1.000 cosméticos (10 categorias × 20 temas × 5 raridades: molduras, emblemas, títulos, auras, fundos, capas, selos…), comprados com gold e equipáveis
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
