// Tokens per pass. The graph returns all passes back to back (641 tokens).
export const LEVELS = [1, 8, 16, 24, 32, 40, 52, 64, 76, 92, 108, 128];
const EOS = 0;

export function splitLevels(flat, sizes = LEVELS) {
  let o = 0;
  return sizes.map((n) => flat.slice(o, (o += n)));
}

// vocab.bytes[id] is the raw UTF-8 bytes of a token; ids 0 and 1 are end-of-text and pad.
export function decode(ids, bytes) {
  const out = [];
  for (const id of ids) {
    if (id === EOS) break;
    if (id > 1) out.push(...bytes[id]);
  }
  return new TextDecoder().decode(new Uint8Array(out)).trimStart();
}

export function sample(probs, r) {
  let x = r * probs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < probs.length; i++) if ((x -= probs[i]) < 0) return i;
  return probs.length - 1;
}

// Marks words that were not in the previous pass, counting repeats.
export function diffWords(text, prev = "") {
  const seen = new Map();
  for (const w of prev.split(/\s+/)) if (w) seen.set(w, (seen.get(w) || 0) + 1);
  return text.split(/(\s+)/).map((w) => {
    if (!w.trim()) return { w, fresh: false };
    const n = seen.get(w) || 0;
    if (n) seen.set(w, n - 1);
    return { w, fresh: !n };
  });
}

// Whole word, singular or plural, any case.
export const mentions = (text, word) => new RegExp(`\\b${word}s?\\b`, "i").test(text);
