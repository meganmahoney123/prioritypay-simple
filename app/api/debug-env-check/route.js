export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = url.replace("https://", "").split(".")[0];
  return Response.json({ projectRef: ref });
}
