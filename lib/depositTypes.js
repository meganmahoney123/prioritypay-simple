import { isEmployerRetirementRow, isW2NoSideHustle, isW2WithSideHustle, PERSONA_BUSINESS_OWNER } from "@/lib/allocations";
import { paysByDraw, parseEntities, SOLE_PROP, isUnsure } from "@/lib/entityCopy";

// What kind of money a deposit is. The type decides which split rows apply to
// that one deposit: Tax Reserve is only for self-employed income, and
// retirement rows are routed to the right kind of account (workplace vs
// self-employed) or skipped entirely.

export const DEPOSIT_TYPES = {
  self_employed: "Self-employed income",
  owner_draw: "Owner's draw",
  w2: "W-2 paycheck",
  misc: "Miscellaneous",
  retirement_income: "Retirement income (pension, Social Security, withdrawals)",
};

export function isDepositType(v) {
  return Object.prototype.hasOwnProperty.call(DEPOSIT_TYPES, v);
}

// Same payroll wording the monthly close-out uses to spot paychecks.
const PAYROLL_NAME_PATTERN = /\b(payroll|direct ?dep(osit)?|salary|bi-?weekly pay|adp|gusto|paychex|justworks|rippling|paylocity|workday|tri ?net|insperity)\b/i;

export function parseWorkPicks(profile) {
  const raw = profile?.work_picks;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// Which work situations apply to this person. Newer accounts saved their
// exact onboarding picks; older ones are read from the persona.
function situation(profile) {
  const persona = profile?.persona;
  const picks = parseWorkPicks(profile);
  const entity = profile?.entity_type;
  if (picks) {
    const runs = picks.includes("self_employed") || picks.includes("owns_business");
    return {
      self: runs,
      draw: picks.includes("owns_business") || (runs && paysByDraw(entity)),
      w2: picks.includes("w2"),
      retired: picks.includes("retired"),
    };
  }
  const w2 = isW2NoSideHustle(persona) || isW2WithSideHustle(persona);
  const runs = !isW2NoSideHustle(persona);
  return { self: runs, draw: runs && (persona === PERSONA_BUSINESS_OWNER || paysByDraw(entity)), w2, retired: false };
}

// Dropdown choices for this person, in display order.
export function typeOptionsFor(profile) {
  const s = situation(profile);
  const out = [];
  if (s.self) out.push("self_employed");
  if (s.draw) out.push("owner_draw");
  if (s.w2) out.push("w2");
  if (s.retired) out.push("retirement_income");
  out.push("misc");
  return out;
}

// Best first guess for a deposit, before the person changes it.
export function guessDepositType({ profile, name, pfcDetailed }) {
  const options = typeOptionsFor(profile);
  const s = situation(profile);
  const looksLikePay = pfcDetailed === "INCOME_WAGES" || PAYROLL_NAME_PATTERN.test(String(name || ""));
  if (looksLikePay && options.includes("w2")) return "w2";
  if (pfcDetailed === "INCOME_RETIREMENT_PENSION" && options.includes("retirement_income")) return "retirement_income";
  if (options.includes("self_employed") && options.includes("owner_draw")) {
    const entities = parseEntities(profile?.entity_type);
    const drawOnly = paysByDraw(profile?.entity_type) && !entities.includes(SOLE_PROP) && !isUnsure(profile?.entity_type);
    return drawOnly ? "owner_draw" : "self_employed";
  }
  if (options.includes("owner_draw")) return "owner_draw";
  if (options.includes("self_employed")) return "self_employed";
  if (s.w2) return "w2";
  if (s.retired) return "retirement_income";
  return "misc";
}

function isTaxReserve(rule) {
  return rule?.label === "Tax Reserve";
}

// "work" = a workplace account (401k, IRA, HSA); "self" = a self-employed
// retirement account (Solo 401k, SEP IRA, anything else the person entered).
export function retirementKind(rule) {
  if (!rule?.retirementType) return null;
  return isEmployerRetirementRow(rule) ? "work" : "self";
}

// Returns a copy of the percent rows with the rows that don't apply to this
// deposit type set to 0%. The share they would have taken simply stays in the
// deposit account.
export function applyDepositType(percentRules, type) {
  return (percentRules || []).map((r) => {
    const kind = retirementKind(r);
    let keep = true;
    if (isTaxReserve(r)) keep = type === "self_employed";
    else if (kind === "work") keep = type === "w2";
    else if (kind === "self") keep = type === "self_employed" || type === "owner_draw";
    return keep ? r : { ...r, pct: 0 };
  });
}

// What a type does to one deposit, from the person's own rows:
// { lead, tone, rest } -- a bold lead phrase ("Full split", "Tax Reserve 0%")
// followed by plain text.
export function effectLine(type, percentRules) {
  const rows = (percentRules || []).filter((r) => Number(r.pct) > 0);
  const names = (kind) => rows.filter((r) => retirementKind(r) === kind).map((r) => r.label);
  const list = (arr) => (arr.length <= 1 ? arr[0] : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`);
  const hasTax = rows.some(isTaxReserve);
  const pct = (n) => `${Math.round(Number(n) * 100) / 100}%`;
  if (type === "self_employed") {
    const kept = applyDepositType(rows, type).filter((r) => Number(r.pct) > 0).sort((a, b) => Number(b.pct) - Number(a.pct)).slice(0, 3);
    return { lead: "Full split", tone: "accent", rest: kept.length ? `: ${kept.map((r) => `${r.label} ${pct(r.pct)}`).join(", ")}` : "" };
  }
  const tax = hasTax ? "Tax Reserve 0%" : null;
  const lead = tax || (type === "w2" ? "Workplace retirement only" : "No Tax Reserve");
  const tone = tax ? "green" : "accent";
  if (type === "owner_draw") {
    const self = names("self");
    return { lead, tone, rest: self.length ? `. Retirement goes to your ${list(self)} only` : ". No self-employed retirement account set up yet" };
  }
  if (type === "w2") {
    const work = names("work");
    const note = hasTax ? " (taxes already withheld)" : "";
    return { lead, tone, rest: `${note}${hasTax ? ". " : ": "}${work.length ? `Retirement goes to your ${list(work)} only` : "no workplace retirement account added yet"}` };
  }
  return { lead, tone, rest: `${hasTax ? ". " : ": "}No retirement contribution` };
}
