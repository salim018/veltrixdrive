import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Cookie Policy — VeltrixDrive" };

export default async function CookiesPage() {
  const { user, credits } = await getSessionUser();

  return (
    <>
      <Header user={user} credits={credits} />
      <LegalLayout title="Cookie Policy" lastUpdated="April 2026">
        <h2>1. What are cookies?</h2>
        <p>
          Cookies are small text files placed on your device when you visit a
          website. VeltrixDrive also uses similar technologies such as
          localStorage and sessionStorage for the same purposes.
        </p>

        <h2>2. Categories we use</h2>

        <h3>Strictly necessary</h3>
        <p>
          Required to run the Service — for example, to keep you logged in and
          remember your cookie choice. These cannot be switched off.
        </p>
        <ul>
          <li><strong>Supabase auth cookies</strong> — session management.</li>
          <li><strong>veltrixdrive.cookieConsent</strong> — stores your consent choice.</li>
          <li><strong>veltrixdrive.locale</strong> — stores your preferred language.</li>
          <li><strong>veltrixdrive.lastResult</strong> (sessionStorage) — caches your latest analysis to load the result page quickly.</li>
        </ul>

        <h3>Analytics (optional)</h3>
        <p>
          If enabled and consented to, helps us understand usage to improve the
          Service. We only set these cookies after you accept the banner.
        </p>

        <h2>3. Managing cookies</h2>
        <p>
          You can change your choice at any time by clearing your browser
          storage for this site, or by adjusting your browser settings. Blocking
          strictly necessary cookies will prevent the Service from functioning
          properly.
        </p>

        <h2>4. More information</h2>
        <p>
          For how we process personal data more broadly, see our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalLayout>
      <Footer />
    </>
  );
}
