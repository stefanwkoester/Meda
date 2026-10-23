import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import logo from "../../public/assets/meda-logo.png";
import { api, setSession, onExpired, type Session } from "../api";
export function AuthGate({
  children,
}: {
  children: (session: Session, onLogout: () => Promise<void>) => ReactNode;
}) {
  const [session, updateSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [setup, setSetup] = useState(false),
    [setupKeyRequired, setSetupKeyRequired] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [offline, setOffline] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const status = await api<{
        needsSetup: boolean;
        setupKeyRequired: boolean;
      }>("/auth/status");
      setSetup(status.needsSetup);
      setSetupKeyRequired(status.setupKeyRequired);
      setOffline(false);
      if (!status.needsSetup) {
        try {
          const s = await api<Session>("/auth/session");
          setSession(s);
          updateSession(s);
        } catch {
          setSession(null);
          updateSession(null);
        }
      }
    } catch {
      setOffline(true);
      setError(
        "The Meda server is unavailable. Start the app with npm run dev, or ask your developer to start it.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    onExpired(() => {
      setSession(null);
      updateSession(null);
      setError("Your session expired. Sign in again to continue.");
      setSetup(false);
    });
    return () => onExpired(() => {});
  }, []);
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setSession(null);
    updateSession(null);
  }
  if (session) return children(session, logout);
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand auth-brand">
          <img src={logo} alt="Meda" />
        </div>
        <div>
          <p className="eyebrow">BUILT AROUND YOUR PRACTICE</p>
          <h1>
            A clearer picture.
            <br />A more connected visit.
          </h1>
          <p>
            From the first skin exam to the next follow-up, keep the patient
            story in focus.
          </p>
          <div className="auth-features">
            <span>
              01 <strong>Patient-centered charts</strong>
            </span>
            <span>
              02 <strong>Connected encounters & procedures</strong>
            </span>
            <span>
              03 <strong>Capture, review & compare</strong>
            </span>
          </div>
        </div>
        <small>
          Fictional-data development workspace · Not for clinical use
        </small>
      </section>
      <section className="auth-content">
        <div className="auth-form">
          <span className="section-kicker">MEDA WORKSPACE</span>
          <h2>
            {loading
              ? "Opening your workspace…"
              : setup
                ? "Set up your practice workspace"
                : "Welcome back"}
          </h2>
          <p>
            {setup
              ? "Create the first administrator account. This workspace starts with five fictional dermatology patients."
              : "Sign in to continue your patient work."}
          </p>
          {error && (
            <div role="alert" className="inline-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {loading ? (
            <div className="loading-line" />
          ) : offline ? (
            <button className="primary full" onClick={load}>
              <RefreshCw size={17} />
              Retry connection
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                setError("");
                const form = new FormData(e.currentTarget);
                try {
                  const body = Object.fromEntries(form);
                  const s = await api<Session>(
                    setup ? "/auth/setup" : "/auth/login",
                    { method: "POST", body: JSON.stringify(body) },
                  );
                  setSession(s);
                  updateSession(s);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {setup && (
                <>
                  {setupKeyRequired && (
                    <label className="field">
                      Workspace setup key
                      <input
                        name="setupKey"
                        type="password"
                        required
                        autoComplete="off"
                      />
                      <small>
                        Available in your hosting service’s environment
                        settings. Never share it in chat.
                      </small>
                    </label>
                  )}
                  <label className="field">
                    Your full name
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={100}
                    />
                  </label>
                  <label className="field">
                    Practice name
                    <input
                      name="clinic"
                      required
                      maxLength={100}
                      placeholder="Your dermatology practice"
                    />
                  </label>
                </>
              )}
              <label className="field">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                />
              </label>
              <label className="field">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={setup ? "new-password" : "current-password"}
                  minLength={setup ? 12 : 1}
                  maxLength={128}
                  required
                />
                {setup && (
                  <small>
                    Use at least 12 characters. No default password is created.
                  </small>
                )}
              </label>
              <button className="primary full" disabled={busy}>
                {busy ? "Please wait…" : setup ? "Create workspace" : "Sign in"}
                <ArrowRight size={17} />
              </button>
              {!setup && (
                <p className="auth-help">
                  Accounts are created by your workspace administrator. Password
                  reset by email is not connected.
                </p>
              )}
            </form>
          )}
          <div className="context-notice">
            <ShieldCheck size={21} />
            <p>
              Use fictional patients only. Accounts and records are stored on
              this app’s server. This development build is not approved for real
              patient information.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
