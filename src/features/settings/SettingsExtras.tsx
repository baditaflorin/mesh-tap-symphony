import { ALL_SLOTS, SLOT_INFO, type Slot } from "../tapsymphony/drums";

type Props = {
  slot: Slot;
  onSlotChange: (next: Slot) => void;
};

export function SettingsExtras({ slot, onSlotChange }: Props) {
  return (
    <label>
      <span>This phone's drum</span>
      <select value={slot} onChange={(e) => onSlotChange(e.target.value as Slot)}>
        {ALL_SLOTS.map((s) => (
          <option key={s} value={s}>
            {SLOT_INFO[s].emoji} {SLOT_INFO[s].label}
          </option>
        ))}
      </select>
    </label>
  );
}
