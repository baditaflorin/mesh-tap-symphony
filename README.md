# mesh-tap-symphony

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--tap--symphony-FF5E7A?style=flat-square)](https://baditaflorin.github.io/mesh-tap-symphony/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-tap-symphony?style=flat-square&color=6e6e8a)](https://github.com/baditaflorin/mesh-tap-symphony/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer mesh: each phone is one drum; 30 seconds of taps records a synced loop that replays on every phone.

**Live:** https://baditaflorin.github.io/mesh-tap-symphony/

Each phone is assigned a single drum sound — kick, snare, hi-hat, clap, cowbell, rim. Tap the screen to play your sound. Every tap, from every phone, is appended to a shared 30-second loop. The loop runs on every phone simultaneously, so the group accidentally composes a beat together.

## How it works

1. Yjs over y-webrtc, clock-synced (median offset, ~10–30 ms).
2. The 30-second loop is anchored to mesh time: `loopT = meshNow() % 30000`.
3. Each tap is appended to a shared `Y.Array<{ slot, dt, id }>`, where `dt` is the position inside the 30-second loop in milliseconds.
4. Every phone, every frame, looks at incoming tap events whose `dt` is about to be crossed and schedules them through Web Audio at `currentTime + (dt - loopT)/1000`. Sample-accurate playback locally; mesh-time-synchronized across phones.

The loop is **rolling** — your taps replay every 30 seconds until someone hits **Clear loop**. The track view at the top shows everyone's marks; your own slot's marks are highlighted in your accent color.

## Drums

| Slot    | Synthesis                                     |
| ------- | --------------------------------------------- |
| kick    | sine, 140→40 Hz exponential drop, 0.4 s decay |
| snare   | high-passed white noise, 0.18 s               |
| hi-hat  | high-passed noise, 0.05 s                     |
| clap    | 4 short noise bursts spaced 10 ms             |
| cowbell | dual square wave at 800/540 Hz                |
| rim     | very short hi-hat                             |

All synthesized in Web Audio — no samples, no network, no licensing.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). What's on the wire: per-tap `{ slot, dt: ms-into-loop, id: uuid }`. Plus the usual clock-sync timestamps. No audio is transmitted; every phone synthesizes from the tap metadata.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-tap-symphony.git
cd mesh-tap-symphony
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Rolling 30-second loop on mesh time](docs/adr/0002-rolling-loop.md)
- [0003 — In-browser drum synthesis](docs/adr/0003-drum-synth.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
