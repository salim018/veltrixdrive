import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ResultClient } from "./ResultClient";
import type { AnalysisResult } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  searchParams
}: {
  searchParams: { id?: string };
}) {
  const { user, credits } = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  let preload: AnalysisResult | null = null;
  if (searchParams.id) {
    const supabase = createClient();
    const { data } = await supabase
      .from("analyses")
      .select("result")
      .eq("id", searchParams.id)
      .eq("user_id", user.id)
      .single();
    preload = (data?.result as AnalysisResult) ?? null;
  }

  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-10 md:py-14">
        <ResultClient preload={preload} preloadId={searchParams.id ?? null} />
      </main>
      <Footer />
    </>
  );
}
