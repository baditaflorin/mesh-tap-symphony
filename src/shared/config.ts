export const appConfig = {
  appName: "mesh-tap-symphony",
  storagePrefix: "mesh-tap-symphony",
  description:
    "Peer-to-peer mesh drum kit. Each phone plays a different drum; tap in sync and the room becomes a loop.",
  accentHex: "#ff5e7a",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-tap-symphony",
  pagesUrl: "https://baditaflorin.github.io/mesh-tap-symphony/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
