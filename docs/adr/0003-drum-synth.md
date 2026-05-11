---
status: accepted
date: 2026-05-11
---

# 0003 — In-browser drum synthesis

## Context

We could ship drum samples (WAV/MP3) and play them with `AudioBufferSource`. Or we can synthesize each hit from oscillators and noise. Trade-offs around bundle size, sample licensing, and "good enough" sound quality.

## Decision

Synthesize everything in `src/features/tapsymphony/drums.ts`:

- **kick**: sine osc, 140 Hz → 40 Hz exponential drop over 180 ms, 400 ms total decay.
- **snare**: white-noise burst, high-passed at 1.5 kHz, 180 ms decay.
- **hi-hat**: white-noise burst, high-passed at 7 kHz, 50 ms decay.
- **clap**: 4 short noise bursts (60 ms each) spaced 12/22/34 ms, band-passed at 1.2 kHz.
- **cowbell**: dual square wave at 800 + 540 Hz, 300 ms decay.
- **rim**: very short hi-hat (20 ms decay).

## Consequences

- **Zero asset bytes for sound.** No `.wav` or `.mp3` round-trip, no licensing, no CDN.
- **The kick and snare sound 80s/90s drum-machine-y**, not real-acoustic. For "everyone in a group taps their phone" the synthesized aesthetic actually reads better — there's no expectation of realism.
- **Every phone produces the same sound from the same `slot` value**, since the synthesis is deterministic and shipped in the same JS.
- **No 808 envy.** This is not the right project for high-end drum synthesis.

## Alternatives considered

- **Ship samples.** Rejected — bundle size, licensing, no actual quality win for this use case.
- **External sample CDN.** Rejected — adds runtime network dependency on a third-party domain; first tap stalls until the buffer downloads.
