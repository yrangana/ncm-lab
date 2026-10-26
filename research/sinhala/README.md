# Sinhala to English NCM

Goal: a small NCM translator (about 100M generator) for Sinhala to English, running in the browser, with a level slider. Then a write-up of what the coarse levels capture.

## Data (check every licence before use)

| Source | What | Licence to confirm |
|---|---|---|
| OPUS (CCAligned, OpenSubtitles, Tatoeba, GNOME, Ubuntu, etc.) | Parallel si-en sentences | Varies per corpus |
| FLORES-200 | High-quality dev and test sets (eval only) | CC-BY-SA 4.0 |
| NLLB / CCMatrix mined data | Large, noisy | Check terms |
| Government trilingual documents | Domain text | Check terms |

Plan: train on cleaned OPUS subsets, evaluate on FLORES-200 devtest only. Keep a datasheet of every source, size, licence and cleaning step in this folder.

## Decisions to make

- **Tokenizer.** Sinhala script is poorly covered by most English BPE tokenizers. Options: a joint SentencePiece model trained on our data (likely best), byte-level (simple, longer sequences), or a multilingual tokenizer (Qwen, NLLB).
- **Lengths.** NCM has a fixed target length. Pick L from the length distribution (WMT14 used 64 target tokens) and pad.
- **Level schedule.** Start with the WMT14 config (11 levels) and ablate.

## Training

- Base on the upstream modules (research/upstream). The release has no training loop, so write one that follows paper Section 3: train the tokenizer with nested dropout, freeze it, train the generator with conditioning corruption.
- Rent a 24 GB GPU (RunPod, Lambda, Vast or a personal GCP spot instance). Expect hours per run, not days.

## Baselines

- Same-size autoregressive transformer on the same data.
- A public MT model (for example NLLB-200 distilled 600M) as a quality reference, clearly marked as much larger.

## Write-up ideas

- How BLEU and chrF move by level for Sinhala vs the paper's German.
- What the first three levels encode: probe by fixing coarse codes and resampling (paper Appendix H).
- Phone speed on a budget Android.
