import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, credits: null as number | null };

  const { data } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? null },
    credits: data?.credits ?? null
  };
}
