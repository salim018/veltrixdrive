import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LandingContent } from "./LandingContent";

export default async function HomePage() {
  const { user, credits } = await getSessionUser();

  return (
    <>
      <Header user={user} credits={credits} />
      <LandingContent isAuthed={!!user} />
      <Footer />
    </>
  );
}
