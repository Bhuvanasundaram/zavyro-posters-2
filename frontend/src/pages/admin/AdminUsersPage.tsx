import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";
type Role = "owner" | "admin" | "staff" | "customer";
type User = { id: string; full_name: string; email: string; phone?: string | null; role: Role; status: "active" | "suspended"; created_at: string };

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [accountView, setAccountView] = useState<"team" | "customers">("team");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "staff" as Exclude<Role,"owner"> });

  async function load() {
    setLoading(true); setError("");
    try { const r = await fetch(`${API_URL}/api/admin/users`, { credentials: "include" }); const p = await r.json(); if (!r.ok || !p.success) throw new Error(p.message || "Unable to load accounts."); setUsers(Array.isArray(p.users) ? p.users : []); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load accounts."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (form.password.length < 8) { setError("Password must contain at least 8 characters."); return; }
    setSaving(true);
    try { const r = await fetch(`${API_URL}/api/admin/users`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const p = await r.json(); if (!r.ok || !p.success) throw new Error(p.message || "Could not create account."); setSuccess(`${form.role} account created successfully.`); setForm({ fullName:"", email:"", phone:"", password:"", role:"staff" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create account."); }
    finally { setSaving(false); }
  }

  async function updateUser(id: string, patch: Partial<Pick<User,"role"|"status">>) {
    setError(""); setSuccess("");
    try { const r = await fetch(`${API_URL}/api/admin/users/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const p = await r.json(); if (!r.ok || !p.success) throw new Error(p.message || "Could not update account."); setUsers(current => current.map(u => u.id === id ? p.user : u)); setSuccess("Account updated successfully."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update account."); }
  }

  return <main style={{ minHeight:"100vh", padding:"28px 18px 70px" }}><div style={{ maxWidth:1100, margin:"0 auto" }}>
    <div style={{ display:"flex", justifyContent:"space-between", gap:16, alignItems:"flex-start", marginBottom:24 }}><div><p style={{margin:0,fontSize:12,fontWeight:900,letterSpacing:".16em",color:"var(--color-text-muted)"}}>OWNER CONTROL</p><h1 style={{margin:"8px 0 6px",color:"var(--color-text)"}}>Accounts & Roles</h1><p style={{margin:0,color:"var(--color-text-secondary)"}}>Create staff/admin accounts and control account roles and status.</p></div><button type="button" onClick={()=>navigate("/admin")} style={btn}>← Admin Dashboard</button></div>
    {(error || success) && <div style={{ marginBottom:16, padding:12, borderRadius:10, border:`1px solid ${error ? "#ef4444" : "#22c55e"}`, color:error?"#ef4444":"#22c55e" }}>{error || success}</div>}
    <section style={card}><h2 style={h2}>Create an account</h2><form onSubmit={createAccount} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
      <input required placeholder="Full name" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} style={input}/><input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={input}/><input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={input}/><input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={input}/><select value={form.role} onChange={e=>setForm({...form,role:e.target.value as typeof form.role})} style={input}><option value="staff">Staff</option><option value="admin">Admin</option><option value="customer">Customer</option></select><button disabled={saving} type="submit" style={btn}>{saving?"Creating…":"Create Account"}</button>
    </form><p style={{margin:"12px 0 0",fontSize:12,color:"var(--color-text-muted)"}}>Owner accounts are protected and cannot be created or changed from this screen.</p></section>
    <section style={{...card,marginTop:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><h2 style={h2}>Accounts</h2><button type="button" onClick={()=>void load()} style={{...btn,background:"transparent",color:"var(--color-text)"}}>↻ Refresh</button></div>
      <div role="tablist" aria-label="Account type" style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}><button type="button" role="tab" aria-selected={accountView==="team"} onClick={()=>setAccountView("team")} style={{...btn,background:accountView==="team"?"var(--color-accent)":"var(--color-background)",color:accountView==="team"?"#fff":"var(--color-text)",border:"1px solid var(--color-border)"}}>Admin & Staff ({users.filter(u=>u.role!=="customer").length})</button><button type="button" role="tab" aria-selected={accountView==="customers"} onClick={()=>setAccountView("customers")} style={{...btn,background:accountView==="customers"?"var(--color-accent)":"var(--color-background)",color:accountView==="customers"?"#fff":"var(--color-text)",border:"1px solid var(--color-border)"}}>Customers ({users.filter(u=>u.role==="customer").length})</button></div>
      {loading ? <p>Loading accounts…</p> : (()=>{const shown=users.filter(u=>accountView==="customers"?u.role==="customer":u.role!=="customer"); return shown.length===0?<p style={{color:"var(--color-text-secondary)"}}>No {accountView==="customers"?"customer":"admin or staff"} accounts found.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}><thead><tr>{["Account","Email","Phone","Role","Status","Created"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{shown.map(u=><tr key={u.id}><td style={td}><strong>{u.full_name}</strong>{u.role==="owner"&&<small style={{display:"block",color:"var(--color-text-muted)"}}>Protected owner</small>}</td><td style={td}>{u.email}</td><td style={td}>{u.phone||"—"}</td><td style={td}>{u.role==="owner" ? <strong>OWNER</strong> : <select value={u.role} onChange={e=>void updateUser(u.id,{role:e.target.value as Role})} style={smallInput}><option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option></select>}</td><td style={td}>{u.role==="owner" ? <strong>ACTIVE</strong> : <select value={u.status} onChange={e=>void updateUser(u.id,{status:e.target.value as User["status"]})} style={smallInput}><option value="active">Active</option><option value="suspended">Suspended</option></select>}</td><td style={td}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>})()}
    </section>
  </div></main>;
}
const card: React.CSSProperties={border:"1px solid var(--color-border)",borderRadius:18,padding:20,background:"var(--color-surface)"};
const h2: React.CSSProperties={margin:"0 0 16px",color:"var(--color-text)",fontSize:18};
const input: React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid var(--color-border)",borderRadius:10,padding:"11px 12px",background:"var(--color-background)",color:"var(--color-text)"};
const smallInput: React.CSSProperties={border:"1px solid var(--color-border)",borderRadius:8,padding:"7px 9px",background:"var(--color-background)",color:"var(--color-text)"};
const btn: React.CSSProperties={border:0,borderRadius:10,padding:"10px 14px",background:"var(--color-accent)",color:"#fff",fontWeight:850,cursor:"pointer",whiteSpace:"nowrap"};
const th: React.CSSProperties={textAlign:"left",padding:"10px",fontSize:12,color:"var(--color-text-muted)",borderBottom:"1px solid var(--color-border)"};
const td: React.CSSProperties={padding:"12px 10px",fontSize:13,color:"var(--color-text)",borderBottom:"1px solid var(--color-border)"};
