import { redirect } from "next/navigation";
import { getAuthedUser, supabaseAdmin } from "@/lib/supabaseServer";

export default async function RootPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin()
    .from("simple_profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
}
