import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams: { next?: string };
}) {
  const { user, credits } = await getSessionUser();
  if (user) redirect(searchParams.next || "/dashboard");

  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-12 md:py-20">
        <Suspense>
          <LoginForm next={searchParams.next || "/dashboard"} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
