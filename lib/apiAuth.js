import { getAuthedUser } from "./supabaseServer";

// Every /api route calls this first and checks for null:
//
//   const user = await requireUser();
//   if (!user) return unauthorized();
//
export async function requireUser() {
  return getAuthedUser();
}

export function unauthorized() {
  return Response.json({ error: "Not signed in." }, { status: 401 });
}
