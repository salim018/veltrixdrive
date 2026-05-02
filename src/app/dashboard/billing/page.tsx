import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BillingClient } from "./BillingClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing & Credits — VeltrixDrive" };

export default async function BillingPage() {
  const { user, credits } = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/billing");

  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-10 md:py-14">
        <BillingClient credits={credits ?? 0} />
      </main>
      <Footer />
    </>
  );
}
