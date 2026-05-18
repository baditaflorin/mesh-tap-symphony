import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { TapSymphony } from "./features/tapsymphony/TapSymphony";
import { ALL_SLOTS, type Slot } from "./features/tapsymphony/drums";
import { SettingsExtras } from "./features/settings/SettingsExtras";
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

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.slot, slot);
  }, [slot]);

  return (
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={<SettingsExtras slot={slot} onSlotChange={setSlot} />}
    >
      <TapSymphony roomId={roomId} slot={slot} />
    </MeshShell>
  );
}
