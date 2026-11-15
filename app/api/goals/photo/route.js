import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Uploads a goal picture to the private "goal-photos" bucket and returns its
// storage path (saved on the goal with PUT /api/goals as photoPath).
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return Response.json({ error: "No file provided." }, { status: 400 });
  if (!(file.type || "").startsWith("image/")) return Response.json({ error: "Please choose an image." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "That image is over 8 MB." }, { status: 400 });
  const ext = (file.name || "").split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from("goal-photos").upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  return Response.json({ path });
}
