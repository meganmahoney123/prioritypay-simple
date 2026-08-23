import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabaseServer";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  // Drives the "Sandbox mode" badge in AppShell -- reads the real PLAID_ENV
  // server-side (never exposed to the client otherwise) so the badge only
  // shows when we're actually pointed at Plaid Sandbox, instead of being
  // permanently on regardless of environment.
  const isSandbox = (process.env.PLAID_ENV || "sandbox") !== "production";
  return <AppShell isSandbox={isSandbox}>{children}</AppShell>;
}
