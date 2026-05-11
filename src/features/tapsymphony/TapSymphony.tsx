import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { ALL_SLOTS, SLOT_INFO, playDrum, type Slot } from "./drums";

const LOOP_MS = 30000;

type TapEvent = { slot: Slot; dt: number; id: string };

type Props = {
  roomId: string;
  slot: Slot;
};

export function TapSymphony({ roomId, slot }: Props) {
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState(0);
  const [taps, setTaps] = useState<TapEvent[]>([]);
  const [peers, setPeers] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playedRef = useRef(new Set<string>());

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    const events = room.doc.getArray<TapEvent>("taps");
    return { room, clock, events };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.clock.destroy();
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // Mirror Yjs Y.Array → local state
  useEffect(() => {
    if (!mesh) return undefined;
    const update = () => setTaps(mesh.events.toArray());
    mesh.events.observe(update);
    update();
    return () => mesh.events.unobserve(update);
  }, [mesh]);

  // Playback loop
  useEffect(() => {
    if (!mesh) return undefined;
    let frame = 0;
    const tick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const t = mesh.clock.meshNow();
      const loopT = ((t % LOOP_MS) + LOOP_MS) % LOOP_MS;
      setPhase(loopT / LOOP_MS);
      const loopId = Math.floor(t / LOOP_MS);
      // Detect events whose dt is just about to be crossed
      const lookahead = 60; // ms
      for (const ev of taps) {
        const evKey = `${loopId}:${ev.id}`;
        if (playedRef.current.has(evKey)) continue;
        const ahead = ev.dt - loopT;
        if (ahead >= -10 && ahead <= lookahead) {
          playedRef.current.add(evKey);
          playDrum(ctx, ev.slot, ctx.currentTime + Math.max(0, ahead / 1000));
        }
      }
      // Garbage-collect played set on loop boundary
      if (loopT < 100) {
        playedRef.current = new Set(
          [...playedRef.current].filter((k) => k.startsWith(`${loopId}:`)),
        );
      }
      setPeers(mesh.clock.peerCount());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mesh, taps]);

  const onTap = () => {
    if (!mesh || !audioCtxRef.current) return;
    const t = mesh.clock.meshNow();
    const dt = ((t % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const ev: TapEvent = { slot, dt, id: crypto.randomUUID() };
    mesh.events.push([ev]);
    playDrum(audioCtxRef.current, slot, audioCtxRef.current.currentTime);
    // Immediately mark as played in current loop
    const loopId = Math.floor(t / LOOP_MS);
    playedRef.current.add(`${loopId}:${ev.id}`);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const onClear = () => {
    if (!mesh) return;
    mesh.events.delete(0, mesh.events.length);
  };

  if (!armed) {
    return (
      <div className="tap-arm">
        <h1>mesh-tap-symphony</h1>
        <p>
          Each phone is one drum sound. Tap the screen to play your sound. Every tap is recorded
          into a 30-second loop that replays on every phone, in mesh-time sync. The group has
          accidentally composed a beat together.
        </p>
        <p className="tap-meta">
          Your drum:{" "}
          <strong style={{ color: SLOT_INFO[slot].color }}>
            {SLOT_INFO[slot].emoji} {SLOT_INFO[slot].label}
          </strong>
        </p>
        <button
          type="button"
          className="tap-arm-button"
          onClick={() => {
            audioCtxRef.current ??= new AudioContext();
            void audioCtxRef.current.resume();
            setArmed(true);
          }}
        >
          Join the band
        </button>
        <p className="tap-hint">Pick a different drum per phone in Settings.</p>
      </div>
    );
  }

  const ownTaps = taps.filter((t) => t.slot === slot);
  const otherTaps = taps.filter((t) => t.slot !== slot);

  return (
    <div
      className="tap-stage"
      onClick={onTap}
      style={{ "--accent": SLOT_INFO[slot].color } as React.CSSProperties}
    >
      <div className="tap-hud">
        {peers + 1} phones · {taps.length} taps in loop
      </div>

      <div className="tap-loop">
        <div className="tap-loop-track">
          {otherTaps.map((t) => (
            <div
              key={t.id}
              className="tap-loop-mark tap-loop-other"
              style={{
                left: `${(t.dt / LOOP_MS) * 100}%`,
                background: SLOT_INFO[t.slot].color,
              }}
            />
          ))}
          {ownTaps.map((t) => (
            <div
              key={t.id}
              className="tap-loop-mark tap-loop-own"
              style={{ left: `${(t.dt / LOOP_MS) * 100}%` }}
            />
          ))}
          <div className="tap-loop-playhead" style={{ left: `${phase * 100}%` }} />
        </div>
      </div>

      <div className="tap-target">
        <div className="tap-target-circle">
          <span>{SLOT_INFO[slot].emoji}</span>
        </div>
        <p className="tap-target-label">tap anywhere to play {SLOT_INFO[slot].label}</p>
      </div>

      <button
        type="button"
        className="tap-clear"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      >
        Clear loop
      </button>
    </div>
  );
}

export { ALL_SLOTS, SLOT_INFO };
export type { Slot };
