import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mascot } from "@/components/Mascot";

export default async function NotFound() {
  const { user, credits } = await getSessionUser();
  return (
    <>
      <Header user={user} credits={credits} />
      <main className="container-page py-24 text-center">
        <Mascot size={140} />
        <h1 className="mt-6 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-3 text-ink-500">That road doesn&apos;t lead anywhere.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </main>
      <Footer />
    </>
  );
}
