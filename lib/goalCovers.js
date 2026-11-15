// Built-in goal covers: a soft colour plus an icon, so every goal has a picture
// from the start. People can also upload their own photo (see /api/goals/photo).
export const GOAL_COVERS = [
  { key: "travel", label: "Travel", from: "#FFE3B0", to: "#FF9E6B", icon: "Plane" },
  { key: "beach", label: "Beach", from: "#BFE3FF", to: "#6DB8FF", icon: "Sun" },
  { key: "mountain", label: "Outdoors", from: "#C9F0D8", to: "#4FB58A", icon: "Mountain" },
  { key: "wedding", label: "Wedding", from: "#FFD9E8", to: "#B98CFF", icon: "Heart" },
  { key: "party", label: "Party", from: "#FFE0F0", to: "#FF9EC0", icon: "PartyPopper" },
  { key: "home", label: "Home", from: "#C9F0D8", to: "#5BC2A0", icon: "Home" },
  { key: "car", label: "Car", from: "#BFE3FF", to: "#6D8CFF", icon: "Car" },
  { key: "boat", label: "Boat", from: "#BFEFF5", to: "#4BAFC9", icon: "Ship" },
  { key: "baby", label: "Baby", from: "#FFF1C9", to: "#F5C451", icon: "Baby" },
  { key: "school", label: "School", from: "#E1D4FF", to: "#9A72F0", icon: "GraduationCap" },
  { key: "tech", label: "Tech", from: "#E3E6F5", to: "#8A93C9", icon: "Laptop" },
  { key: "pet", label: "Pet", from: "#FFE3B0", to: "#E3A700", icon: "PawPrint" },
  { key: "gift", label: "Gift", from: "#FFD9E8", to: "#FF8FB3", icon: "Gift" },
  { key: "other", label: "Something else", from: "#E1D4FF", to: "#B98CFF", icon: "Star" },
];

export function coverByKey(key) {
  return GOAL_COVERS.find((c) => c.key === key) || GOAL_COVERS[GOAL_COVERS.length - 1];
}

// Pick a sensible starting cover from the category's name.
export function guessCover(label = "") {
  const l = label.toLowerCase();
  const rules = [
    [/wedding|bride|honeymoon/, "wedding"],
    [/trip|travel|vacation|holiday|flight|italy|europe/, "travel"],
    [/beach|cruise/, "beach"],
    [/car|truck|vehicle|auto/, "car"],
    [/boat|yacht/, "boat"],
    [/home|house|condo|down payment|remodel|build/, "home"],
    [/baby|nursery/, "baby"],
    [/school|college|tuition|education/, "school"],
    [/laptop|computer|phone|tech/, "tech"],
    [/dog|cat|pet|horse|vet/, "pet"],
    [/party|birthday|event/, "party"],
    [/gift|holiday/, "gift"],
  ];
  for (const [re, key] of rules) if (re.test(l)) return key;
  return "other";
}
