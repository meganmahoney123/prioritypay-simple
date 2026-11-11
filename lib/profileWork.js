import {
  PERSONA_SELF_EMPLOYED,
  PERSONA_BUSINESS_OWNER,
  PERSONA_W2_NO_SIDE_HUSTLE,
  PERSONA_W2_WITH_SIDE_HUSTLE,
} from "@/lib/allocations";
import { parseWorkPicks } from "@/lib/depositTypes";
import { paysByDraw, parseEntities } from "@/lib/entityCopy";

export const WORK_PICK_VALUES = ["self_employed", "owns_business", "w2", "retired", "between"];

export const WORK_OPTIONS = [
  { value: "self_employed", label: "Self Employed", hint: "Freelance, coaching, consulting or other 1099 work" },
  { value: "owns_business", label: "Business Owner/Partner", hint: "You own or co-own an LLC, S-corp, C-corp or partnership" },
  { value: "w2", label: "I have a W-2 job" },
  { value: "retired", label: "Retired" },
  { value: "between", label: "Between jobs or starting something new" },
];

export function runsBusiness(picks) {
  return picks.includes("self_employed") || picks.includes("owns_business");
}

// Same rule onboarding uses: a business with employees wins, then any
// self-employment or business ownership (with a W-2 job on top it is the
// side-hustle persona), then everything else is the plain W-2 setup.
export function personaFromWork(picks, hasEmployees) {
  if (runsBusiness(picks) && hasEmployees) return PERSONA_BUSINESS_OWNER;
  if (runsBusiness(picks)) return picks.includes("w2") ? PERSONA_W2_WITH_SIDE_HUSTLE : PERSONA_SELF_EMPLOYED;
  return PERSONA_W2_NO_SIDE_HUSTLE;
}

// Work picks for an account: the saved ones, or a best guess for accounts that
// finished onboarding before the picks were saved.
export function picksForProfile(profile) {
  const saved = parseWorkPicks(profile);
  if (saved) return saved.filter((v) => WORK_PICK_VALUES.includes(v));
  const persona = profile?.persona;
  if (persona === PERSONA_W2_NO_SIDE_HUSTLE) return ["w2"];
  const biz = paysByDraw(profile?.entity_type) ? "owns_business" : "self_employed";
  if (persona === PERSONA_W2_WITH_SIDE_HUSTLE) return [biz, "w2"];
  return [biz];
}

export function businessesFromEntityType(profile) {
  return parseEntities(profile?.entity_type).map((entityType, i) => ({
    name: i === 0 ? profile?.business_name || "" : "",
    entityType,
  }));
}
