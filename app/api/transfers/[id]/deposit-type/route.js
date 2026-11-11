import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { recomputeTransferStatus } from "@/lib/depositChecklist";
import { planSplit, buildAllocationRows } from "@/lib/splitPlan";
import { isDepositType, typeOptionsFor } from "@/lib/depositTypes";

// Changes what kind of money one deposit is (self-employed income, owner's
// draw, W-2 paycheck, miscellaneous) and re-works that deposit's split with
// the new type: Tax Reserve and retirement rows that don't apply drop to 0%
// and their share stays in the deposit account. Only allowed while none of
// the deposit's lines have been marked as transferred yet.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const type = body?.depositType;
  if (!isDepositType(type)) return Response.json({ error: "Choose a deposit type." }, { status: 400 });

  const { data: transfer } = await admin
    .from("simple_transfers")
    .select("id, source_amount, deposit_name, skipped_at, simple_transfer_allocations(id, status, source_account_id)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transfer) return Response.json({ error: "Deposit not found." }, { status: 404 });
  if (transfer.skipped_at) return Response.json({ error: "Add this deposit back before changing its type." }, { status: 409 });

  const lines = transfer.simple_transfer_allocations || [];
  if (lines.some((l) => !["needs_approval", "reserved"].includes(l.status))) {
    return Response.json(
      { error: "This deposit already has transfers marked as sent, so its type can't change. Undo those first." },
      { status: 409 }
    );
  }
  const sourceAccountId = lines.map((l) => l.source_account_id).find(Boolean);
  if (!sourceAccountId) {
    return Response.json({ error: "This deposit has no account on record to re-split from." }, { status: 409 });
  }

  const { data: profile } = await admin.from("simple_profiles").select("*").eq("id", user.id).single();
  if (!typeOptionsFor(profile).includes(type)) {
    return Response.json({ error: "That type isn't one of your options." }, { status: 400 });
  }

  // Save the type first: if the column doesn't exist yet, nothing else changes.
  const { error: saveError } = await admin.from("simple_transfers").update({ deposit_type: type }).eq("id", id).eq("user_id", user.id);
  if (saveError) {
    const missing = /deposit_type/i.test(saveError.message || "");
    return Response.json(
      { error: missing ? "This needs a one-time database update before it can be saved." : saveError.message },
      { status: 500 }
    );
  }

  const plan = await planSplit({
    admin,
    userId: user.id,
    total: Number(transfer.source_amount),
    sourceAccountId,
    depositType: type,
    depositName: transfer.deposit_name,
    excludeTransferId: id,
  });
  if (plan.error) return Response.json({ error: plan.error }, { status: plan.status || 500 });

  const rows = buildAllocationRows({ plan, transferId: id, sourceAccountId });
  // Insert the new lines before removing the old ones, so a failed insert
  // never leaves a deposit with no lines.
  if (rows.length) {
    const { error: insertError } = await admin.from("simple_transfer_allocations").insert(rows);
    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
  }
  const oldIds = lines.map((l) => l.id);
  if (oldIds.length) {
    const { error: delError } = await admin.from("simple_transfer_allocations").delete().in("id", oldIds);
    if (delError) return Response.json({ error: delError.message }, { status: 500 });
  }
  await recomputeTransferStatus(admin, id);
  return Response.json({ ok: true, depositType: type });
}
