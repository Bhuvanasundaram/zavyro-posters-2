import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type Order = {
  id: string;
  order_number: string;
  source: string;
  order_status: string;
  payment_status: string;
  payment_method?: string | null;
  total_amount: string | number;
  created_at: string;
  items: Array<{ title: string; quantity: number; size?: string | null }>;
};

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "customer") return;
    let active = true;
    setOrdersLoading(true);
    fetch(`${API_URL}/api/account/orders`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) throw new Error(payload.message || "Could not load order history.");
        if (active) setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      })
      .catch((error) => { if (active) setOrdersError(error instanceof Error ? error.message : "Could not load order history."); })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (loading) return <main style={page}><div style={card}>Loading account…</div><div style={{marginTop:24}}><a href="/track-order">Track an order without signing in →</a></div></main>;
  if (!user) { navigate("/login?returnTo=/account", { replace: true }); return null; }

  const isAdmin = user.role !== "customer";
  return (
    <main style={page}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={card}>
          <p style={eyebrow}>ZAVYRO ACCOUNT</p>
          <h1 style={title}>Welcome, {user.fullName}</h1>
          <div style={{ display: "grid", gap: 12 }}>
            <Info label="Name" value={user.fullName} />
            <Info label="Email" value={user.email} />
            <Info label="Account type" value={user.role.toUpperCase()} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <button type="button" onClick={() => navigate("/cart")} style={button}>View Cart</button>
            {isAdmin && <button type="button" onClick={() => navigate("/admin")} style={button}>Admin Dashboard</button>}
            <button type="button" onClick={async () => { await logout(); navigate("/", { replace: true }); }} style={secondaryButton}>Logout</button>
          </div>
        </section>

        {user.role === "customer" && (
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div><p style={eyebrow}>SHOPPING HISTORY</p><h2 style={{ margin: "7px 0 0", color: "var(--color-text)" }}>My Orders</h2></div>
              <button type="button" onClick={() => navigate("/shop")} style={secondaryButton}>Continue Shopping</button>
            </div>
            {ordersLoading ? <p style={muted}>Loading your orders…</p> : ordersError ? <p style={{ color: "#ef4444" }}>{ordersError}</p> : orders.length === 0 ? <p style={muted}>Your orders will appear here after you place your first order.</p> : <div style={{ display: "grid", gap: 12, marginTop: 18 }}>{orders.map(order => <article key={order.id} style={orderCard}><div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}><div><strong style={{ color:"var(--color-text)" }}>{order.order_number}</strong><div style={muted}>{new Date(order.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })} • {order.source === "offline" ? "Offline" : "Online"}</div></div><div style={{ textAlign:"right" }}><strong style={{ color:"var(--color-text)" }}>₹{Number(order.total_amount || 0).toLocaleString("en-IN")}</strong><div style={muted}>{order.order_status} • {order.payment_status}</div></div></div><div style={{ marginTop:10, color:"var(--color-text-secondary)", fontSize:13 }}>{order.items.map((item, i) => <span key={`${order.id}-${i}`}>{item.title} × {item.quantity}{item.size ? ` (${item.size})` : ""}{i < order.items.length - 1 ? " • " : ""}</span>)}</div><button type="button" onClick={() => navigate(`/order/${encodeURIComponent(order.order_number)}`)} style={{...secondaryButton, marginTop:12}}>View Order Details</button></article>)}</div>}
          </section>
        )}
      </div>
    <div style={{marginTop:24}}><a href="/track-order">Track an order without signing in →</a></div></main>
  );
}
function Info({ label, value }: { label: string; value: string }) { return <div><small style={muted}>{label}</small><div style={{ marginTop:4, fontWeight:800, color:"var(--color-text)" }}>{value}</div></div>; }
const page: React.CSSProperties = { minHeight:"70vh", padding:"40px 18px 70px" };
const card: React.CSSProperties = { border:"1px solid var(--color-border)", borderRadius:20, padding:24, background:"var(--color-surface)", boxShadow:"var(--shadow-sm)" };
const orderCard: React.CSSProperties = { border:"1px solid var(--color-border)", borderRadius:14, padding:14, background:"var(--color-background)" };
const eyebrow: React.CSSProperties = { margin:0, fontSize:11, fontWeight:900, letterSpacing:".14em", color:"var(--color-text-muted)" };
const title: React.CSSProperties = { margin:"8px 0 22px", color:"var(--color-text)" };
const muted: React.CSSProperties = { color:"var(--color-text-muted)" };
const button: React.CSSProperties = { border:0, borderRadius:10, padding:"11px 16px", background:"var(--color-accent)", color:"#fff", fontWeight:850, cursor:"pointer" };
const secondaryButton: React.CSSProperties = { border:"1px solid var(--color-border)", borderRadius:10, padding:"10px 14px", background:"var(--color-surface)", color:"var(--color-text)", fontWeight:800, cursor:"pointer" };
