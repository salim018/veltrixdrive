import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HistoryList } from "./HistoryList";
import type { HistoryItem } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { user, credits } = await getSessionUser();
  if (!user) redirect("/login?next=/history");

  const supabase = createClient();
  const { data } = await supabase
    .from("analyses")
    .select("id, created_at, input_type, input_value, language, result")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (data ?? []) as HistoryItem[];

  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-10 md:py-14">
        <HistoryList items={items} />
      </main>
      <Footer />
    </>
  );
}
