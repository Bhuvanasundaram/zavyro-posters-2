import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  defaultHomepageSettings,
  mergeHomepageSettings,
  type HomepageCombo,
  type HomepageOffer,
  type HomepageSettings,
} from "../../services/homepageContent";
import "./AdminOffersPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";

type Product = {
  id: string;
  name: string;
  category_name?: string | null;
  main_image?: string | null;
  images?: Array<{ image_url: string; is_primary?: boolean }>;
};

function imageOf(product: Product) {
  return product.main_image || product.images?.find((image) => image.is_primary)?.image_url || product.images?.[0]?.image_url || "";
}

const blankOffer = (): HomepageOffer => ({
  id: "", title: "", tag: "SPECIAL OFFER", reason: "", description: "", image: "",
  priceText: "SHOP OFFER", link: "/shop", kind: "standard", buyQuantity: 2, getQuantity: 1, visible: true,
});

const blankCombo = (): HomepageCombo => ({
  id: "", title: "", tag: "COMBO", description: "", mode: "choice", posterCount: 3,
  price: 799, category: "All", productIds: [], visible: true,
});

export default function AdminOffersPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState<HomepageSettings>(defaultHomepageSettings);
  const [products, setProducts] = useState<Product[]>([]);
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newOffer, setNewOffer] = useState(blankOffer);
  const [newCombo, setNewCombo] = useState(blankCombo);

  const canEdit = role === "owner" || role === "admin";
  const categories = useMemo(() => [...new Set(products.map((product) => product.category_name).filter(Boolean) as string[])], [products]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [homepageResponse, productsResponse, profileResponse] = await Promise.all([
          fetch(`${API_URL}/api/admin/homepage`, { credentials: "include" }),
          fetch(`${API_URL}/api/admin/products?status=published`, { credentials: "include" }),
          fetch(`${API_URL}/api/admin/profile`, { credentials: "include" }),
        ]);
        const homepage = await homepageResponse.json();
        const productPayload = await productsResponse.json();
        const profile = await profileResponse.json();
        if (!homepageResponse.ok || !homepage.success) throw new Error(homepage.message || "Unable to load offers.");
        if (!active) return;
        setContent(mergeHomepageSettings(homepage.content));
        setProducts(Array.isArray(productPayload?.products) ? productPayload.products : []);
        setRole(profile?.user?.role || "staff");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load offers.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function updateOffer(id: string, patch: Partial<HomepageOffer>) {
    setContent((current) => ({ ...current, offers: current.offers.map((offer) => offer.id === id ? { ...offer, ...patch } : offer) }));
  }

  function removeOffer(id: string) {
    setContent((current) => ({ ...current, offers: current.offers.filter((offer) => offer.id !== id) }));
  }

  function addOffer() {
    if (!newOffer.title.trim() || !newOffer.image.trim()) return setError("Offer title and image are required.");
    setContent((current) => ({ ...current, offers: [...current.offers, { ...newOffer, id: `offer-${Date.now()}`, title: newOffer.title.trim(), image: newOffer.image.trim() }] }));
    setNewOffer(blankOffer());
    setError("");
  }

  function updateCombo(id: string, patch: Partial<HomepageCombo>) {
    setContent((current) => ({ ...current, combos: current.combos.map((combo) => combo.id === id ? { ...combo, ...patch } : combo) }));
  }

  function removeCombo(id: string) {
    setContent((current) => ({ ...current, combos: current.combos.filter((combo) => combo.id !== id) }));
  }

  function toggleComboProduct(id: string, productId: string) {
    setContent((current) => ({
      ...current,
      combos: current.combos.map((combo) => {
        if (combo.id !== id) return combo;
        const exists = combo.productIds.includes(productId);
        const next = exists ? combo.productIds.filter((item) => item !== productId) : [...combo.productIds, productId];
        return { ...combo, productIds: next.slice(0, 30) };
      }),
    }));
  }

  function addCombo() {
    if (!newCombo.title.trim() || newCombo.price <= 0) return setError("Combo title and price are required.");
    if (newCombo.mode === "fixed" && newCombo.productIds.length !== newCombo.posterCount) return setError(`Fixed combo needs exactly ${newCombo.posterCount} posters.`);
    setContent((current) => ({ ...current, combos: [...current.combos, { ...newCombo, id: `combo-${Date.now()}`, title: newCombo.title.trim() }] }));
    setNewCombo(blankCombo());
    setError("");
  }

  async function save() {
    try {
      setSaving(true); setError(""); setSuccess("");
      const response = await fetch(`${API_URL}/api/admin/homepage`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Failed to save offers and combos.");
      setContent(mergeHomepageSettings(payload.content));
      setSuccess("Offers and combos saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offers and combos.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="z-admin-offers"><div className="z-admin-offers-shell"><p>Loading Offers & Combos...</p></div></main>;

  return (
    <main className="z-admin-offers">
      <div className="z-admin-offers-shell">
        <header className="z-admin-offers-header">
          <div>
            <button type="button" className="z-admin-offers-back" onClick={() => navigate("/admin")}>← Admin Dashboard</button>
            <span>CONTROL CENTER · SALES</span>
            <h1>Offers & Combos</h1>
            <p>Manage customer-facing offers and poster combos from one place.</p>
          </div>
          <button type="button" className="z-admin-offers-save" onClick={() => void save()} disabled={!canEdit || saving}>{saving ? "SAVING..." : "SAVE CHANGES"}</button>
        </header>

        {error && <div className="z-admin-offers-message error">{error}</div>}
        {success && <div className="z-admin-offers-message success">{success}</div>}
        {!canEdit && <div className="z-admin-offers-message error">You can view these settings, but only an owner or admin can save them.</div>}

        <div className="z-admin-offers-tabs">
          <a href="#offers">Offers</a><a href="#combos">Combos</a>
        </div>

        <section className="z-admin-offers-section" id="offers">
          <div className="z-admin-offers-section-head"><div><span>01 · OFFERS</span><h2>Sales & Buy X Get Y</h2><p>Use tags such as DIWALI SALE and choose the Buy X Get Y format when needed.</p></div><strong>{content.offers.filter((offer) => offer.visible).length} active</strong></div>
          <div className="z-admin-offer-list">
            {content.offers.map((offer) => (
              <article className="z-admin-offer-item" key={offer.id}>
                <div className="z-admin-offer-image">{offer.image ? <img src={offer.image} alt={offer.title} /> : <span>IMAGE</span>}</div>
                <div className="z-admin-offer-fields">
                  <Field label="Title" value={offer.title} onChange={(value) => updateOffer(offer.id, { title: value })} />
                  <Field label="Tag" value={offer.tag} onChange={(value) => updateOffer(offer.id, { tag: value })} />
                  <label>Offer type<select value={offer.kind} onChange={(event) => updateOffer(offer.id, { kind: event.target.value as HomepageOffer["kind"] })}><option value="standard">Standard offer</option><option value="buyXGetY">Buy X Get Y</option></select></label>
                  {offer.kind === "buyXGetY" ? <><label>Buy X<input type="number" min={1} value={offer.buyQuantity} onChange={(event) => updateOffer(offer.id, { buyQuantity: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Get Y<input type="number" min={1} value={offer.getQuantity} onChange={(event) => updateOffer(offer.id, { getQuantity: Math.max(1, Number(event.target.value) || 1) })} /></label></> : <Field label="Price / CTA" value={offer.priceText} onChange={(value) => updateOffer(offer.id, { priceText: value })} />}
                  <Field label="Why this offer" value={offer.reason} onChange={(value) => updateOffer(offer.id, { reason: value })} />
                  <Field label="Image URL" value={offer.image} onChange={(value) => updateOffer(offer.id, { image: value })} />
                  <Field label="Click link" value={offer.link} onChange={(value) => updateOffer(offer.id, { link: value })} />
                  <label className="z-admin-offers-full">Description<textarea value={offer.description} onChange={(event) => updateOffer(offer.id, { description: event.target.value })} rows={3} /></label>
                </div>
                <div className="z-admin-offer-actions"><button type="button" onClick={() => updateOffer(offer.id, { visible: !offer.visible })}>{offer.visible ? "Hide" : "Show"}</button><button type="button" className="danger" onClick={() => removeOffer(offer.id)}>Remove</button></div>
              </article>
            ))}
          </div>

          <div className="z-admin-add-box">
            <h3>Add Offer</h3>
            <div className="z-admin-offer-fields">
              <Field label="Title" value={newOffer.title} onChange={(value) => setNewOffer((current) => ({ ...current, title: value }))} />
              <Field label="Tag" value={newOffer.tag} onChange={(value) => setNewOffer((current) => ({ ...current, tag: value }))} />
              <label>Offer type<select value={newOffer.kind} onChange={(event) => setNewOffer((current) => ({ ...current, kind: event.target.value as HomepageOffer["kind"] }))}><option value="standard">Standard offer</option><option value="buyXGetY">Buy X Get Y</option></select></label>
              {newOffer.kind === "buyXGetY" ? <><label>Buy X<input type="number" min={1} value={newOffer.buyQuantity} onChange={(event) => setNewOffer((current) => ({ ...current, buyQuantity: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Get Y<input type="number" min={1} value={newOffer.getQuantity} onChange={(event) => setNewOffer((current) => ({ ...current, getQuantity: Math.max(1, Number(event.target.value) || 1) }))} /></label></> : <Field label="Price / CTA" value={newOffer.priceText} onChange={(value) => setNewOffer((current) => ({ ...current, priceText: value }))} />}
              <Field label="Why this offer" value={newOffer.reason} onChange={(value) => setNewOffer((current) => ({ ...current, reason: value }))} />
              <Field label="Image URL" value={newOffer.image} onChange={(value) => setNewOffer((current) => ({ ...current, image: value }))} />
              <Field label="Click link" value={newOffer.link} onChange={(value) => setNewOffer((current) => ({ ...current, link: value }))} />
              <label className="z-admin-offers-full">Description<textarea value={newOffer.description} onChange={(event) => setNewOffer((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
            </div>
            <button type="button" className="z-admin-add-button" onClick={addOffer}>+ ADD OFFER</button>
          </div>
        </section>

        <section className="z-admin-offers-section" id="combos">
          <div className="z-admin-offers-section-head"><div><span>02 · COMBOS</span><h2>Poster sets</h2><p>Choose the number, price, category and exact shop posters. Customer Choice lets the customer pick; Fixed uses your exact selection.</p></div><strong>{content.combos.filter((combo) => combo.visible).length} active</strong></div>
          <div className="z-admin-combo-list">
            {content.combos.map((combo) => (
              <article className="z-admin-combo-item" key={combo.id}>
                <div className="z-admin-offer-fields">
                  <Field label="Combo title" value={combo.title} onChange={(value) => updateCombo(combo.id, { title: value })} />
                  <Field label="Tag" value={combo.tag} onChange={(value) => updateCombo(combo.id, { tag: value })} />
                  <label>Combo type<select value={combo.mode} onChange={(event) => updateCombo(combo.id, { mode: event.target.value as HomepageCombo["mode"] })}><option value="choice">Customer Choice Combo</option><option value="fixed">Fixed Combo</option></select></label>
                  <label>Poster count<input type="number" min={1} max={12} value={combo.posterCount} onChange={(event) => updateCombo(combo.id, { posterCount: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })} /></label>
                  <label>Combo price<input type="number" min={1} value={combo.price} onChange={(event) => updateCombo(combo.id, { price: Math.max(1, Number(event.target.value) || 1) })} /></label>
                  <label>Category<select value={combo.category} onChange={(event) => updateCombo(combo.id, { category: event.target.value })}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="z-admin-offers-full">Description<textarea value={combo.description} onChange={(event) => updateCombo(combo.id, { description: event.target.value })} rows={3} /></label>
                </div>
                <div className="z-admin-picker-head"><strong>{combo.mode === "fixed" ? "Select the exact posters" : "Select the customer-choice pool (optional)"}</strong><span>{combo.productIds.length} selected</span></div>
                <div className="z-admin-product-grid">
                  {products.map((product) => {
                    const selected = combo.productIds.includes(product.id);
                    const locked = combo.mode === "fixed" && !selected && combo.productIds.length >= combo.posterCount;
                    return <button type="button" key={product.id} disabled={locked} className={selected ? "selected" : ""} onClick={() => toggleComboProduct(combo.id, product.id)}><span className="z-admin-product-image"><img src={imageOf(product)} alt={product.name} /></span><b>{selected ? "SELECTED" : locked ? "LIMIT" : "ADD"}</b><strong>{product.name}</strong><small>{product.category_name || ""}</small></button>;
                  })}
                </div>
                <div className="z-admin-offer-actions"><button type="button" onClick={() => updateCombo(combo.id, { visible: !combo.visible })}>{combo.visible ? "Hide" : "Show"}</button><button type="button" className="danger" onClick={() => removeCombo(combo.id)}>Remove</button></div>
              </article>
            ))}
          </div>

          <div className="z-admin-add-box">
            <h3>Add Combo</h3>
            <div className="z-admin-offer-fields">
              <Field label="Combo title" value={newCombo.title} onChange={(value) => setNewCombo((current) => ({ ...current, title: value }))} />
              <Field label="Tag" value={newCombo.tag} onChange={(value) => setNewCombo((current) => ({ ...current, tag: value }))} />
              <label>Combo type<select value={newCombo.mode} onChange={(event) => setNewCombo((current) => ({ ...current, mode: event.target.value as HomepageCombo["mode"] }))}><option value="choice">Customer Choice Combo</option><option value="fixed">Fixed Combo</option></select></label>
              <label>Poster count<input type="number" min={1} max={12} value={newCombo.posterCount} onChange={(event) => setNewCombo((current) => ({ ...current, posterCount: Math.min(12, Math.max(1, Number(event.target.value) || 1)) }))} /></label>
              <label>Combo price<input type="number" min={1} value={newCombo.price} onChange={(event) => setNewCombo((current) => ({ ...current, price: Math.max(1, Number(event.target.value) || 1) }))} /></label>
              <label>Category<select value={newCombo.category} onChange={(event) => setNewCombo((current) => ({ ...current, category: event.target.value }))}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="z-admin-offers-full">Description<textarea value={newCombo.description} onChange={(event) => setNewCombo((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
            </div>
            <button type="button" className="z-admin-add-button" onClick={addCombo}>+ ADD COMBO</button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
