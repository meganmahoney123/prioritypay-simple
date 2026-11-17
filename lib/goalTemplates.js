// Starting points for a goal's planner. Each kind is its own template: a few
// groups with the items people usually forget. Amounts start blank.
export const GOAL_KINDS = [
  { key: "purchase", label: "One big purchase", blurb: "A car, a boat, a big piece of tech",
    groups: [
      { name: "The purchase", items: ["Price", "Taxes and fees", "Delivery or setup"] },
      { name: "Extras", items: ["Warranty", "Accessories"] },
      { name: "Costs after buying", items: ["Insurance", "Maintenance"] },
    ] },
  { key: "home_buy", label: "Buying a home", blurb: "Down payment through moving day",
    groups: [
      { name: "Buying", items: ["Down payment", "Closing costs", "Inspection and appraisal"] },
      { name: "Moving in", items: ["Movers", "Furniture", "Repairs and paint"] },
      { name: "Keeping it", items: ["Home insurance", "Property tax set-aside"] },
    ] },
  { key: "home_build", label: "Building a home or remodel", blurb: "Plans, permits, construction, finishes",
    groups: [
      { name: "Plans and permits", items: ["Design and plans", "Permits"] },
      { name: "Construction", items: ["Contractor", "Materials"] },
      { name: "Finishes", items: ["Flooring", "Kitchen", "Fixtures"] },
      { name: "Cushion", items: ["Surprise costs (10% is common)"] },
    ] },
  { key: "trip", label: "A trip or an event", blurb: "Flights, stays, a wedding, a party",
    groups: [
      { name: "Getting there", items: ["Flights"] },
      { name: "Staying", items: ["Hotel or rental"] },
      { name: "Getting around", items: ["Rental car or transit"] },
      { name: "Food and fun", items: ["Dinner reservations", "Sites and tickets"] },
    ] },
  { key: "other", label: "Something else", blurb: "Start simple and add your own",
    groups: [
      { name: "Costs", items: ["Main cost"] },
      { name: "Extras", items: [] },
    ] },
];
export const kindByKey = (k) => GOAL_KINDS.find((x) => x.key === k) || null;
export const GROUP_SUGGESTIONS = {
  trip: ["Getting around", "Gifts and souvenirs", "Travel insurance", "Pet care"],
  home_buy: ["Utilities set-up", "Landscaping"],
  home_build: ["Landscaping", "Appliances"],
  purchase: ["Trade-in", "Financing"],
  other: ["Fees", "Gifts"],
};
export const STATUSES = [
  { key: "idea", label: "Idea" },
  { key: "booked", label: "Booked" },
  { key: "paid", label: "Paid" },
];
