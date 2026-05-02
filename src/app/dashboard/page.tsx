import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, credits } = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-10 md:py-16">
        <DashboardClient initialCredits={credits ?? 0} />
      </main>
      <Footer />
    </>
  );
}
