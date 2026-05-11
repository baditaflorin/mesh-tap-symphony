---
status: accepted
date: 2026-05-11
---

# 0002 — Rolling 30-second loop on mesh time

## Context

The loop has to start and end at the same wall-clock instant on every phone, otherwise drum slots drift apart and the "composed beat" effect collapses. There are two natural approaches:

1. **User-triggered loop start** — one phone hits "start" and broadcasts `loopStart = meshNow()`. Other phones derive `dt = meshNow - loopStart`.
2. **Rolling loop anchored to mesh-time-modulo** — `loopT = meshNow() mod LOOP_MS`. No "start" needed; the loop is always running.

## Decision

Go with the **rolling** approach. `LOOP_MS = 30000` (30 seconds).

- Each tap stores `dt = meshNow() mod LOOP_MS` in `Y.Array<TapEvent>`.
- Each phone schedules playback for upcoming taps by comparing `ev.dt` to the current `loopT`.
- A `playedRef` set tracks `loopId:eventId` to avoid double-playing within one cycle. It's pruned at each loop boundary.

## Consequences

- **No state machine.** Joining peers immediately see all taps and start replaying them on the next loop cycle (or mid-cycle for upcoming ones).
- **No "who started it" coordination.** The phone you tap from is irrelevant; the tap is just data.
- **The loop is always running.** No "stop the music" — you `Clear loop` instead, which wipes the `Y.Array`.
- **Caveat.** A phone joining at second 25 sees taps that fire in 5 seconds but might miss taps that fired at second 5 (their playback within the current cycle has already passed). That's fine — the next cycle plays everything.

## Alternatives considered

- **User-triggered start.** Rejected — needs a state machine, "ended" state, who-can-restart UX, and gives users the false impression that "starting at the right moment" matters (it doesn't — the music is what they tap, period).
- **Per-tap absolute timestamps.** Rejected — would require trimming old taps, and a rejoining phone with old timestamps would replay them once at the wrong loop position.
