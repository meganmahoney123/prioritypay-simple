import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { kindByKey } from "@/lib/goalTemplates";

// The planner behind a savings goal: groups of items with amounts, links,
// notes, a picture and a status. One route, one `action` per change.
const STATUS = new Set(["idea", "booked", "paid"]);

function badHost(host) {
  const h = host.toLowerCase();
  return h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.startsWith("[") || !h.includes(".");
}

// Reads a page's public title, picture and price so a pasted link can fill an item.
async function readLink(raw) {
  let u;
  try { u = new URL(raw); } catch { return { error: "That doesn't look like a link." }; }
  if (!/^https?:$/.test(u.protocol) || badHost(u.hostname)) return { error: "That link can't be read." };
  try {
    const res = await fetch(u.toString(), { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (compatible; PrioritySaveBot/1.0)", Accept: "text/html" } });
    if (!res.ok) return { link: u.toString(), partial: true };
    const html = (await res.text()).slice(0, 400000);
    const meta = (prop) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
      const m = html.match(re);
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
    const title = decode(meta("og:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "").slice(0, 140);
    let image = meta("og:image");
    if (image) { try { image = new URL(image, u).toString(); } catch { image = ""; } }
    let price = Number(meta("product:price:amount") || meta("og:price:amount") || 0) || 0;
    if (!price) {
      const m = html.match(/"price"\s*:\s*"?(\d[\d,]*\.?\d*)"?/);
      if (m) price = Number(m[1].replace(/,/g, "")) || 0;
    }
    return { link: u.toString(), title, image, price: price > 0 && price < 10000000 ? price : 0 };
  } catch {
    return { link: u.toString(), partial: true };
  }
}

async function load(admin, userId, label) {
  const [{ data: groups }, { data: items }] = await Promise.all([
    admin.from("simple_goal_groups").select("*").eq("user_id", userId).eq("label", label).order("sort").order("created_at"),
    admin.from("simple_goal_items").select("*").eq("user_id", userId).eq("label", label).order("sort").order("created_at"),
  ]);
  return {
    groups: (groups || []).map((g) => ({ id: g.id, name: g.name })),
    items: (items || []).map((i) => ({ id: i.id, groupId: i.group_id, name: i.name, amount: Number(i.amount) || 0, status: i.status, link: i.link || "", note: i.note || "", photoUrl: i.photo_url || "" })),
  };
}

export async function GET(req) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const label = new URL(req.url).searchParams.get("label");
  if (!label) return Response.json({ error: "label required" }, { status: 400 });
  const admin = supabaseAdmin();
  const out = await load(admin, user.id, label);
  return Response.json(out);
}

export async function POST(req) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const { action, label } = body;
  const admin = supabaseAdmin();
  if (action === "readLink") return Response.json(await readLink(String(body.url || "")));
  if (!label) return Response.json({ error: "label required" }, { status: 400 });
  const uid = user.id;
  const own = { user_id: uid, label };
  let err = null;

  if (action === "applyTemplate") {
    const kind = kindByKey(body.kind);
    if (!kind) return Response.json({ error: "Unknown template." }, { status: 400 });
    const { count } = await admin.from("simple_goal_groups").select("id", { count: "exact", head: true }).match(own);
    if (!count) {
      let gi = 0;
      for (const g of kind.groups) {
        const { data: row, error } = await admin.from("simple_goal_groups").insert({ ...own, name: g.name, sort: gi++ }).select("id").single();
        if (error) { err = error; break; }
        if (g.items.length) {
          const rows = g.items.map((n, i) => ({ ...own, group_id: row.id, name: n, sort: i }));
          const r = await admin.from("simple_goal_items").insert(rows);
          if (r.error) { err = r.error; break; }
        }
      }
    }
    if (!err) await admin.from("simple_goals").upsert({ user_id: uid, label, kind: kind.key }, { onConflict: "user_id,label" });
  } else if (action === "addGroup") {
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "Give the category a name." }, { status: 400 });
    const { count } = await admin.from("simple_goal_groups").select("id", { count: "exact", head: true }).match(own);
    err = (await admin.from("simple_goal_groups").insert({ ...own, name, sort: count || 0 })).error;
  } else if (action === "renameGroup") {
    const name = String(body.name || "").trim().slice(0, 80);
    if (name) err = (await admin.from("simple_goal_groups").update({ name }).eq("id", body.id).match(own)).error;
  } else if (action === "deleteGroup") {
    err = (await admin.from("simple_goal_groups").delete().eq("id", body.id).match(own)).error;
  } else if (action === "addItem") {
    const { data: g } = await admin.from("simple_goal_groups").select("id").eq("id", body.groupId).match(own).maybeSingle();
    if (!g) return Response.json({ error: "Category not found." }, { status: 404 });
    const { count } = await admin.from("simple_goal_items").select("id", { count: "exact", head: true }).eq("group_id", g.id);
    const amt = Number(body.amount);
    err = (await admin.from("simple_goal_items").insert({
      ...own, group_id: g.id, name: String(body.name || "New item").trim().slice(0, 140) || "New item",
      amount: amt > 0 ? amt : 0, link: body.link ? String(body.link).slice(0, 1000) : null,
      photo_url: body.photoUrl ? String(body.photoUrl).slice(0, 1000) : null, sort: count || 0,
    })).error;
  } else if (action === "updateItem") {
    const patch = {};
    if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 140) || "Item";
    if (body.amount !== undefined) patch.amount = Math.max(0, Number(body.amount) || 0);
    if (typeof body.status === "string" && STATUS.has(body.status)) patch.status = body.status;
    if (typeof body.link === "string") patch.link = body.link.slice(0, 1000) || null;
    if (typeof body.note === "string") patch.note = body.note.slice(0, 2000) || null;
    if (typeof body.photoUrl === "string") patch.photo_url = body.photoUrl.slice(0, 1000) || null;
    if (Object.keys(patch).length) err = (await admin.from("simple_goal_items").update(patch).eq("id", body.id).match(own)).error;
  } else if (action === "deleteItem") {
    err = (await admin.from("simple_goal_items").delete().eq("id", body.id).match(own)).error;
  } else {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  if (err) {
    const missing = /relation .* does not exist|schema cache/i.test(err.message || "");
    return Response.json({ error: missing ? "The planner tables haven't been created yet." : err.message }, { status: 500 });
  }
  return Response.json(await load(admin, uid, label));
}
