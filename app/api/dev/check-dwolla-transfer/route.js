import { requireUser, unauthorized } from "@/lib/apiAuth";
import { dwollaClient, dwollaApiBase } from "@/lib/dwolla";

// TEMP QA-ONLY ENDPOINT. Delete after QA.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { transferId } = await request.json();
  try {
    const res = await dwollaClient().get(`${dwollaApiBase()}/transfers/${transferId}`);
    return Response.json({ ok: true, transfer: res.body });
  } catch (err) {
    return Response.json({ ok: false, detail: err?.body || err?.message || String(err) }, { status: 200 });
  }
}
