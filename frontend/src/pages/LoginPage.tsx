import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!email.trim() || !password || (mode === "signup" && !fullName.trim())) { setError("Please fill in all required fields."); return; }
    if (mode === "signup" && password.length < 8) { setError("Password must contain at least 8 characters."); return; }
    try {
      setLoading(true);
      const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || null, email: email.trim(), password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || (mode === "signup" ? "Sign up failed." : "Login failed."));
      const user = await refresh();
      if (!user) throw new Error("Login succeeded but the session could not be loaded. Please try again.");
      const destination = user.role === "customer" ? returnTo : "/admin";
      navigate(destination, { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to continue."); }
    finally { setLoading(false); }
  }

  return <main style={{ ...styles.page, background: "var(--color-background)", color: "var(--color-text-primary)" }}>
    <div style={{ ...styles.backgroundGlow, opacity: resolvedTheme === "dark" ? 1 : .65 }} />
    <section style={{ ...styles.card, background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div style={styles.logo}>Z</div><p style={styles.brand}>ZAVYRO POSTERS</p>
      <h1 style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p style={{ ...styles.subtitle, color: "var(--color-text-secondary)" }}>{mode === "login" ? "Sign in to continue to your Zavyro account." : "Create your customer account and continue shopping."}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 18, padding: 4, border: "1px solid var(--color-border)", borderRadius: 10 }}>
        <button type="button" onClick={() => { setMode("login"); setError(""); }} style={{ ...styles.toggle, background: mode === "login" ? "var(--color-accent)" : "transparent", color: mode === "login" ? "#fff" : "var(--color-text-secondary)" }}>Sign In</button>
        <button type="button" onClick={() => { setMode("signup"); setError(""); }} style={{ ...styles.toggle, background: mode === "signup" ? "var(--color-accent)" : "transparent", color: mode === "signup" ? "#fff" : "var(--color-text-secondary)" }}>Sign Up</button>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        {mode === "signup" && <><Field label="Full name"><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" style={styles.input} disabled={loading}/></Field><Field label="Phone (optional)"><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" autoComplete="tel" style={styles.input} disabled={loading}/></Field></>}
        <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" style={styles.input} disabled={loading}/></Field>
        <Field label="Password"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete={mode === "login" ? "current-password" : "new-password"} style={styles.input} disabled={loading}/></Field>
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? .7 : 1 }}>{loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}</button>
      </form>
      <button type="button" onClick={() => navigate(returnTo === "/" ? "/" : returnTo)} style={{ ...styles.backButton, color: "var(--color-text-muted)" }}>← Back</button>
    </section>
  </main>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={styles.field}><label style={{ ...styles.label, color: "var(--color-text-secondary)" }}>{label}</label>{children}</div>; }

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    padding: "24px",
  },

  backgroundGlow: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(124,58,237,0.20), transparent 70%)",
    filter: "blur(30px)",
    pointerEvents: "none",
  },

  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "430px",
    padding: "38px 30px",
    borderRadius: "22px",
    border: "1px solid",
  },

  logo: {
    width: "58px",
    height: "58px",
    margin: "0 auto 14px",
    display: "grid",
    placeItems: "center",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #7c3aed, #5b21b6)",
    color: "#fff",
    fontSize: "27px",
    fontWeight: 900,
  },

  brand: {
    margin: 0,
    textAlign: "center",
    color: "#a78bfa",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "3px",
  },

  title: {
    margin: "12px 0 7px",
    textAlign: "center",
    fontSize: "30px",
    lineHeight: 1.1,
  },

  subtitle: {
    margin: 0,
    textAlign: "center",
    fontSize: "14px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginTop: "30px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    fontSize: "13px",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    borderRadius: "11px",
    border: "1px solid",
    outline: "none",
    fontSize: "14px",
  },

  error: {
    padding: "11px 13px",
    borderRadius: "10px",
    background: "#ef444415",
    border: "1px solid #ef444440",
    color: "#f87171",
    fontSize: "13px",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: 0,
    borderRadius: "11px",
    background:
      "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },

  backButton: {
    display: "block",
    width: "100%",
    marginTop: "20px",
    padding: "10px",
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontSize: "13px",
  },
};