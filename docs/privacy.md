# Privacy threat model — mesh-tap-symphony

## What other peers in the same room can see

- Every tap, as `{ slot, dt: ms-into-30s-loop, id: uuid }` events in a shared Yjs Array.
- Clock-sync timestamps (`Date.now()`).
- Yjs awareness `clientID` — per-session random integer.

There's no audio on the wire — every phone synthesizes its own drums locally from the metadata.

## What other peers can NOT see

- Your microphone (we never call `getUserMedia`).
- Your location.
- Anything beyond your taps inside this room.

## What stays local

- Drum slot choice (you pick which drum your phone is).
- The audio output itself.

## What the signaling server sees

The room name and encrypted SDP offers/answers.

## What the TURN server sees

Encrypted DTLS/SRTP bytes if peers can't connect directly.
