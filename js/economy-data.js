/* ============================================================
   GOOD VIBES 🌊 — DADOS DA ECONOMIA (carregado antes do app.js)
   Define window.GV_ECO. Tudo determinístico — sem servidor.
   ============================================================ */
(function () {
'use strict';

/* ---------- 100 MATERIAIS BRUTOS ---------- */
const M = (id, name, emoji, price) => ({ id, name, emoji, price });
const RAW_MATERIALS = [
    M('madeira_pinho', 'Madeira de Pinho', '🪵', 8),
    M('madeira_carvalho', 'Madeira de Carvalho', '🪵', 14),
    M('madeira_cerejeira', 'Madeira de Cerejeira', '🪵', 26),
    M('madeira_mogno', 'Madeira de Mogno', '🪵', 40),
    M('madeira_nogueira', 'Madeira de Nogueira', '🪵', 30),
    M('madeira_ebano', 'Madeira de Ébano', '🪵', 75),
    M('fibra_vegetal', 'Fibra Vegetal', '🌿', 6),
    M('pinha', 'Pinha', '🌲', 5),
    M('pedra_bruta', 'Pedra Bruta', '🪨', 6),
    M('granito', 'Granito', '🪨', 18),
    M('marmore', 'Mármore', '🏛️', 45),
    M('calcario', 'Calcário', '🪨', 12),
    M('ardosia', 'Ardósia', '🪨', 22),
    M('arenito', 'Arenito', '🏜️', 16),
    M('obsidiana', 'Obsidiana', '🖤', 60),
    M('jade', 'Jade', '💚', 90),
    M('minerio_carvao', 'Minério de Carvão', '⛏️', 10),
    M('minerio_cobre', 'Minério de Cobre', '🟠', 20),
    M('minerio_estanho', 'Minério de Estanho', '⚪', 22),
    M('minerio_ferro', 'Minério de Ferro', '🔩', 28),
    M('minerio_chumbo', 'Minério de Chumbo', '⚫', 24),
    M('minerio_zinco', 'Minério de Zinco', '🔘', 26),
    M('minerio_prata', 'Minério de Prata', '🥈', 55),
    M('minerio_ouro', 'Minério de Ouro', '🥇', 120),
    M('minerio_platina', 'Minério de Platina', '💿', 260),
    M('minerio_bauxita', 'Bauxita', '🟤', 30),
    M('minerio_tungstenio', 'Tungstênio', '🔗', 85),
    M('minerio_uranio', 'Urânio', '☢️', 340),
    M('minerio_niquel', 'Níquel', '⭕', 32),
    M('minerio_manganes', 'Manganês', '🟣', 27),
    M('pepita_cobre', 'Pepita de Cobre', '🟧', 25),
    M('pepita_ferro', 'Pepita de Ferro', '⬜', 33),
    M('pepita_prata', 'Pepita de Prata', '⚪', 60),
    M('pepita_ouro', 'Pepita de Ouro', '🟡', 150),
    M('pepita_platina', 'Pepita de Platina', '⚪', 280),
    M('quartzo', 'Quartzo', '🔮', 40),
    M('ametista', 'Ametista', '💜', 55),
    M('topazio', 'Topázio', '🟠', 70),
    M('turquesa', 'Turquesa', '🩵', 65),
    M('opala', 'Opala', '🌈', 130),
    M('granada', 'Granada', '❤️', 75),
    M('cristal_do_mar', 'Cristal do Mar', '💧', 35),
    M('agua_marinha', 'Água-marinha', '🌊', 95),
    M('esmeralda', 'Esmeralda', '💚', 180),
    M('rubi', 'Rubi', '❤️', 220),
    M('safira', 'Safira', '💙', 200),
    M('diamante', 'Diamante', '💎', 400),
    M('flor_silvestre', 'Flor Silvestre', '🌼', 5),
    M('erva_medicinal', 'Erva Medicinal', '🌿', 9),
    M('petala_de_lotus', 'Pétala de Lótus', '🪷', 28),
    M('musgo', 'Musgo', '🍃', 4),
    M('cogumelo_vermelho', 'Cogumelo Vermelho', '🍄', 12),
    M('folha_dourada', 'Folha Dourada', '🍂', 40),
    M('mel', 'Mel', '🍯', 18),
    M('cera_de_abelha', 'Cera de Abelha', '🐝', 10),
    M('la_de_ovelha', 'Lã de Ovelha', '🐑', 14),
    M('couro_cru', 'Couro Cru', '🐂', 22),
    M('seda_bruta', 'Seda Bruta', '🕸️', 35),
    M('algodao', 'Algodão', '🤍', 11),
    M('concha', 'Concha', '🐚', 7),
    M('areia', 'Areia', '🏖️', 3),
    M('peixe_dourado', 'Peixe Dourado', '🐟', 25),
    M('estrela_do_mar', 'Estrela-do-mar', '⭐', 20),
    M('perola', 'Pérola', '🦪', 160),
    M('coral', 'Coral', '🪸', 48),
    M('sal_marinho', 'Sal Marinho', '🧂', 6),
    M('alga', 'Alga', '🌱', 4),
    M('esponja', 'Esponja', '🧽', 8),
    M('ambar', 'Âmbar', '🟠', 88),
    M('essencia_de_fogo', 'Essência de Fogo', '🔥', 75),
    M('essencia_de_agua', 'Essência de Água', '💧', 42),
    M('essencia_de_terra', 'Essência de Terra', '🌍', 38),
    M('essencia_de_ar', 'Essência de Ar', '💨', 36),
    M('lagrima_de_lua', 'Lágrima de Lua', '🌙', 110),
    M('poeira_de_estrela', 'Poeira de Estrela', '✨', 190),
    M('coracao_de_vulcao', 'Coração de Vulcão', '🌋', 210),
    M('pena_de_fenix', 'Pena de Fênix', '🪶', 260),
    M('semente_de_abajeru', 'Semente de Abajeru', '🌰', 33),
    M('lagrima_de_sereia', 'Lágrima de Sereia', '🧜', 230),
    M('farinha', 'Farinha', '🌾', 6),
    M('milho', 'Milho', '🌽', 5),
    M('cacau', 'Cacau', '🍫', 15),
    M('cafe_em_grao', 'Café em Grão', '☕', 24),
    M('leite', 'Leite', '🥛', 7),
    M('ovos', 'Ovos', '🥚', 8),
    M('argila', 'Argila', '🧱', 5),
    M('areia_preta', 'Areia Preta', '◼️', 17),
    M('carvao_vegetal', 'Carvão Vegetal', '🔥', 9),
    M('gelo_eterno', 'Gelo Eterno', '🧊', 95),
    M('couro_de_crocodilo', 'Couro de Crocodilo', '🐊', 85),
    M('osso_de_baleia', 'Osso de Baleia', '🐋', 65),
    M('pedra_pomes', 'Pedra-pomes', '🪨', 10),
    M('salitre', 'Salitre', '🧂', 19),
    M('grafite', 'Grafite', '✏️', 23),
    M('cinza_de_vulcao', 'Cinza de Vulcão', '🌋', 31),
    M('orvalho_dourado', 'Orvalho Dourado', '🌟', 58),
    M('mecha_de_raio', 'Mecha de Raio', '⚡', 105),
    M('cristal_runico', 'Cristal Rúnico', '🔷', 150),
    M('meteorito', 'Meteorito', '☄️', 320),
    M('fragmento_lunar', 'Fragmento Lunar', '🌜', 125)
];

/* ---------- 26 MATERIAIS REFINADOS ---------- */
const REFINED_MATERIALS = [
    M('prancha', 'Prancha', '🟫', 30),
    M('barra_ferro', 'Barra de Ferro', '🔩', 90),
    M('barra_cobre', 'Barra de Cobre', '🟠', 70),
    M('barra_estanho', 'Barra de Estanho', '⚪', 75),
    M('barra_prata', 'Barra de Prata', '🥈', 180),
    M('barra_ouro', 'Barra de Ouro', '🥇', 400),
    M('barra_platina', 'Barra de Platina', '💿', 800),
    M('barra_chumbo', 'Barra de Chumbo', '⚫', 80),
    M('argila_cozida', 'Argila Cozida', '🧱', 20),
    M('vidro', 'Vidro', '🪟', 45),
    M('tijolo', 'Tijolo', '🧱', 35),
    M('bloco_de_marmore', 'Bloco de Mármore', '🏛️', 150),
    M('liga_de_aco', 'Liga de Aço', '⛓️', 320),
    M('liga_de_bronze', 'Liga de Bronze', '🟤', 95),
    M('perola_polida', 'Pérola Polida', '🦪', 350),
    M('gema_lapidada', 'Gema Lapidada', '💎', 500),
    M('essencia_concentrada', 'Essência Concentrada', '🌈', 250),
    M('fibra_trancada', 'Fibra Trançada', '🪢', 25),
    M('couro_curtido', 'Couro Curtido', '🐂', 60),
    M('la_fiada', 'Lã Fiada', '🧶', 45),
    M('mel_nobre', 'Mel Nobre', '🍯', 90),
    M('pergaminho', 'Pergaminho', '📜', 55),
    M('tinta_violeta', 'Tinta Violeta', '🖋️', 120),
    M('sal_refinado', 'Sal Refinado', '🧂', 12),
    M('cristal_lapidado', 'Cristal Lapidado', '🔮', 270),
    M('lingote_enfeitiçado', 'Lingote Enfeitiçado', '🪄', 600)
];

/* ---------- 36 RECEITAS DA REFINARIA ---------- */
/* inputs: { idMaterial: quantidade } — todos os materiais brutos ou refinados */
const RECIPES = [
    { id: 'r_prancha', out: 'prancha', qty: 2, inputs: { madeira_carvalho: 2 }, shape: ["XX"], key: {"X":"madeira_carvalho"} },
    { id: 'r_barra_ferro', out: 'barra_ferro', qty: 1, inputs: { minerio_ferro: 3 }, shape: ["X","X","X"], key: {"X":"minerio_ferro"} },
    { id: 'r_barra_cobre', out: 'barra_cobre', qty: 1, inputs: { minerio_cobre: 3 }, shape: ["X","X","X"], key: {"X":"minerio_cobre"} },
    { id: 'r_barra_estanho', out: 'barra_estanho', qty: 1, inputs: { minerio_estanho: 3 }, shape: ["X","X","X"], key: {"X":"minerio_estanho"} },
    { id: 'r_barra_prata', out: 'barra_prata', qty: 1, inputs: { minerio_prata: 3 }, shape: ["X","X","X"], key: {"X":"minerio_prata"} },
    { id: 'r_barra_ouro', out: 'barra_ouro', qty: 1, inputs: { minerio_ouro: 2, pepita_ouro: 1 }, shape: ["X","Y","X"], key: {"X":"minerio_ouro","Y":"pepita_ouro"} },
    { id: 'r_barra_platina', out: 'barra_platina', qty: 1, inputs: { minerio_platina: 2, pepita_platina: 1 }, shape: ["X","Y","X"], key: {"X":"minerio_platina","Y":"pepita_platina"} },
    { id: 'r_barra_chumbo', out: 'barra_chumbo', qty: 1, inputs: { minerio_chumbo: 3 }, shape: ["X","X","X"], key: {"X":"minerio_chumbo"} },
    { id: 'r_argila_cozida', out: 'argila_cozida', qty: 2, inputs: { argila: 2, carvao_vegetal: 1 }, shape: ["A","A","C"], key: {"A":"argila","C":"carvao_vegetal"} },
    { id: 'r_vidro', out: 'vidro', qty: 1, inputs: { areia: 3, carvao_vegetal: 1 }, shape: ["SSS",".C."], key: {"S":"areia","C":"carvao_vegetal"} },
    { id: 'r_tijolo', out: 'tijolo', qty: 2, inputs: { argila_cozida: 2 }, shape: ["TT"], key: {"T":"argila_cozida"} },
    { id: 'r_bloco_marmore', out: 'bloco_de_marmore', qty: 1, inputs: { marmore: 3 }, shape: ["MMM"], key: {"M":"marmore"} },
    { id: 'r_liga_aco', out: 'liga_de_aco', qty: 1, inputs: { barra_ferro: 2, carvao_vegetal: 1 }, shape: ["F.F",".C."], key: {"F":"barra_ferro","C":"carvao_vegetal"} },
    { id: 'r_liga_bronze', out: 'liga_de_bronze', qty: 1, inputs: { barra_cobre: 2, barra_estanho: 1 }, shape: ["CC","S."], key: {"C":"barra_cobre","S":"barra_estanho"} },
    { id: 'r_perola', out: 'perola_polida', qty: 1, inputs: { perola: 1, agua_marinha: 1 }, shape: ["P","A"], key: {"P":"perola","A":"agua_marinha"} },
    { id: 'r_gema', out: 'gema_lapidada', qty: 1, inputs: { esmeralda: 1, quartzo: 2 }, shape: ["Q","E","Q"], key: {"Q":"quartzo","E":"esmeralda"} },
    { id: 'r_essencia', out: 'essencia_concentrada', qty: 1, inputs: { essencia_de_fogo: 1, essencia_de_agua: 1, essencia_de_terra: 1, essencia_de_ar: 1 }, shape: ["FW","TA"], key: {"F":"essencia_de_fogo","W":"essencia_de_agua","T":"essencia_de_terra","A":"essencia_de_ar"} },
    { id: 'r_fibra', out: 'fibra_trancada', qty: 2, inputs: { fibra_vegetal: 2 }, shape: ["FF"], key: {"F":"fibra_vegetal"} },
    { id: 'r_couro', out: 'couro_curtido', qty: 1, inputs: { couro_cru: 2, sal_marinho: 1 }, shape: ["CC","S."], key: {"C":"couro_cru","S":"sal_marinho"} },
    { id: 'r_la', out: 'la_fiada', qty: 2, inputs: { la_de_ovelha: 2 }, shape: ["LL"], key: {"L":"la_de_ovelha"} },
    { id: 'r_mel_nobre', out: 'mel_nobre', qty: 1, inputs: { mel: 2, cera_de_abelha: 1 }, shape: ["M","M","C"], key: {"M":"mel","C":"cera_de_abelha"} },
    { id: 'r_pergaminho', out: 'pergaminho', qty: 1, inputs: { fibra_trancada: 2, tinta_violeta: 1 }, shape: ["F","T","F"], key: {"F":"fibra_trancada","T":"tinta_violeta"} },
    { id: 'r_tinta', out: 'tinta_violeta', qty: 1, inputs: { petala_de_lotus: 2, musgo: 1 }, shape: ["P.P",".M."], key: {"P":"petala_de_lotus","M":"musgo"} },
    { id: 'r_sal', out: 'sal_refinado', qty: 2, inputs: { salitre: 2 }, shape: ["SS"], key: {"S":"salitre"} },
    { id: 'r_cristal', out: 'cristal_lapidado', qty: 1, inputs: { cristal_do_mar: 2, mecha_de_raio: 1 }, shape: ["C","R","C"], key: {"C":"cristal_do_mar","R":"mecha_de_raio"} },
    { id: 'r_lingote', out: 'lingote_enfeitiçado', qty: 1, inputs: { barra_ouro: 1, lagrima_de_lua: 1, poeira_de_estrela: 1 }, shape: ["G","L","S"], key: {"G":"barra_ouro","L":"lagrima_de_lua","S":"poeira_de_estrela"} },
    { id: 'r_pergaminho2', out: 'pergaminho', qty: 1, inputs: { fibra_trancada: 1, algodao: 2 }, shape: ["A","F","A"], key: {"A":"algodao","F":"fibra_trancada"} },
    { id: 'r_gema2', out: 'gema_lapidada', qty: 1, inputs: { rubi: 1, quartzo: 1 }, shape: ["R","Q"], key: {"R":"rubi","Q":"quartzo"} },
    { id: 'r_gema3', out: 'gema_lapidada', qty: 1, inputs: { safira: 1, quartzo: 1 }, shape: ["S","Q"], key: {"S":"safira","Q":"quartzo"} },
    { id: 'r_vidro2', out: 'vidro', qty: 1, inputs: { areia_preta: 2, carvao_vegetal: 1 }, shape: ["AA","C."], key: {"A":"areia_preta","C":"carvao_vegetal"} },
    { id: 'r_prancha2', out: 'prancha', qty: 2, inputs: { madeira_pinho: 3 }, shape: ["PPP"], key: {"P":"madeira_pinho"} },
    { id: 'r_tijolo2', out: 'tijolo', qty: 2, inputs: { calcario: 2, argila: 1 }, shape: ["CC","A."], key: {"C":"calcario","A":"argila"} },
    { id: 'r_liga_aco2', out: 'liga_de_aco', qty: 1, inputs: { minerio_tungstenio: 1, barra_ferro: 1 }, shape: ["T","F"], key: {"T":"minerio_tungstenio","F":"barra_ferro"} },
    { id: 'r_bloco_marmore2', out: 'bloco_de_marmore', qty: 1, inputs: { arenito: 2, calcario: 1 }, shape: ["AA","C."], key: {"A":"arenito","C":"calcario"} },
    { id: 'r_couro2', out: 'couro_curtido', qty: 1, inputs: { couro_de_crocodilo: 1, sal_marinho: 1 }, shape: ["C","S"], key: {"C":"couro_de_crocodilo","S":"sal_marinho"} },
    { id: 'r_la2', out: 'la_fiada', qty: 2, inputs: { seda_bruta: 1 }, shape: ["S"], key: {"S":"seda_bruta"} },
    { id: 'r_art_amuleto', out: 'art_amuleto_cobre', qty: 1, inputs: { barra_cobre: 2 }, shape: ["CC"], key: { C: 'barra_cobre' } },
    { id: 'r_art_anel', out: 'art_anel_prata', qty: 1, inputs: { barra_prata: 1, perola_polida: 1 }, shape: ["S", "P"], key: { S: 'barra_prata', P: 'perola_polida' } },
    { id: 'r_art_candelabro', out: 'art_candelabro_aco', qty: 1, inputs: { liga_de_aco: 1, vidro: 1 }, shape: ["A", "V"], key: { A: 'liga_de_aco', V: 'vidro' } },
    { id: 'r_art_rosario', out: 'art_rosario_bronze', qty: 1, inputs: { liga_de_bronze: 1, la_fiada: 2 }, shape: ["L", "B", "L"], key: { L: 'la_fiada', B: 'liga_de_bronze' } },
    { id: 'r_art_idolo', out: 'art_idolo_marmore', qty: 1, inputs: { bloco_de_marmore: 2, tinta_violeta: 1 }, shape: ["M", "M", "T"], key: { M: 'bloco_de_marmore', T: 'tinta_violeta' } },
    { id: 'r_art_coroa', out: 'art_coroa_refugio', qty: 1, inputs: { barra_ouro: 2, gema_lapidada: 1 }, shape: ["G.G", ".E."], key: { G: 'barra_ouro', E: 'gema_lapidada' } },
    { id: 'r_art_orbe', out: 'art_orbe_encantado', qty: 1, inputs: { lingote_enfeitiçado: 1, cristal_lapidado: 1, essencia_concentrada: 1 }, shape: ["L", "C", "E"], key: { L: 'lingote_enfeitiçado', C: 'cristal_lapidado', E: 'essencia_concentrada' } }
];

/* ---------- 12 CONSTRUÇÕES ---------- */
/* costMats usa ids de materiais (brutos ou refinados) */

/* ---------- ARTEFATOS (craftáveis, renda passiva pequena e para sempre) ---------- */
const ARTIFACTS = [
    { id: 'art_amuleto_cobre', name: 'Amuleto de Cobre', emoji: '🧿', passive: 2, hint: 'Dois cobres lado a lado…', desc: '+2 gold/min, para sempre' },
    { id: 'art_anel_prata', name: 'Anel de Prata', emoji: '💍', passive: 3, hint: 'Prata sobre uma pérola polida…', desc: '+3 gold/min, para sempre' },
    { id: 'art_candelabro_aco', name: 'Candelabro de Aço', emoji: '🕯️', passive: 4, hint: 'Liga de aço sobre vidro…', desc: '+4 gold/min, para sempre' },
    { id: 'art_rosario_bronze', name: 'Rosário de Bronze', emoji: '📿', passive: 5, hint: 'Lã, bronze e lã em pé…', desc: '+5 gold/min, para sempre' },
    { id: 'art_idolo_marmore', name: 'Ídolo de Mármore', emoji: '🏺', passive: 8, hint: 'Dois mármores e um pingo de tinta…', desc: '+8 gold/min, para sempre' },
    { id: 'art_coroa_refugio', name: 'Coroa do Refúgio', emoji: '👑', passive: 12, hint: 'Ouro, gema, ouro — em coroa…', desc: '+12 gold/min, para sempre' },
    { id: 'art_orbe_encantado', name: 'Orbe Encantado', emoji: '🔮', passive: 18, hint: 'Lingote enfeitiçado, cristal e essência…', desc: '+18 gold/min, para sempre' }
];
const ARTIFACT_BY_ID = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

const BUILDINGS = [
    { id: 'barraca', name: 'Barraca', emoji: '⛺', costGold: 800, costMats: { madeira_pinho: 6 }, rate: 1, desc: 'Um canto seu no mundo. +1 gold/min' },
    { id: 'poco', name: 'Poço', emoji: '🪣', costGold: 1200, costMats: { madeira_carvalho: 4 }, rate: 2, desc: 'Água fresca sempre à mão. +2 gold/min' },
    { id: 'jardim', name: 'Jardim', emoji: '🌻', costGold: 1500, costMats: { fibra_vegetal: 6, semente_de_abajeru: 2 }, rate: 3, desc: 'Flores que pagam. +3 gold/min' },
    { id: 'oficina', name: 'Oficina', emoji: '🔧', costGold: 2500, costMats: { prancha: 6, barra_cobre: 2 }, rate: 4, desc: 'Onde as ideias viram coisas. +4 gold/min' },
    { id: 'fazenda', name: 'Fazenda', emoji: '🚜', costGold: 3000, costMats: { prancha: 8, farinha: 10 }, rate: 5, desc: 'Comida e renda na mesma terra. +5 gold/min' },
    { id: 'forja', name: 'Forja', emoji: '🔥', costGold: 4000, costMats: { tijolo: 10, barra_ferro: 3 }, rate: 7, desc: 'O coração quente do refúgio. +7 gold/min' },
    { id: 'feitiçaria', name: 'Feitiçaria', emoji: '🪄', costGold: 5500, costMats: { cristal_lapidado: 2, essencia_de_terra: 3 }, rate: 9, desc: 'Estudos arcanos lucrativos. +9 gold/min' },
    { id: 'mina', name: 'Mina Pessoal', emoji: '⛏️', costGold: 6000, costMats: { barra_ferro: 5, tijolo: 8 }, rate: 10, desc: 'Seu próprio filão. +10 gold/min' },
    { id: 'biblioteca', name: 'Biblioteca', emoji: '📚', costGold: 8000, costMats: { prancha: 12, pergaminho: 4 }, rate: 13, desc: 'O conhecimento paga bem. +13 gold/min' },
    { id: 'farol', name: 'Torre do Farol', emoji: '🗼', costGold: 12000, costMats: { pedra_pomes: 6, cristal_lapidado: 4 }, rate: 16, desc: 'Guia os navegantes (e o seu ouro). +16 gold/min' },
    { id: 'mansao', name: 'Mansão do Refúgio', emoji: '🏖️', costGold: 22000, costMats: { bloco_de_marmore: 8, barra_ouro: 4 }, rate: 22, desc: 'A casa dos sonhos na beira-mar. +22 gold/min' },
    { id: 'trono_do_refugio', name: 'Trono do Refúgio', emoji: '👑', costGold: 50000, costMats: { barra_platina: 6, lagrima_de_lua: 8, cristal_runico: 10 }, rate: 40, desc: 'A lenda viva da ilha. +40 gold/min' }
];

/* ---------- 8 TRABALHOS ---------- */
const JOBS = [
    { id: 'freelancer', name: 'Freelancer do Refúgio', emoji: '💻', cdMinutes: 10, goldMin: 60, goldMax: 95, desc: 'Jobs rápidos pro pessoal da ilha.' },
    { id: 'carregador', name: 'Carregador de Feira', emoji: '📦', cdMinutes: 8, goldMin: 45, goldMax: 70, desc: 'Força, ritmo e bom humor.' },
    { id: 'pescador', name: 'Pescador', emoji: '🎣', cdMinutes: 12, goldMin: 70, goldMax: 110, bonus: { id: 'peixe_dourado', chance: 0.35, qty: 1 }, desc: 'Pode voltar com algo dourado.' },
    { id: 'lenhador', name: 'Lenhador', emoji: '🪓', cdMinutes: 10, goldMin: 55, goldMax: 85, bonus: { id: 'madeira_carvalho', chance: 0.6, qty: 1 }, desc: 'Madeira boa vale ouro.' },
    { id: 'minerador', name: 'Minerador', emoji: '⛏️', cdMinutes: 15, goldMin: 100, goldMax: 150, bonus: { id: 'minerio_ferro', chance: 0.6, qty: 1 }, desc: 'Batendo na rocha desde cedo.' },
    { id: 'professor_yoga', name: 'Professor(a) de Yoga', emoji: '🧘', cdMinutes: 18, goldMin: 150, goldMax: 220, desc: 'Respira fundo e cobra bem.' },
    { id: 'dj_do_refugio', name: 'DJ do Refúgio', emoji: '🎧', cdMinutes: 22, goldMin: 200, goldMax: 300, desc: 'O som da ilha é com você.' },
    { id: 'lenda_do_surf', name: 'Lenda do Surf', emoji: '🏄', cdMinutes: 40, goldMin: 500, goldMax: 750, bonus: { id: 'perola', chance: 0.3, qty: 1 }, desc: 'Mandando a melhor onda da vida.' }
];

/* ---------- 6 PONTOS DE COLETA ---------- */
const GATHER_LOCATIONS = [
    { id: 'floresta', name: 'Floresta', emoji: '🌲', cdSeconds: 120, power: 1, drops: [ ['madeira_pinho', 30], ['madeira_carvalho', 22], ['fibra_vegetal', 25], ['pinha', 18], ['flor_silvestre', 12], ['mel', 4] ] },
    { id: 'mina', name: 'Mina Velha', emoji: '⛏️', cdSeconds: 180, power: 0.75, drops: [ ['pedra_bruta', 30], ['minerio_carvao', 20], ['minerio_ferro', 14], ['minerio_cobre', 12], ['grafite', 6], ['minerio_prata', 4] ] },
    { id: 'rio_praia', name: 'Rio & Praia', emoji: '🏖️', cdSeconds: 150, power: 0.9, drops: [ ['concha', 25], ['areia', 25], ['sal_marinho', 18], ['alga', 20], ['peixe_dourado', 8], ['perola', 2], ['ambar', 2] ] },
    { id: 'campo', name: 'Campo Florido', emoji: '🌼', cdSeconds: 120, power: 1, drops: [ ['flor_silvestre', 25], ['erva_medicinal', 20], ['mel', 12], ['cogumelo_vermelho', 12], ['petala_de_lotus', 4], ['milho', 10] ] },
    { id: 'montanha', name: 'Montanha', emoji: '⛰️', cdSeconds: 210, power: 0.65, drops: [ ['marmore', 8], ['granito', 18], ['calcario', 20], ['obsidiana', 6], ['jade', 2], ['cristal_runico', 1] ] },
    { id: 'pantano', name: 'Pântano', emoji: '🐸', cdSeconds: 150, power: 0.85, drops: [ ['musgo', 28], ['cogumelo_vermelho', 15], ['erva_medicinal', 15], ['lagrima_de_sereia', 2], ['agua_marinha', 3] ] }
];

/* ---------- 1.000 COSMÉTICOS (10 categorias × 20 temas × 5 raridades) ---------- */
const COSMETIC_CATEGORIES = [
    { id: 'moldura', word: 'Moldura', emoji: '🖼️' },
    { id: 'emblema', word: 'Emblema', emoji: '🏅' },
    { id: 'titulo', word: 'Título', emoji: '🎖️' },
    { id: 'nome', word: 'Nome', emoji: '🎨' },
    { id: 'fundo', word: 'Fundo', emoji: '🌅' },
    { id: 'aura', word: 'Aura', emoji: '✨' },
    { id: 'reacao', word: 'Reação', emoji: '🎉' },
    { id: 'efeito', word: 'Efeito de Post', emoji: '📸' },
    { id: 'capa', word: 'Capa', emoji: '🌄' },
    { id: 'selo', word: 'Selo', emoji: '🏷️' }
];
const COSMETIC_THEMES = [
    { slug: 'solar', name: 'Solar', emoji: '☀️', c1: '#fbbf24', c2: '#f97316' },
    { slug: 'lunar', name: 'Lunar', emoji: '🌙', c1: '#c4b5fd', c2: '#6366f1' },
    { slug: 'oceano', name: 'Oceano', emoji: '🌊', c1: '#22d3ee', c2: '#0369a1' },
    { slug: 'floresta', name: 'Floresta', emoji: '🌿', c1: '#4ade80', c2: '#166534' },
    { slug: 'fogo', name: 'Fogo', emoji: '🔥', c1: '#f97316', c2: '#dc2626' },
    { slug: 'gelo', name: 'Gelo', emoji: '❄️', c1: '#a5f3fc', c2: '#3b82f6' },
    { slug: 'raio', name: 'Raio', emoji: '⚡', c1: '#fde047', c2: '#eab308' },
    { slug: 'pedra', name: 'Pedra', emoji: '🪨', c1: '#d6d3d1', c2: '#57534e' },
    { slug: 'jardim', name: 'Jardim', emoji: '🌸', c1: '#f9a8d4', c2: '#db2777' },
    { slug: 'neon', name: 'Neon', emoji: '💜', c1: '#e879f9', c2: '#7c3aed' },
    { slug: 'por_do_sol', name: 'Pôr do Sol', emoji: '🌇', c1: '#fdba74', c2: '#e11d48' },
    { slug: 'aurora', name: 'Aurora', emoji: '🌌', c1: '#5eead4', c2: '#7c3aed' },
    { slug: 'cafe', name: 'Café', emoji: '☕', c1: '#d8b48a', c2: '#78350f' },
    { slug: 'surf', name: 'Surf', emoji: '🏄', c1: '#38bdf8', c2: '#0f766e' },
    { slug: 'sereia', name: 'Sereia', emoji: '🧜', c1: '#f0abfc', c2: '#0e7490' },
    { slug: 'farol', name: 'Farol', emoji: '🗼', c1: '#fef08a', c2: '#b45309' },
    { slug: 'estrela', name: 'Estrela', emoji: '⭐', c1: '#fef9c3', c2: '#f59e0b' },
    { slug: 'cometa', name: 'Cometa', emoji: '☄️', c1: '#e0f2fe', c2: '#8b5cf6' },
    { slug: 'prisma', name: 'Prisma', emoji: '🌈', c1: '#fda4af', c2: '#22d3ee' },
    { slug: 'maré', name: 'Maré', emoji: '🐚', c1: '#5eead4', c2: '#1e40af' }
];
/* Tema → efeito animado do post (categoria "efeito") */
const THEME_FX = {
    fogo: 'flame', raio: 'flash', neon: 'neon', estrela: 'sparkle', aurora: 'aurora',
    prisma: 'rainbow', cometa: 'comet', solar: 'glow', lunar: 'glow', sereia: 'shimmer'
};
const fxAnimFor = (themeSlug) => THEME_FX[themeSlug] || 'shimmer';
/* Descrição do efeito para a UI */
const CAT_EFFECT_TEXT = {
    moldura: 'Moldura do tema no seu avatar em todo lugar',
    emblema: 'Medalha brilhante ao lado do seu nome',
    titulo: 'Pílula com o nome do seu título no feed e comentários',
    nome: 'Seu nome com o gradiente do tema no feed, comentários e chat',
    fundo: 'Posts seus e seu perfil ganham o toque do tema',
    aura: 'Brilho pulsante animado em volta do seu avatar',
    reacao: 'Botão de reação com o SEU emoji no feed — todo mundo conta',
    efeito: 'Seus posts ganham a animação do tema (chama, neon, cometa…)',
    capa: 'Capa temática no topo do seu perfil',
    selo: 'Selo do tema no canto dos seus posts'
};
const RARITIES = [
    { id: 'comum', name: 'Comum', gem: '⚪', price: 120, weight: 5 },
    { id: 'incomum', name: 'Incomum', gem: '🟢', price: 300, weight: 4 },
    { id: 'raro', name: 'Raro', gem: '🔵', price: 750, weight: 3 },
    { id: 'epico', name: 'Épico', gem: '🟣', price: 1700, weight: 2 },
    { id: 'lendario', name: 'Lendário', gem: '🟡', price: 4200, weight: 1 }
];

function buildCosmeticsCatalog() {
    const items = [];
    for (const cat of COSMETIC_CATEGORIES) {
        for (const theme of COSMETIC_THEMES) {
            for (const rar of RARITIES) {
                items.push({
                    id: `${cat.id}_${theme.slug}_${rar.id}`,
                    cat: cat.id,
                    catWord: cat.word,
                    catEmoji: cat.emoji,
                    name: `${cat.word} ${theme.name} ${rar.name}`,
                    emoji: theme.emoji,
                    theme: theme.slug,
                    themeName: theme.name,
                    c1: theme.c1,
                    c2: theme.c2,
                    fx: fxAnimFor(theme.slug),
                    effect: CAT_EFFECT_TEXT[cat.id] || '',
                    rarity: rar.id,
                    rarityName: rar.name,
                    gem: rar.gem,
                    price: rar.price
                });
            }
        }
    }
    return items; // 10 × 20 × 5 = 1.000
}
const COSMETICS = buildCosmeticsCatalog();

const SELL_RATE = 0.6; // venda = 60% do preço
const ALL_MATERIALS = [...RAW_MATERIALS, ...REFINED_MATERIALS];
const MATERIAL_BY_ID = Object.fromEntries(ALL_MATERIALS.map((m) => [m.id, m]));
const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

window.GV_ECO = {
    RAW_MATERIALS,
    REFINED_MATERIALS,
    ALL_MATERIALS,
    MATERIAL_BY_ID,
    RECIPES,
    ARTIFACTS,
    ARTIFACT_BY_ID,
    BUILDINGS,
    JOBS,
    GATHER_LOCATIONS,
    COSMETICS,
    COSMETIC_BY_ID,
    COSMETIC_CATEGORIES,
    RARITIES,
    SELL_RATE
};
})();
