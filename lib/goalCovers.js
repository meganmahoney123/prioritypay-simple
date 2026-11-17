// Built-in goal covers: a free Unsplash photo (linked from Unsplash with the
// photographer credited) over a soft colour plus an icon fallback. People can also upload their own photo (see /api/goals/photo).
export const GOAL_COVERS = [
  { key: "travel", photo: "photo-1501785888041-af3ef285b470", by: "Pietro De Grandi", pid: "T7K4aEPoGGk", label: "Travel", from: "#FFE3B0", to: "#FF9E6B", icon: "Plane" },
  { key: "beach", photo: "photo-1603477849227-705c424d1d80", by: "Ittemaldiviano", pid: "jmkMl20jNS0", label: "Beach", from: "#BFE3FF", to: "#6DB8FF", icon: "Sun" },
  { key: "mountain", photo: "photo-1551632811-561732d1e306", by: "Toomas Tartes", pid: "Yizrl9N_eDA", label: "Outdoors", from: "#C9F0D8", to: "#4FB58A", icon: "Mountain" },
  { key: "wedding", photo: "photo-1532712938310-34cb3982ef74", by: "Foto Pettine", pid: "IfjHaIoAoqE", label: "Wedding", from: "#FFD9E8", to: "#B98CFF", icon: "Heart" },
  { key: "party", photo: "photo-1513151233558-d860c5398176", by: "Jason Leung", pid: "Xaanw0s0pMk", label: "Party", from: "#FFE0F0", to: "#FF9EC0", icon: "PartyPopper" },
  { key: "home", photo: "photo-1580587771525-78b9dba3b914", by: "Yaroslav Alekseenko", pid: "_TPTXZd9mOo", label: "Home", from: "#C9F0D8", to: "#5BC2A0", icon: "Home" },
  { key: "car", photo: "photo-1568605117036-5fe5e7bab0b7", by: "Erik Mclean", pid: "ZRns2R5azu0", label: "Car", from: "#BFE3FF", to: "#6D8CFF", icon: "Car" },
  { key: "boat", photo: "photo-1563187867-2cd158d07999", by: "Marcelo Cidrack", pid: "7jZNgIuJrCM", label: "Boat", from: "#BFEFF5", to: "#4BAFC9", icon: "Ship" },
  { key: "baby", photo: "photo-1543346242-2b8e41fb91ca", by: "charlesdeluvio", pid: "2vfwTakDTIo", label: "Baby", from: "#FFF1C9", to: "#F5C451", icon: "Baby" },
  { key: "school", photo: "photo-1623461487986-9400110de28e", by: "Albert Vincent Wu", pid: "m7yOJx0ALME", label: "School", from: "#E1D4FF", to: "#9A72F0", icon: "GraduationCap" },
  { key: "tech", photo: "photo-1496181133206-80ce9b88a853", by: "Kari Shea", pid: "1SAnrIxw5OY", label: "Tech", from: "#E3E6F5", to: "#8A93C9", icon: "Laptop" },
  { key: "pet", photo: "photo-1518020382113-a7e8fc38eac9", by: "charlesdeluvio", pid: "K4mSJ7kc0As", label: "Pet", from: "#FFE3B0", to: "#E3A700", icon: "PawPrint" },
  { key: "gift", photo: "photo-1512909006721-3d6018887383", by: "Kira auf der Heide", pid: "IPx7J1n_xUc", label: "Gift", from: "#FFD9E8", to: "#FF8FB3", icon: "Gift" },
  { key: "other", photo: "photo-1514241516423-6c0a5e031aa2", by: "Ravi Sharma", pid: "hNv5s6NEYig", label: "Something else", from: "#E1D4FF", to: "#B98CFF", icon: "Star" },
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

// Sized link to a cover's Unsplash photo.
export function coverPhotoUrl(c, w = 900, h = 600) {
  return c?.photo ? `https://images.unsplash.com/${c.photo}?auto=format&fit=crop&w=${w}&h=${h}&q=75` : null;
}
export function coverCredit(c) {
  return c?.by ? { by: c.by, url: `https://unsplash.com/photos/${c.pid}?utm_source=prioritysave&utm_medium=referral` } : null;
}
