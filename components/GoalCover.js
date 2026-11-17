"use client";
import { Plane, Sun, Mountain, Heart, PartyPopper, Home, Car, Ship, Baby, GraduationCap, Laptop, PawPrint, Gift, Star } from "lucide-react";
import { coverByKey, guessCover, coverPhotoUrl } from "@/lib/goalCovers";

const ICONS = { Plane, Sun, Mountain, Heart, PartyPopper, Home, Car, Ship, Baby, GraduationCap, Laptop, PawPrint, Gift, Star };

// A goal's picture: their uploaded photo if there is one, otherwise the chosen
// built-in cover (or one guessed from the category name).
export default function GoalCover({ label, cover, photoUrl, width = "100%", height = 120, radius = 14, iconSize }) {
  const base = { width, height, borderRadius: radius, flex: "none", overflow: "hidden", position: "relative" };
  if (photoUrl) {
    return <div style={{ ...base, backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />;
  }
  const c = coverByKey(cover || guessCover(label));
  const Icon = ICONS[c.icon] || Star;
  const w = typeof width === "number" ? Math.max(120, width * 2) : 900;
  const h = typeof height === "number" ? Math.max(120, height * 2) : 600;
  const photo = coverPhotoUrl(c, Math.min(1200, w), Math.min(800, h));
  if (photo) {
    return <div style={{ ...base, background: `url(${photo}) center / cover no-repeat, linear-gradient(135deg, ${c.from}, ${c.to})` }} />;
  }
  const size = iconSize || Math.max(20, Math.round((typeof height === "number" ? height : 80) * 0.4));
  return (
    <div style={{ ...base, background: `linear-gradient(135deg, ${c.from}, ${c.to})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={size} color="#fff" strokeWidth={1.8} />
    </div>
  );
}
