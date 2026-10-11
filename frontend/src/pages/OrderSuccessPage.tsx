import { Link, useParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const id = decodeURIComponent(orderId || "");
  return <main style={{minHeight:"75vh",padding:"48px 18px"}}><section style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>
    <div style={{fontSize:56}}>🎉</div><p style={{letterSpacing:".12em",fontWeight:800}}>ORDER SUCCESSFUL</p><h1>Your order has been placed successfully.</h1>
    <div style={{margin:"28px auto",padding:24,borderRadius:20,border:"1px solid rgba(0,0,0,.1)",background:"rgba(255,255,255,.7)"}}><span>Order ID</span><h2 style={{margin:"8px 0",fontSize:28}}>{id}</h2><p>Your payment was verified. Keep this Order ID for tracking.</p></div>
    <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}><Link to={`/order/${encodeURIComponent(id)}`} style={{padding:"13px 20px",borderRadius:12,background:"#111",color:"#fff",textDecoration:"none",fontWeight:800}}>View Order Details</Link><Link to="/track-order" style={{padding:"13px 20px",borderRadius:12,border:"1px solid #ddd",textDecoration:"none",fontWeight:800}}>Track Order</Link></div>
  </section></main>;
}
