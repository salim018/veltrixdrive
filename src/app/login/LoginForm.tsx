"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { Mascot } from "@/components/Mascot";

type Mode = "login" | "signup";

/** Resolve canonical site URL for email-confirmation redirects. */
function siteOrigin() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Map Supabase auth errors to friendly i18n keys. */
function mapAuthError(message: string | undefined): string {
  if (!message) return "login.error.generic";
  const m = message.toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid_credentials") ||
    m.includes("invalid email or password")
  ) {
    return "login.error.invalid";
  }
  if (
    m.includes("already registered") ||
    m.includes("user already registered") ||
    m.includes("already exists")
  ) {
    return "login.error.exists";
  }
  return "login.error.generic";
}

/**
 * Password rules per spec:
 *   - min 8 characters
 *   - at least 1 letter
 *   - at least 1 number
 *   - at least 1 special character (anything that isn't a letter or digit)
 *
 * Equivalent regex: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
 * We split the checks so each failure returns a specific error key.
 */
function validatePassword(p: string): string | null {
  if (p.length < 8) return "login.error.passwordShort";
  if (!/[A-Za-z]/.test(p)) return "login.error.passwordLetter";
  if (!/\d/.test(p)) return "login.error.passwordNumber";
  if (!/[^A-Za-z\d]/.test(p)) return "login.error.passwordSpecial";
  return null;
}

export function LoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false
  });

  const supabase = createClient();
  const redirectTo = `${siteOrigin()}/api/auth/callback?next=${encodeURIComponent(next)}`;

  // Field-level validation. Errors only render after a field is touched
  // (or after a submit attempt).
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string | null> = {
      firstName: null,
      lastName: null,
      email: null,
      password: null
    };
    if (mode === "signup") {
      if (!firstName.trim()) errs.firstName = "login.error.firstNameRequired";
      if (!lastName.trim()) errs.lastName = "login.error.lastNameRequired";
    }
    if (!email.trim()) errs.email = "login.error.emailRequired";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "login.error.emailInvalid";
    if (mode === "signup") {
      const pwErr = validatePassword(password);
      if (pwErr) errs.password = pwErr;
    } else if (!password) {
      errs.password = "login.error.passwordRequired";
    }
    return errs;
  }, [mode, firstName, lastName, email, password]);

  const formInvalid =
    !!fieldErrors.firstName ||
    !!fieldErrors.lastName ||
    !!fieldErrors.email ||
    !!fieldErrors.password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true });
    if (formInvalid) return;

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            // Names go in Supabase auth user_metadata. Supabase hashes the
            // password automatically; we never see plaintext.
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim()
            }
          }
        });
        if (err) throw err;
        if (data.session) {
          // Email confirmations off → user is signed in immediately.
          router.push(next);
          router.refresh();
        } else {
          setInfo(t("login.checkEmail"));
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (err) throw err;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t(mapAuthError(msg)));
    } finally {
      setLoading(false);
    }
  }

  const show = (field: keyof typeof touched): string | null =>
    touched[field] && fieldErrors[field] ? fieldErrors[field] : null;

  const inputClass = (hasError: string | null) =>
    `mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 focus:outline-none focus:ring-2 ${
      hasError
        ? "ring-red-200 focus:ring-red-500"
        : "ring-brand-100 focus:ring-brand-500"
    }`;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_280px] md:items-start">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {mode === "signup" ? t("login.signupTitle") : t("login.title")}
        </h1>
        <p className="mt-2 text-ink-500">
          {mode === "signup" ? t("login.signupSubtitle") : t("login.subtitle")}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 card p-5 sm:p-6">
          {mode === "signup" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="label">
                  {t("login.firstName")} *
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, firstName: true }))}
                  aria-invalid={!!show("firstName")}
                  className={inputClass(show("firstName"))}
                />
                {show("firstName") && (
                  <p className="mt-1 text-xs text-red-700">
                    {t(fieldErrors.firstName!)}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  {t("login.lastName")} *
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, lastName: true }))}
                  aria-invalid={!!show("lastName")}
                  className={inputClass(show("lastName"))}
                />
                {show("lastName") && (
                  <p className="mt-1 text-xs text-red-700">
                    {t(fieldErrors.lastName!)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className={mode === "signup" ? "mt-3" : ""}>
            <label htmlFor="email" className="label">
              {t("login.email")} *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, email: true }))}
              aria-invalid={!!show("email")}
              className={inputClass(show("email"))}
            />
            {show("email") && (
              <p className="mt-1 text-xs text-red-700">{t(fieldErrors.email!)}</p>
            )}
          </div>

          <div className="mt-3">
            <label htmlFor="password" className="label">
              {t("login.password")} *
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
              aria-invalid={!!show("password")}
              className={inputClass(show("password"))}
            />
            {show("password") ? (
              <p className="mt-1 text-xs text-red-700">
                {t(fieldErrors.password!)}
              </p>
            ) : mode === "signup" ? (
              <p className="mt-1 text-xs text-ink-500">{t("login.passwordHint")}</p>
            ) : null}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? t("login.loading")
              : mode === "signup"
              ? t("login.signupCta")
              : t("login.cta")}
          </button>

          <div className="mt-4 text-center text-sm text-ink-500">
            {mode === "signup" ? (
              <>
                {t("login.haveAccount")}{" "}
                <button
                  type="button"
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  {t("login.switchToLogin")}
                </button>
              </>
            ) : (
              <>
                {t("login.noAccount")}{" "}
                <button
                  type="button"
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  {t("login.switchToSignup")}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <aside className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Mascot size={64} />
          <div>
            <p className="text-sm font-semibold text-ink-900">{t("mascot.role")}</p>
            <p className="text-xs text-ink-500">{t("mascot.status")}</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 ring-1 ring-brand-100">
          {t("mascot.greeting")}
        </p>
      </aside>
    </div>
  );
}
