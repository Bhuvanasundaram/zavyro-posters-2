import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type Product = { id: string; title: string; image: string; sizes?: Array<{ size: string; price: number; offerPrice: number; available?: boolean }> };
type Line = { productId: string; title: string; imageUrl: string; size: string; quantity: number; unitPrice: number };
type Order = { id: string; order_number: string; customer_name: string; customer_email?: string | null; customer_phone?: string | null; total_amount: string|number; subtotal?: string|number; delivery_charge?: string|number; discount_amount?: string|number; payment_status: string; status: string; source?: string; payment_method?: string; created_at: string; updated_at?: string; shipping_address?: unknown; notes?: string | null; legacy_order?: boolean; items?: Array<{title:string;quantity:number;size?:string;unit_price?:string|number;customization_url?:string|null;customization_filename?:string|null}>; customizations?: Array<{itemIndex:number;title:string;fileName:string;url:string;previewUrl?:string}> };

function money(value: number|string) { return `₹${Number(value||0).toLocaleString("en-IN")}`; }
function date(value: string) { const d=new Date(value); return Number.isNaN(d.getTime())?"—":d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
function imageLink(value: string) { return /^(https?:|data:|blob:)/i.test(value) ? value : `${API_URL}${value.startsWith("/")?"":"/"}${value}`; }
function addressText(value: unknown): string { if (!value) return ""; if (typeof value === "string") return value; if (typeof value === "object") { const o=value as Record<string,unknown>; return [o.address,o.addressLine1,o.address_line1,o.addressLine2,o.city,o.district,o.state,o.pincode,o.postalCode,o.country].filter(v=>typeof v==="string"&&v.trim()).join(", "); } return ""; }

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders,setOrders]=useState<Order[]>([]); const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [updatingOrderId,setUpdatingOrderId]=useState(""); const [error,setError]=useState(""); const [success,setSuccess]=useState("");
  const [form,setForm]=useState({customerName:"",customerEmail:"",customerPhone:"",paymentMethod:"cash",paymentStatus:"paid",orderStatus:"confirmed",deliveryCharge:"0",discountAmount:"0",notes:"",address:""});
  const [lines,setLines]=useState<Line[]>([{productId:"",title:"",imageUrl:"",size:"A4",quantity:1,unitPrice:0}]);

  async function loadOrders(){
    setLoading(true); setError("");
    try { const r=await fetch(`${API_URL}/api/admin/orders`,{credentials:"include"}); const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.message||"Failed to load orders."); setOrders(Array.isArray(p.orders)?p.orders:[]); }
    catch(e){setError(e instanceof Error?e.message:"Failed to load orders.");} finally{setLoading(false);}
  }
  useEffect(()=>{void loadOrders(); void fetch(`${API_URL}/api/shop/products?status=published`).then(r=>r.json()).then(p=>setProducts(Array.isArray(p?.products)?p.products:[])).catch(()=>undefined);},[]);

  async function updateOrderStatus(order: Order, status: string) {
    if (!order.id || status === order.status) return;
    setError(""); setSuccess(""); setUpdatingOrderId(order.id);
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update order status.");
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status: result.order.order_status } : item));
      setSuccess(`${order.order_number}: status updated to ${status}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update order status."); }
    finally { setUpdatingOrderId(""); }
  }

  const subtotal=useMemo(()=>lines.reduce((s,l)=>s+l.quantity*l.unitPrice,0),[lines]);
  const total=Math.max(0,subtotal+Number(form.deliveryCharge||0)-Number(form.discountAmount||0));

  function chooseProduct(index:number, productId:string){ const p=products.find(x=>x.id===productId); const size=p?.sizes?.find(x=>x.size==="A4" && x.available!==false)||p?.sizes?.find(x=>x.available!==false)||p?.sizes?.[0]; setLines(ls=>ls.map((l,i)=>i===index?{...l,productId,title:p?.title||"",imageUrl:p?.image||"",size:size?.size||"A4",unitPrice:Number(size?.offerPrice??size?.price??0)}:l)); }
  function chooseSize(index:number,size:string){ const line=lines[index]; const p=products.find(x=>x.id===line.productId); const price=p?.sizes?.find(x=>x.size===size); setLines(ls=>ls.map((l,i)=>i===index?{...l,size,unitPrice:Number(price?.offerPrice??price?.price??l.unitPrice)}:l)); }
  async function createManualOrder(e:React.FormEvent){
    e.preventDefault(); setError(""); setSuccess("");
    if(!form.customerName.trim()){setError("Customer name is required.");return;}
    const validLines=lines.filter(l=>l.productId&&l.title&&l.unitPrice>=0);
    if(!validLines.length){setError("Add at least one poster.");return;}
    setSaving(true);
    try{
      const r=await fetch(`${API_URL}/api/admin/orders/manual`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:form.customerName,customerEmail:form.customerEmail||null,customerPhone:form.customerPhone||null,paymentMethod:form.paymentMethod,paymentStatus:form.paymentStatus,orderStatus:form.orderStatus,deliveryCharge:Number(form.deliveryCharge||0),discountAmount:Number(form.discountAmount||0),notes:form.notes||null,shippingAddress:form.address?{address:form.address}:null,items:validLines.map(l=>({productId:l.productId,title:l.title,imageUrl:l.imageUrl,size:l.size,quantity:l.quantity,unitPrice:l.unitPrice}))})});
      const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.message||"Could not create manual order.");
      setSuccess(`Order ${p.order?.order_number || ""} created successfully.`); setForm({customerName:"",customerEmail:"",customerPhone:"",paymentMethod:"cash",paymentStatus:"paid",orderStatus:"confirmed",deliveryCharge:"0",discountAmount:"0",notes:"",address:""}); setLines([{productId:"",title:"",imageUrl:"",size:"A4",quantity:1,unitPrice:0}]); await loadOrders();
    }catch(e){setError(e instanceof Error?e.message:"Could not create manual order.");}finally{setSaving(false);}
  }

  return <main style={{minHeight:"100vh",padding:"28px 18px 70px"}}><div style={{maxWidth:1180,margin:"0 auto",display:"grid",gap:18}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><div><p style={eyebrow}>ZAVYRO POSTERS • ORDERS</p><h1 style={{margin:"7px 0 4px",color:"var(--color-text)"}}>Orders</h1><p style={muted}>Online and offline orders use the same backend order system and receive a unique Order ID.</p></div><div style={{display:"flex",gap:8}}><button type="button" onClick={()=>void loadOrders()} style={button}>↻ Refresh</button><button type="button" onClick={()=>navigate("/admin")} style={secondary}>← Dashboard</button></div></header>
    {(error||success)&&<div style={{padding:12,borderRadius:10,border:`1px solid ${error?"#ef4444":"#22c55e"}`,color:error?"#ef4444":"#22c55e"}}>{error||success}</div>}

    <section style={card}><div style={sectionHead}><div><p style={eyebrow}>OFFLINE / MANUAL</p><h2 style={h2}>Create an order</h2></div><strong style={{color:"var(--color-text)"}}>{money(total)}</strong></div>
      <form onSubmit={createManualOrder} style={{display:"grid",gap:14}}>
        <div style={grid}><Field label="Customer name"><input required value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} style={input}/></Field><Field label="Email"><input type="email" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})} style={input}/></Field><Field label="Phone"><input value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})} style={input}/></Field><Field label="Payment method"><select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} style={input}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="razorpay">Razorpay</option><option value="other">Other</option></select></Field><Field label="Payment status"><select value={form.paymentStatus} onChange={e=>setForm({...form,paymentStatus:e.target.value})} style={input}><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></Field><Field label="Order status"><select value={form.orderStatus} onChange={e=>setForm({...form,orderStatus:e.target.value})} style={input}><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="printing">Printing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></Field></div>
        <Field label="Delivery address"><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={{...input,minHeight:70}} /></Field>
        <div style={{display:"grid",gap:10}}><div style={lineHead}><strong>Posters</strong><button type="button" onClick={()=>setLines([...lines,{productId:"",title:"",imageUrl:"",size:"A4",quantity:1,unitPrice:0}])} style={smallButton}>+ Add poster</button></div>{lines.map((line,index)=><div key={index} style={lineCard}><select value={line.productId} onChange={e=>chooseProduct(index,e.target.value)} style={input}><option value="">Select published poster</option>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><select value={line.size} disabled={!line.productId} onChange={e=>chooseSize(index,e.target.value)} style={input}><option value="A3">A3</option><option value="A4">A4</option><option value="A5">A5</option><option value="A6">A6</option></select><input type="number" min={1} value={line.quantity} onChange={e=>setLines(ls=>ls.map((l,i)=>i===index?{...l,quantity:Math.max(1,Number(e.target.value)||1)}:l))} style={input}/><input type="number" min={0} value={line.unitPrice} onChange={e=>setLines(ls=>ls.map((l,i)=>i===index?{...l,unitPrice:Math.max(0,Number(e.target.value)||0)}:l))} style={input}/>{lines.length>1&&<button type="button" onClick={()=>setLines(ls=>ls.filter((_,i)=>i!==index))} style={removeButton}>Remove</button>}</div>)}</div>
        <div style={grid}><Field label="Delivery charge"><input type="number" min={0} value={form.deliveryCharge} onChange={e=>setForm({...form,deliveryCharge:e.target.value})} style={input}/></Field><Field label="Discount"><input type="number" min={0} value={form.discountAmount} onChange={e=>setForm({...form,discountAmount:e.target.value})} style={input}/></Field></div>
        <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{...input,minHeight:60}} /></Field>
        <button disabled={saving} type="submit" style={{...button,justifySelf:"start"}}>{saving?"Creating order…":"Create Offline Order"}</button>
      </form>
    </section>

    <section style={card}><div style={sectionHead}><div><p style={eyebrow}>ORDER RECORDS</p><h2 style={h2}>All orders</h2></div></div>{loading?<p style={muted}>Loading orders…</p>:orders.length===0?<p style={muted}>No orders have been recorded yet.</p>:<div style={{display:"grid",gap:12}}>{orders.map(o=><article key={o.id} style={orderCard}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong style={{fontSize:16,color:"var(--color-text)"}}>{o.order_number||"Order"}</strong><div style={muted}>{o.customer_name||"Customer"}{o.customer_phone?` • ${o.customer_phone}`:""}{o.customer_email?` • ${o.customer_email}`:""} • {date(o.created_at)} • {o.source||"online"}{o.legacy_order?" • legacy record":""}</div></div><div style={{textAlign:"right",display:"grid",gap:7,justifyItems:"end"}}><strong style={{color:"var(--color-text)"}}>{money(o.total_amount)}</strong><div style={muted}>Payment: {o.payment_status||"pending"}</div><label style={{display:"grid",gap:4,textAlign:"left",fontSize:11,color:"var(--color-text-secondary)"}}>Order status<select aria-label={`Order status for ${o.order_number}`} disabled={updatingOrderId===o.id} value={o.status||"pending"} onChange={e=>void updateOrderStatus(o,e.target.value)} style={{...input,minWidth:150,padding:"8px 10px"}}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="printing">Printing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label></div></div>{o.items?.length?<div style={{marginTop:10,display:"grid",gap:7,fontSize:13,color:"var(--color-text-secondary)"}}>{o.items.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><span>{item.title} × {item.quantity}{item.size?` (${item.size})`:""}{item.customization_filename?` · Custom file: ${item.customization_filename}`:""}</span><span>{item.unit_price!==undefined?money(item.unit_price):""}</span></div>)}</div>:null}{addressText(o.shipping_address)&&<div style={{marginTop:10,padding:10,borderRadius:8,background:"var(--color-surface)",fontSize:12,color:"var(--color-text-secondary)"}}><strong style={{color:"var(--color-text)"}}>Delivery address: </strong>{addressText(o.shipping_address)}</div>}{o.customizations?.length?<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{o.customizations.map((file,i)=><a key={`${file.url}-${i}`} href={imageLink(file.url)} target="_blank" rel="noreferrer" download={file.fileName} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 10px",border:"1px solid var(--color-border)",borderRadius:8,color:"var(--color-text)",fontSize:12,textDecoration:"none"}}>↓ Download {file.fileName||"customization"}</a>)}</div>:null}{o.notes&&<p style={{margin:"10px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>Notes: {o.notes}</p>}</article>)}</div>}</section>
  </div></main>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"var(--color-text-secondary)"}}>{label}{children}</label>}
const eyebrow:React.CSSProperties={margin:0,fontSize:11,fontWeight:900,letterSpacing:".13em",color:"var(--color-text-muted)"};
const muted:React.CSSProperties={color:"var(--color-text-muted)"};
const card:React.CSSProperties={border:"1px solid var(--color-border)",borderRadius:18,padding:18,background:"var(--color-surface)"};
const orderCard:React.CSSProperties={border:"1px solid var(--color-border)",borderRadius:14,padding:14,background:"var(--color-background)"};
const h2:React.CSSProperties={margin:"7px 0 0",color:"var(--color-text)",fontSize:20};
const sectionHead:React.CSSProperties={display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:16};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12};
const input:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid var(--color-border)",borderRadius:10,padding:"11px 12px",background:"var(--color-background)",color:"var(--color-text)"};
const button:React.CSSProperties={border:0,borderRadius:10,padding:"10px 14px",background:"var(--color-accent)",color:"#fff",fontWeight:850,cursor:"pointer",whiteSpace:"nowrap"};
const secondary:React.CSSProperties={...button,background:"var(--color-surface)",color:"var(--color-text)",border:"1px solid var(--color-border)"};
const smallButton:React.CSSProperties={...secondary,padding:"8px 10px",fontSize:12};
const removeButton:React.CSSProperties={...secondary,padding:"8px 10px",color:"#ef4444"};
const lineHead:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10};
const lineCard:React.CSSProperties={display:"grid",gridTemplateColumns:"minmax(180px,2fr) 100px 90px 110px auto",gap:8,alignItems:"center",padding:10,border:"1px solid var(--color-border)",borderRadius:12};
