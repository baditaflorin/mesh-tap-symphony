import { useEffect, useState } from "react";
import { TapSymphony } from "./features/tapsymphony/TapSymphony";
import { ALL_SLOTS, type Slot } from "./features/tapsymphony/drums";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  slot: `${appConfig.storagePrefix}:slot`,
};

export function App() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE.room) ?? "default");
  const [slot, setSlot] = useState<Slot>(() => {
    const v = localStorage.getItem(STORAGE.slot);
    return ALL_SLOTS.includes(v as Slot) ? (v as Slot) : "kick";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.slot, slot);
  }, [slot]);

  return (
    <div className="app-root">
      <TapSymphony roomId={roomId} slot={slot} />

      <button
        type="button"
        className="settings-fab"
        onClick={(e) => {
          e.stopPropagation();
          setSettingsOpen(true);
        }}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        slot={slot}
        onSlotChange={setSlot}
      />
    </div>
  );
}
