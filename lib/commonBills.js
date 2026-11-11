// Payments that come around once or twice a year, or every quarter, and are
// easy to miss because they don't show up in a short bank history. Picking
// one fills in the add form; the person adds the amount and the date.
export const COMMON_BILLS = [
  { name: "Car insurance", frequency: "semiannual" },
  { name: "Quarterly estimated taxes", frequency: "quarterly" },
  { name: "Vehicle registration", frequency: "yearly" },
  { name: "Amazon Prime", frequency: "yearly" },
  { name: "Domain renewals", frequency: "yearly" },
  { name: "Property tax", frequency: "semiannual" },
  { name: "HOA dues", frequency: "quarterly" },
  { name: "Renters or home insurance", frequency: "yearly" },
  { name: "Professional license or dues", frequency: "yearly" },
  { name: "Annual software plan", frequency: "yearly" },
  { name: "Pet vet visit or insurance", frequency: "yearly" },
  { name: "Gym membership", frequency: "yearly" },
];
