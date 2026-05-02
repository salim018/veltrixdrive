import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Privacy Policy — VeltrixDrive" };

export default async function PrivacyPage() {
  const { user, credits } = await getSessionUser();

  return (
    <>
      <Header user={user} credits={credits} />
      <LegalLayout title="Privacy Policy" lastUpdated="April 2026">
        <h2>1. Who we are</h2>
        <p>
          VeltrixDrive (KVK: 99933098) is the data controller for personal data
          processed through this Service. You can reach us at{" "}
          <a href="mailto:info@bedrijfsnaam.com">info@bedrijfsnaam.com</a>.
        </p>

        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> email address, authentication
            identifiers (Supabase), credit balance, and account creation date.
          </li>
          <li>
            <strong>Analysis inputs:</strong> the car listing URLs or
            descriptions you submit, together with the language selected.
          </li>
          <li>
            <strong>Analysis outputs:</strong> the structured results produced
            by our AI, stored in your account history.
          </li>
          <li>
            <strong>Technical data:</strong> limited server logs (IP, user agent,
            timestamps) necessary to operate and secure the Service.
          </li>
        </ul>

        <h2>3. Why we process it (legal bases)</h2>
        <ul>
          <li><strong>Performance of a contract (Art. 6(1)(b) GDPR)</strong> — to provide the Service you request.</li>
          <li><strong>Legitimate interests (Art. 6(1)(f) GDPR)</strong> — to secure the Service and prevent abuse.</li>
          <li><strong>Consent (Art. 6(1)(a) GDPR)</strong> — for optional analytics cookies.</li>
          <li><strong>Legal obligation (Art. 6(1)(c) GDPR)</strong> — where law requires retention.</li>
        </ul>

        <h2>4. How AI processing works</h2>
        <p>
          Your input is sent to our AI provider (OpenAI) strictly server-side
          through our backend. We do not share your account data with the AI
          provider beyond the content of your analysis request. Please avoid
          pasting personal data of third parties (e.g. full names, phone
          numbers) when describing a car.
        </p>

        <h2>5. Sharing with processors</h2>
        <p>We share personal data only with the service providers needed to operate VeltrixDrive:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting.</li>
          <li><strong>OpenAI</strong> — AI analysis execution.</li>
          <li><strong>Hosting provider</strong> — infrastructure.</li>
          <li><strong>Stripe</strong> (if enabled) — payment processing.</li>
        </ul>
        <p>
          Where these processors are located outside the EU/EEA, transfers rely
          on Standard Contractual Clauses or equivalent safeguards.
        </p>

        <h2>6. Retention</h2>
        <p>
          We keep account data while your account is active. Analysis history is
          kept so you can revisit previous results. You may delete your account
          or specific analyses at any time by contacting us; we will remove your
          data within 30 days unless retention is legally required.
        </p>

        <h2>7. Your rights</h2>
        <p>Under the GDPR you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction or deletion.</li>
          <li>Restrict or object to certain processing.</li>
          <li>Request data portability.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).</li>
        </ul>
        <p>
          To exercise your rights, email{" "}
          <a href="mailto:info@bedrijfsnaam.com">info@bedrijfsnaam.com</a>.
        </p>

        <h2>8. Security</h2>
        <p>
          We use row-level security in our database, encrypted transport (HTTPS),
          secure authentication, and store the OpenAI API key only on the server
          in protected environment variables.
        </p>

        <h2>9. Children</h2>
        <p>The Service is not directed to individuals under 18. We do not knowingly collect data from children.</p>

        <h2>10. Changes</h2>
        <p>
          We may update this policy as the Service evolves. Material changes
          will be communicated via email or in-app notice.
        </p>
      </LegalLayout>
      <Footer />
    </>
  );
}
