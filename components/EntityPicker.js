"use client";

import { ENTITY_OPTIONS, parseEntities, joinEntities, toggleEntity } from "@/lib/entityCopy";
import ChipCheckboxes from "@/components/ChipCheckboxes";

// Select-all-that-apply list of business setups. `value` and `onChange` use
// the joined string that gets saved ("S-corp; C-corp").
export default function EntityPicker({ value, onChange }) {
  const selected = parseEntities(value);
  return <ChipCheckboxes options={ENTITY_OPTIONS} selected={selected} onToggle={(v) => onChange(joinEntities(toggleEntity(selected, v)))} />;
}
