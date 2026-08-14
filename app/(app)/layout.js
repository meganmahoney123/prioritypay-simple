import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabaseServer";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
