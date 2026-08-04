import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as Y from "yjs";
import { TapSymphony } from "../../src/features/tapsymphony/TapSymphony";

/**
 * Regression coverage for a crash that reproduced live: the `taps` Y.Array
 * is a shared CRDT, so any peer (malicious, buggy, or a stale/forked
 * client) can push arbitrary values into it. Before the fix, TapSymphony
 * rendered every entry unvalidated — `SLOT_INFO[t.slot].color` on an
 * unknown `slot` threw a TypeError that unmounted the whole tree (no error
 * boundary), white-screening every peer in the room, including anyone who
 * joins later since the bad entry stays in the shared doc.
 *
 * `events.push(...)` is wrapped in `act()` so the resulting Yjs observer →
 * `setTaps` → render happens synchronously, the same way it would happen
 * when a real WebRTC update lands — without that, the assertion below the
 * push would race the render and could pass even against the old, broken
 * component.
 */

let sharedDoc: Y.Doc;

vi.mock("../../src/features/sync/yjsRoom", () => ({
  createRoomSync: () => ({
    doc: sharedDoc,
    provider: null,
    signalingUrl: "",
    peerId: "test-peer",
  }),
}));

vi.mock("../../src/features/sync/clockSync", () => ({
  createClockSync: () => ({
    meshNow: () => Date.now(),
    destroy: () => undefined,
    peerCount: () => 0,
  }),
}));

vi.mock("../../src/features/sync/iceConfig", () => ({
  maybeFetchTurnCredentials: async () => undefined,
}));

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  resume() {
    return Promise.resolve();
  }
}

beforeEach(() => {
  sharedDoc = new Y.Doc();
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  cleanup();
  sharedDoc.destroy();
});

async function joinBand() {
  render(<TapSymphony roomId="test-room" slot="kick" />);
  fireEvent.click(screen.getByRole("button", { name: /join the band/i }));
  // The tap stage only appears once `armed` flips true.
  await screen.findByText(/tap anywhere to play kick/i);
}

describe("TapSymphony — malformed shared-array entries", () => {
  it("does not crash when a peer pushes an entry with an unknown slot", async () => {
    await joinBand();

    const events = sharedDoc.getArray<unknown>("taps");
    act(() => {
      events.push([{ slot: "definitely-not-a-drum", dt: 1000, id: "bad-1" }]);
    });

    // This is exactly what threw before the fix
    // (SLOT_INFO[t.slot].color on an unknown slot), unmounting the tree.
    expect(screen.getByText(/tap anywhere to play kick/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear loop/i })).toBeInTheDocument();
  });

  it("drops entries with non-finite/out-of-range dt or a missing id", async () => {
    await joinBand();

    const events = sharedDoc.getArray<unknown>("taps");
    act(() => {
      events.push([
        { slot: "snare", dt: Number.NaN, id: "bad-2" },
        { slot: "snare", dt: -5, id: "bad-3" },
        { slot: "snare", dt: 999999, id: "bad-4" },
        { slot: "snare", dt: 500 }, // missing id
        "not even an object",
        null,
      ]);
    });

    expect(screen.getByText(/0 taps in loop/i)).toBeInTheDocument();
  });

  it("still renders a valid tap from another peer as an 'other' mark", async () => {
    await joinBand();

    const events = sharedDoc.getArray<unknown>("taps");
    act(() => {
      events.push([{ slot: "snare", dt: 500, id: "good-1" }]);
    });

    expect(screen.getByText(/1 taps in loop/i)).toBeInTheDocument();
    expect(document.querySelector(".tap-loop-other")).not.toBeNull();
  });
});
