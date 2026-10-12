import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./CheckoutPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";
const DELIVERY = 50;
const FREE_THRESHOLD = 500;

type Address = { fullName: string; email: string; phone: string; line1: string; city: string; state: string; pincode: string };

declare global { interface Window { Razorpay?: new (options: any) => { open: () => void }; } }

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address>({ fullName: user?.fullName || "", email: user?.email || "", phone: "", line1: "", city: "", state: "Tamil Nadu", pincode: "" });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const delivery = subtotal >= FREE_THRESHOLD ? 0 : DELIVERY;
  const total = useMemo(() => subtotal + delivery, [subtotal, delivery]);

  function update(key: keyof Address, value: string) { setAddress((current) => ({ ...current, [key]: value })); }

  async function startPayment() {
    setError("");
    const required: Array<[keyof Address, string]> = [["fullName", "full name"], ["email", "email"], ["phone", "phone number"], ["line1", "address"], ["city", "city"], ["state", "state"], ["pincode", "PIN code"]];
    const missing = required.find(([key]) => !address[key].trim());
    if (missing) { setError(`Please enter your ${missing[1]} before payment.`); return; }
    if (!/^\S+@\S+\.\S+$/.test(address.email)) { setError("Please enter a valid email address."); return; }
    if (!/^\+?[0-9]{10,15}$/.test(address.phone.replace(/[\s-]/g, ""))) { setError("Please enter a valid phone number."); return; }
    if (!/^\d{6}$/.test(address.pincode)) { setError("Please enter a valid 6-digit PIN code."); return; }

    setPaying(true);
    try {
      await loadRazorpay();
      const createResponse = await fetch(`${API_URL}/api/payments/create`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customer: address,
        deliveryCharge: delivery,
        items,
      }) });
      const created = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !created.success) throw new Error(created.message || "Could not start payment.");

      const options = {
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        name: "Zavyro Posters",
        description: "Poster order",
        order_id: created.razorpayOrderId,
        prefill: created.customer,
        theme: { color: "#111111" },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: created.attemptId, ...response }) });
            const verified = await verifyResponse.json().catch(() => ({}));
            if (!verifyResponse.ok || !verified.success || !verified.order?.order_number) throw new Error(verified.message || "Payment verification failed.");
            clearCart();
            navigate(`/order-success/${encodeURIComponent(verified.order.order_number)}`, { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");
      new window.Razorpay(options).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
      setPaying(false);
    }
  }

  if (!items.length) return <main className="checkout-page"><section className="checkout-shell checkout-empty"><h1>Your cart is empty</h1><p>Add posters before going to checkout.</p><Link className="checkout-primary-button" to="/shop">Continue Shopping</Link></section></main>;

  return <main className="checkout-page"><section className="checkout-shell">
    <div className="checkout-header"><div><span className="checkout-kicker">SECURE CHECKOUT</span><h1>Complete your order.</h1><p>Payment is enabled only after all delivery details are completed.</p></div><Link className="checkout-back-link" to="/cart">← Back to cart</Link></div>
    <div className="checkout-layout">
      <section className="checkout-form-card"><div className="checkout-section-heading"><span>01</span><div><h2>Customer & delivery details</h2><p>All fields are required before payment.</p></div></div>
        <div className="checkout-fields">
          {([['fullName','Full name'],['email','Email'],['phone','Phone'],['line1','Address'],['city','City'],['state','State'],['pincode','PIN code']] as Array<[keyof Address,string]>).map(([key,label]) => <label key={key} className={key === "line1" ? "checkout-full" : ""}>{label}<input value={address[key]} onChange={(e) => update(key,e.target.value)} autoComplete={key === "fullName" ? "name" : key === "email" ? "email" : key === "phone" ? "tel" : key} /></label>)}
        </div>
        <div className="checkout-payment-box"><strong>Razorpay</strong><span>UPI • Cards • Net Banking</span><small>Your Zavyro Order ID is generated only after Razorpay payment is successfully verified.</small></div>
        {error && <div className="checkout-error">{error}</div>}
        <button type="button" className="checkout-place-button" onClick={() => void startPayment()} disabled={paying}>{paying ? "OPENING PAYMENT…" : `PAY ₹${Math.round(total).toLocaleString("en-IN")}`}</button>
      </section>
      <aside className="checkout-summary-card"><h2>Order summary</h2><div className="checkout-items">{items.map(item => <div className="checkout-item" key={item.id}><img src={item.image} alt=""/><div><strong>{item.title}</strong><span>{item.size} × {item.quantity}</span></div><b>₹{Math.round(item.unitPrice * item.quantity).toLocaleString("en-IN")}</b></div>)}</div><div className="checkout-divider"/><div className="checkout-row"><span>Subtotal</span><strong>₹{Math.round(subtotal).toLocaleString("en-IN")}</strong></div><div className="checkout-row"><span>Delivery</span><strong>{delivery ? `₹${delivery}` : "FREE"}</strong></div><div className="checkout-divider"/><div className="checkout-total"><span>Total</span><strong>₹{Math.round(total).toLocaleString("en-IN")}</strong></div></aside>
    </div>
  </section></main>;
}
