/* Geração de mídia (imagem/vídeo de citação) com FFmpeg.
   FFmpeg e a fonte DejaVu vêm pré-instalados no ubuntu-latest do GitHub
   Actions (e o workflow confere/instala se faltar). */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pickQuote } from './quotes.mjs';

export const FONT_FILE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
export const VIDEO_SECONDS = 8;
export const WIDTH = 1080;
export const HEIGHT = 1080;

/* ---------- Utilitários de texto (puros, testáveis) ---------- */

export function wrapText(text, maxChars = 26) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) {
            current = candidate;
        } else {
            if (current) lines.push(current);
            // Palavra maior que a linha: quebra na marra
            current = word.length > maxChars ? word.slice(0, maxChars) : word;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/* drawtext: escapar \ : ' e % para não quebrar o filtro nem expandir nada */
export function escapeDrawtext(text) {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'")
        .replace(/%/g, '%%');
}

const hexToFFmpeg = (hex) => hex; // gradientes e color aceitam 0xRRGGBB puro

export function gradientFilter({ c0, c1 }) {
    return `gradients=size=${WIDTH}x${HEIGHT}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${WIDTH}:y1=${HEIGHT}`;
}

export function drawtextFilters({ lines, watermark, fontsize = 56, widthHint = 26 }) {
    const lineHeight = Math.round(fontsize * 1.5);
    const blockHeight = lines.length * lineHeight;
    const startY = Math.floor((HEIGHT - blockHeight) / 2) - 30;
    const font = `fontfile=${FONT_FILE}`;
    const parts = lines.map((line, i) => {
        const y = startY + i * lineHeight;
        return `drawtext=${font}:text='${escapeDrawtext(line)}':fontsize=${fontsize}:fontcolor=white:shadowx=3:shadowy=3:shadowcolor=black@0.55:x=(w-text_w)/2:y=${y}`;
    });
    if (watermark) {
        parts.push(`drawtext=${font}:text='${escapeDrawtext(watermark)}':fontsize=34:fontcolor=white@0.85:shadowx=2:shadowy=2:shadowcolor=black@0.5:x=(w-text_w)/2:y=h-96`);
    }
    return parts.join(',');
}

/* ---------- Comandos FFmpeg ---------- */

export function buildImageCommand(quotePick, watermark, outPath) {
    const lines = wrapText(quotePick.quote, 26);
    const clamped = hexToFFmpeg(quotePick.palette.c0);
    const grads = gradientFilter(quotePick.palette);
    const draw = drawtextFilters({ lines, watermark });
    // Tenta gradiente; se a versão do ffmpeg não tiver o filtro "gradients", cai para cor sólida
    const filter = `${grads},${draw}`;
    return {
        primary: ['-y', '-f', 'lavfi', '-i', filter, '-frames:v', '1', outPath],
        fallback: ['-y', '-f', 'lavfi', '-i', `color=c=${clamped}:size=${WIDTH}x${HEIGHT}`, '-vf', draw, '-frames:v', '1', outPath]
    };
}

export function buildVideoCommand(quotePick, watermark, outPath) {
    const lines = wrapText(quotePick.quote, 26);
    const clamped = hexToFFmpeg(quotePick.palette.c0);
    const grads = `${gradientFilter(quotePick.palette)}:speed=0.06`;
    const draw = drawtextFilters({ lines, watermark });
    const fade = `fade=t=in:st=0:d=0.8,fade=t=out:st=${VIDEO_SECONDS - 0.8}:d=0.8`;
    const filter = `${grads},${draw},${fade}`;
    return {
        primary: ['-y', '-f', 'lavfi', '-i', filter, '-t', String(VIDEO_SECONDS), '-r', '24', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath],
        fallback: ['-y', '-f', 'lavfi', '-i', `color=c=${clamped}:size=${WIDTH}x${HEIGHT}:r=24`, '-vf', `${draw},${fade}`, '-t', String(VIDEO_SECONDS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath]
    };
}

const run = (args) => execFileSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Gera a mídia da citação. Retorna { path, mime, kind }.
 * kind: 'video' | 'image'
 */
export function generateQuoteMedia({ quoteIndex, personaName, kind }) {
    const pick = pickQuote(quoteIndex);
    const dir = mkdtempSync(join(tmpdir(), 'gv-media-'));
    const isVideo = kind === 'video';
    const outPath = join(dir, isVideo ? 'citacao.mp4' : 'citacao.png');
    const watermark = `Good Vibes 🤖 · ${personaName}`;
    const { primary, fallback } = isVideo
        ? buildVideoCommand(pick, watermark, outPath)
        : buildImageCommand(pick, watermark, outPath);
    try {
        run(primary);
    } catch (err) {
        console.warn('⚠️ ffmpeg com gradiente falhou; usando cor sólida. Detalhe:', String(err?.stderr || err?.message || err).slice(0, 200));
        run(fallback);
    }
    return { path: outPath, mime: isVideo ? 'video/mp4' : 'image/png', kind: isVideo ? 'video' : 'image', quote: pick.quote };
}
