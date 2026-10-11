import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
function money(v:number){return `₹${Number(v||0).toLocaleString("en-IN")}`;}
export default function OrderDetailsPage(){
 const {orderId}=useParams(); const [order,setOrder]=useState<any>(null); const [error,setError]=useState("");
 useEffect(()=>{fetch(`${API_URL}/api/orders/${encodeURIComponent(orderId||"")}`,{credentials:"include"}).then(async r=>{const p=await r.json(); if(!r.ok) throw new Error(p.message||"Order not found"); setOrder(p.order)}).catch(e=>setError(e.message));},[orderId]);
 if(error)return <main style={{padding:40,textAlign:"center"}}><h1>Order not found</h1><p>{error}</p><Link to="/account">Back to Account</Link></main>;
 if(!order)return <main style={{padding:40,textAlign:"center"}}>Loading order details…</main>;
 return <main style={{padding:"32px 16px",maxWidth:1000,margin:"0 auto"}}><Link to="/account">← My Account</Link><div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",margin:"24px 0"}}><div><p>ORDER ID</p><h1>{order.order_number}</h1><p>{new Date(order.created_at).toLocaleString("en-IN")}</p></div><div style={{padding:16,borderRadius:16,background:"#f5f5f5"}}><strong>{order.order_status}</strong><br/>Payment: {order.payment_status}</div></div>
 <section style={{padding:20,border:"1px solid #ddd",borderRadius:18,marginBottom:18}}><h2>Items</h2>{order.items.map((i:any)=><div key={i.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:"1px solid #eee"}}>{i.image_url&&<img src={i.image_url} alt="" style={{width:72,height:88,objectFit:"contain"}}/>}<div style={{flex:1}}><strong>{i.title}</strong><div>{i.size||""} × {i.quantity}</div>{i.customization_filename&&<div>Customization: {i.customization_filename}</div>}</div><strong>{money(i.unit_price*i.quantity)}</strong></div>)}</section>
 <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:18}}><div style={{padding:20,border:"1px solid #ddd",borderRadius:18}}><h2>Delivery details</h2><p>{order.customer_name}<br/>{order.customer_phone}<br/>{order.customer_email}</p><p>{order.shipping_address?.line1}<br/>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p></div><div style={{padding:20,border:"1px solid #ddd",borderRadius:18}}><h2>Payment summary</h2><p>Subtotal: {money(order.subtotal)}</p><p>Delivery: {money(order.delivery_charge)}</p><p>Discount: {money(order.discount_amount)}</p><h2>Total: {money(order.total_amount)}</h2></div></section>
 </main>;
}
