// Best guess at what a charge is for, from the company name, Plaid's category
// and how often and how much it is. Only returns a label when it adds
// something the company name does not (insurance, taxes, utilities, loans and
// the like). A label is always a tentative suggestion the person can edit.
const NAME_RULES = [
  [/lemonade|hippo ins|assurant|homeowners ins|renters ins|home ins/i, "Renters or home insurance"],
  [/geico|progressive|state farm|allstate|farmers ins|liberty mutual|usaa|nationwide|travelers|esurance|mercury ins|safeco|auto ins|car ins/i, "Car insurance"],
  [/trupanion|healthy paws|pet insur/i, "Pet insurance"],
  [/veterinar|animal hospital|\bvet\b/i, "Pet care"],
  [/\birs\b|usataxpymt|eftps|us treas|dept of revenue|department of revenue|franchise tax/i, "Taxes"],
  [/\bdmv\b|\bmvd\b|motor vehicle|service arizona|license plate/i, "Vehicle registration"],
  [/treasurer|assessor|property tax|tax collector|county tax/i, "Property tax"],
  [/\bhoa\b|homeowners assoc|community assoc/i, "HOA dues"],
  [/godaddy|namecheap|google domains|squarespace domains|network solutions|hover\.com|\bdomain/i, "Domain renewals"],
  [/amazon prime|prime membership|amzn prime/i, "Amazon Prime"],
  [/gym|fitness|ymca|equinox|orangetheory|crunch/i, "Gym membership"],
  [/bar assoc|license renewal|annual dues|\bdues\b/i, "Professional license or dues"],
];

const CATEGORY_LABELS = {
  RENT_AND_UTILITIES_RENT: "Rent",
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: "Electric or gas",
  RENT_AND_UTILITIES_WATER: "Water",
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: "Trash or sewer",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "Internet or cable",
  RENT_AND_UTILITIES_TELEPHONE: "Phone",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "Mortgage",
  LOAN_PAYMENTS_CAR_PAYMENT: "Car payment",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "Student loan",
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: "Personal loan",
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: "Taxes",
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: "Gym membership",
};

export function guessLabel({ name, detailed, amount, frequency }) {
  const text = String(name || "");
  for (const [re, label] of NAME_RULES) if (re.test(text)) return label;
  if (CATEGORY_LABELS[detailed]) return CATEGORY_LABELS[detailed];
  if (detailed === "GENERAL_SERVICES_INSURANCE") {
    // Which kind of insurance is a guess: car policies usually bill twice a year or monthly for more; renters policies are small or yearly.
    const amt = Number(amount) || 0;
    if (frequency === "semiannual" || frequency === "quarterly") return "Car insurance";
    if (frequency === "yearly") return "Renters or home insurance";
    return amt <= 40 ? "Renters or home insurance" : "Car insurance";
  }
  return null;
}

// "Car insurance (GEICO)" when we guessed, otherwise just the company name.
export function labeledName(merchant, guess) {
  const m = String(merchant || "").trim();
  if (!guess) return m;
  if (m.toLowerCase().includes(guess.toLowerCase())) return m;
  return `${guess} (${m})`.slice(0, 80);
}

export const GUESS_NOTE = "Name is our best guess";
