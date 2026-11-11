import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { cleanBill } from "../route";

export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { value, error } = cleanBill(body, true);
  if (error) return Response.json({ error }, { status: 400 });
  if (!Object.keys(value).length) return Response.json({ error: "Nothing to update." }, { status: 400 });
  const admin = supabaseAdmin();
  if (value.account_id) {
    const { data: acc } = await admin.from("simple_accounts").select("id").eq("id", value.account_id).eq("user_id", user.id).maybeSingle();
    if (!acc) return Response.json({ error: "That account couldn't be found." }, { status: 404 });
  }
  const { data, error: upErr } = await admin.from("simple_bills").update(value).eq("id", id).eq("user_id", user.id).select().single();
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ bill: data });
}

// Removing a detected payment keeps it as "dismissed" so it isn't found again.
export async function DELETE(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("simple_bills").select("id, source").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  const res = row.source === "detected"
    ? await admin.from("simple_bills").update({ status: "dismissed" }).eq("id", id).eq("user_id", user.id)
    : await admin.from("simple_bills").delete().eq("id", id).eq("user_id", user.id);
  if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
  return Response.json({ ok: true });
}
