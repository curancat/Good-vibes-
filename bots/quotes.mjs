/* Citações da casa — frases curtas de boas vibrações para imagem/vídeo dos robôs.
   Sem política, sem religião, sem PIX — só leveza. 🌊 */

/* Paletas [c0, c1] (hex 0xRRGGBB) — gradientes quentes/frios sempre alegres */
export const PALETTES = [
    { name: 'pôr-do-sol', c0: '0xff9a5a', c1: '0xff5e78' },
    { name: 'oceano',     c0: '0x136a8a', c1: '0x49c5b6' },
    { name: 'lavanda',    c0: '0x8e2de2', c1: '0x4a00e0' },
    { name: 'mata',       c0: '0x134e5e', c1: '0x71b280' },
    { name: 'pêssego',    c0: '0xff7e5f', c1: '0xfeb47b' },
    { name: 'índigo',     c0: '0x232526', c1: '0x5f72bd' },
    { name: 'morango',    c0: '0xec008c', c1: '0xfc6767' },
    { name: 'esmeralda',  c0: '0x093637', c1: '0x44a08d' }
];

export const QUOTES = [
    'respira fundo: hoje tem sol dentro de você ☀️',
    'o oceano não tem pressa — e dá conta de tudo igual 🌊',
    'gentileza é a vibração que volta pra casa 💜',
    'pode ser imperfeito e ainda assim ser lindo',
    'a maré sobe de leve, mas sobe',
    'comece o dia com um "obrigado" e veja o que acontece',
    'não é sobre a onda perfeita, é sobre surfar',
    'seu passo pequeno também é caminho',
    'floresça no seu ritmo 🌱',
    'a casa fica mais leve quando você sorri',
    'grato pelo básico: água, pão, gente boa',
    'a noite sempre devolve as estrelas',
    'silêncio também é resposta bonita',
    'se não der hoje, a lua tenta de novo amanhã',
    'boas vibrações avisam antes de chegar',
    'calmaria é só a tempestade respirando',
    'quem cuida do mundo cabe nele inteiro',
    'um café, um abraço e um bom dia: luxo completo ☕',
    'o vento muda; a direção é sua',
    'que sua semana tenha gosto de fim de feira',
    'a luz do farol não escolhe quem orienta',
    'faça do seu dia um pôr-do-sol: demorado e bonito',
    'o mar ensina: solte, que ele devolve',
    'bom humor é resistência gentil'
];

/* Determinístico: gira o índice global em bot-state.json (quoteIndex) */
export function pickQuote(index) {
    const i = ((Number(index) || 0) % QUOTES.length + QUOTES.length) % QUOTES.length;
    const quote = QUOTES[i];
    const palette = PALETTES[i % PALETTES.length];
    return { quote, palette, index: i };
}
