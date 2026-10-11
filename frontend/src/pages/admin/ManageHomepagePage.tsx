import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  defaultHomepageSettings,
  mergeHomepageSettings,
  type HomepageFanMedia,
  type HomepageReview,
  type HomepageSettings,
  type HomepagePoster,
  type CollectionItem,
  type HomepageOffer,
  type HomepageCombo,
} from "../../services/homepageContent";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

type ProductOption = {
  id: string;
  name: string;
  category_name?: string | null;
  main_image?: string | null;
  images?: Array<{
    image_url: string;
    image_type?: string;
    is_primary?: boolean;
  }>;
};

function productToPoster(product: ProductOption): HomepagePoster | null {
  const image =
    product.main_image ||
    product.images?.find((item) => item.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    "";

  if (!image) return null;

  return {
    id: `product-${product.id}`,
    productId: product.id,
    title: product.name,
    category: product.category_name || "",
    image,
  };
}

export default function ManageHomepagePage() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const [content, setContent] =
    useState<HomepageSettings>(defaultHomepageSettings);
  const [products, setProducts] =
    useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "staff">("staff");

  const [newReview, setNewReview] =
    useState<HomepageReview>({
      id: "",
      name: "",
      rating: 5,
      text: "",
      product: "",
      visible: true,
    });

  const [newMedia, setNewMedia] =
    useState<HomepageFanMedia>({
      id: "",
      type: "image",
      src: "",
      label: "Customer Poster",
      visible: true,
    });

  const [newOffer, setNewOffer] = useState<HomepageOffer>({
    id: "", title: "", tag: "SPECIAL OFFER", reason: "", description: "",
    image: "", priceText: "SHOP OFFER", link: "/shop", kind: "standard", buyQuantity: 2, getQuantity: 1, visible: true,
  });

  const [newCombo, setNewCombo] = useState<HomepageCombo>({
    id: "", title: "", tag: "COMBO", description: "", mode: "choice",
    posterCount: 3, price: 799, category: "All", productIds: [], visible: true,
  });

  const canEdit = role === "owner" || role === "admin";

  const productOptions = useMemo(
    () =>
      products
        .map(productToPoster)
        .filter(Boolean) as HomepagePoster[],
    [products],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [homepageResponse, productsResponse, profileResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/admin/homepage`, {
              credentials: "include",
            }),
            fetch(
              `${API_URL}/api/admin/products?status=published`,
              {
                credentials: "include",
              },
            ),
            fetch(`${API_URL}/api/admin/profile`, {
              credentials: "include",
            }),
          ]);

        const homepagePayload =
          await homepageResponse.json();
        const productsPayload =
          await productsResponse.json();
        const profilePayload =
          await profileResponse.json();

        if (
          !homepageResponse.ok ||
          !homepagePayload.success
        ) {
          throw new Error(
            homepagePayload.message ||
              "Failed to load homepage settings.",
          );
        }

        if (active) {
          setContent(
            mergeHomepageSettings(
              homepagePayload.content,
            ),
          );

          setProducts(
            Array.isArray(productsPayload.products)
              ? productsPayload.products
              : [],
          );

          if (
            profilePayload?.user?.role === "owner" ||
            profilePayload?.user?.role === "admin" ||
            profilePayload?.user?.role === "staff"
          ) {
            setRole(profilePayload.user.role);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load homepage settings.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  function updateHero(
    patch: Partial<HomepageSettings["hero"]>,
  ) {
    setContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        ...patch,
      },
    }));
  }

  function toggleSection(
    key: keyof HomepageSettings["sections"],
  ) {
    setContent((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: !current.sections[key],
      },
    }));
  }

  function addTrendingPoster(poster: HomepagePoster) {
    setContent((current) => {
      if (current.trendingPosters.some((item) => item.productId === poster.productId)) {
        return current;
      }

      return {
        ...current,
        trendingPosters: [...current.trendingPosters, poster].slice(0, 30),
      };
    });
  }

  function removeTrendingPoster(id: string) {
    setContent((current) => ({
      ...current,
      trendingPosters: current.trendingPosters.filter((item) => item.id !== id),
    }));
  }

  function updateDisplay<K extends keyof HomepageSettings["display"]>(
    key: K,
    patch: Partial<HomepageSettings["display"][K]>,
  ) {
    setContent((current) => ({
      ...current,
      display: {
        ...current.display,
        [key]: { ...current.display[key], ...patch },
      },
    }));
  }

  function updateCollection(id: string, patch: Partial<CollectionItem>) {
    setContent((current) => ({
      ...current,
      collections: current.collections.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addCollection() {
    setContent((current) => ({
      ...current,
      collections: [
        ...current.collections,
        {
          id: `collection-${Date.now()}`,
          title: "NEW COLLECTION",
          subtitle: "EXPLORE THE STYLE",
          image: "",
          link: "/shop",
        },
      ],
    }));
  }

  function removeCollection(id: string) {
    setContent((current) => ({
      ...current,
      collections: current.collections.filter((item) => item.id !== id),
    }));
  }

  function addReview() {
    if (
      !newReview.name.trim() ||
      !newReview.text.trim()
    ) {
      setError("Review name and text are required.");
      return;
    }

    const review: HomepageReview = {
      ...newReview,
      id: `review-${Date.now()}`,
      name: newReview.name.trim(),
      text: newReview.text.trim(),
      product:
        newReview.product.trim() ||
        "Zavyro Poster",
    };

    setContent((current) => ({
      ...current,
      reviews: [...current.reviews, review],
    }));

    setNewReview({
      id: "",
      name: "",
      rating: 5,
      text: "",
      product: "",
      visible: true,
    });
    setError("");
  }

  function updateReview(
    id: string,
    patch: Partial<HomepageReview>,
  ) {
    setContent((current) => ({
      ...current,
      reviews: current.reviews.map((review) =>
        review.id === id
          ? { ...review, ...patch }
          : review,
      ),
    }));
  }

  function removeReview(id: string) {
    setContent((current) => ({
      ...current,
      reviews: current.reviews.filter(
        (review) => review.id !== id,
      ),
    }));
  }

  function addMedia() {
    if (!newMedia.src.trim()) {
      setError("Media URL is required.");
      return;
    }

    setContent((current) => ({
      ...current,
      fanMedia: [
        ...current.fanMedia,
        {
          ...newMedia,
          id: `media-${Date.now()}`,
          src: newMedia.src.trim(),
          label:
            newMedia.label.trim() ||
            "Customer Poster",
        },
      ],
    }));

    setNewMedia({
      id: "",
      type: "image",
      src: "",
      label: "Customer Poster",
      visible: true,
    });
    setError("");
  }

  function updateMedia(
    id: string,
    patch: Partial<HomepageFanMedia>,
  ) {
    setContent((current) => ({
      ...current,
      fanMedia: current.fanMedia.map((item) =>
        item.id === id
          ? { ...item, ...patch }
          : item,
      ),
    }));
  }

  function removeMedia(id: string) {
    setContent((current) => ({
      ...current,
      fanMedia: current.fanMedia.filter(
        (item) => item.id !== id,
      ),
    }));
  }

  function addOffer() {
    if (!newOffer.title.trim() || !newOffer.image.trim()) {
      setError("Offer title and image URL are required.");
      return;
    }
    setContent((current) => ({
      ...current,
      offers: [...current.offers, { ...newOffer, id: `offer-${Date.now()}`, title: newOffer.title.trim(), image: newOffer.image.trim() }],
    }));
    setNewOffer({ id: "", title: "", tag: "SPECIAL OFFER", reason: "", description: "", image: "", priceText: "SHOP OFFER", link: "/shop", kind: "standard", buyQuantity: 2, getQuantity: 1, visible: true });
    setError("");
  }

  function updateOffer(id: string, patch: Partial<HomepageOffer>) {
    setContent((current) => ({ ...current, offers: current.offers.map((offer) => offer.id === id ? { ...offer, ...patch } : offer) }));
  }

  function removeOffer(id: string) {
    setContent((current) => ({ ...current, offers: current.offers.filter((offer) => offer.id !== id) }));
  }

  function addCombo() {
    if (!newCombo.title.trim() || newCombo.price <= 0) {
      setError("Combo title and price are required.");
      return;
    }
    if (newCombo.mode === "fixed" && newCombo.productIds.length !== newCombo.posterCount) {
      setError(`Fixed combo needs exactly ${newCombo.posterCount} selected posters.`);
      return;
    }
    setContent((current) => ({
      ...current,
      combos: [...current.combos, { ...newCombo, id: `combo-${Date.now()}`, title: newCombo.title.trim() }],
    }));
    setNewCombo({ id: "", title: "", tag: "COMBO", description: "", mode: "choice", posterCount: 3, price: 799, category: "All", productIds: [], visible: true });
    setError("");
  }

  function updateCombo(id: string, patch: Partial<HomepageCombo>) {
    setContent((current) => ({ ...current, combos: current.combos.map((combo) => combo.id === id ? { ...combo, ...patch } : combo) }));
  }

  function removeCombo(id: string) {
    setContent((current) => ({ ...current, combos: current.combos.filter((combo) => combo.id !== id) }));
  }

  function toggleComboProduct(comboId: string, productId: string) {
    setContent((current) => ({
      ...current,
      combos: current.combos.map((combo) => {
        if (combo.id !== comboId) return combo;
        const exists = combo.productIds.includes(productId);
        const next = exists ? combo.productIds.filter((id) => id !== productId) : [...combo.productIds, productId];
        return { ...combo, productIds: next.slice(0, 30) };
      }),
    }));
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/homepage`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "Failed to save homepage settings.",
        );
      }

      setContent(
        mergeHomepageSettings(payload.content),
      );
      setSuccess(
        "Homepage settings saved successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save homepage settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="z-home-admin-page">
        <div className="z-home-admin-loading">
          Loading homepage controls...
        </div>
      </main>
    );
  }

  return (
    <main
      className={`z-home-admin-page ${
        resolvedTheme === "dark"
          ? "is-dark"
          : "is-light"
      }`}
    >
      <style>{styles}</style>

      <div className="z-home-admin-wrap">
        <header className="z-home-admin-header">
          <div>
            <button
              type="button"
              className="z-home-back"
              onClick={() => navigate("/admin")}
            >
              ← Admin Dashboard
            </button>

            <p className="z-home-eyebrow">
              ZAVYRO POSTERS • HOMEPAGE CONTROL
            </p>

            <h1>Homepage Manager</h1>

            <p>
              Decide exactly which background, posters,
              reviews and customer media appear on the
              public homepage.
            </p>
          </div>

          <button
            type="button"
            className="z-home-save"
            onClick={() => void save()}
            disabled={!canEdit || saving}
          >
            {saving ? "SAVING..." : "SAVE HOMEPAGE"}
          </button>
        </header>

        {error && (
          <div className="z-home-message error">
            {error}
          </div>
        )}

        {success && (
          <div className="z-home-message success">
            {success}
          </div>
        )}

        {!canEdit && (
          <div className="z-home-message error">
            You can view homepage settings, but only an owner or admin can save changes.
          </div>
        )}

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>01</span>
              <div>
                <h2>Homepage Sections</h2>
                <p>
                  Turn homepage blocks on or off without
                  touching code.
                </p>
              </div>
            </div>
          </div>

          <div className="z-home-switch-grid">
            {(
              [
                ["collections", "Shop by Collection"],
                ["offers", "Offer Ticker"],
                ["trending", "Trending Posters"],
                ["reviews", "Customer Reviews"],
                ["fanMedia", "Customer Media"],
                ["customizeCta", "Customize CTA"],
                ["finalCta", "Final CTA"],
              ] as Array<
                [
                  keyof HomepageSettings["sections"],
                  string,
                ]
              >
            ).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`z-home-switch ${
                  content.sections[key]
                    ? "on"
                    : ""
                }`}
                onClick={() =>
                  toggleSection(key)
                }
              >
                <span>
                  {content.sections[key]
                    ? "✓"
                    : "×"}
                </span>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>02</span>
              <div>
                <h2>Homepage Display Controls</h2>
                <p>Set how many items appear and how fast each moving section loops.</p>
              </div>
            </div>
          </div>

          <div className="z-home-display-grid">
            <DisplayControl
              label="Shop by Collection"
              count={content.display.collections.count}
              speed={content.display.collections.speed}
              max={30}
              onCount={(value) => updateDisplay("collections", { count: value })}
              onSpeed={(value) => updateDisplay("collections", { speed: value })}
            />
            <DisplayControl
              label="Offer Ticker"
              count={content.display.offers.count}
              speed={content.display.offers.speed}
              max={20}
              onCount={(value) => updateDisplay("offers", { count: value })}
              onSpeed={(value) => updateDisplay("offers", { speed: value })}
            />
            <DisplayControl
              label="Trending Posters"
              count={content.display.trending.count}
              speed={content.display.trending.speed}
              max={30}
              onCount={(value) => updateDisplay("trending", { count: value })}
              onSpeed={(value) => updateDisplay("trending", { speed: value })}
            />
            <DisplayControl
              label="Customer Reviews"
              count={content.display.reviews.count}
              speed={content.display.reviews.speed}
              max={30}
              onCount={(value) => updateDisplay("reviews", { count: value })}
              onSpeed={(value) => updateDisplay("reviews", { speed: value })}
            />
            <DisplayControl
              label="Customer Wall"
              count={content.display.fanMedia.count}
              speed={content.display.fanMedia.speed}
              max={30}
              onCount={(value) => updateDisplay("fanMedia", { count: value })}
              onSpeed={(value) => updateDisplay("fanMedia", { speed: value })}
            />
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>03</span>
              <div>
                <h2>Hero / Main Background</h2>
                <p>
                  This is the first visual visitors see.
                </p>
              </div>
            </div>
          </div>

          <div className="z-home-hero-editor">
            <div>
              <label>Background image URL</label>
              <input
                value={content.hero.backgroundImage}
                onChange={(event) =>
                  updateHero({
                    backgroundImage:
                      event.target.value,
                  })
                }
                placeholder="https://..."
              />

              {content.hero.backgroundImage && (
                <img
                  className="z-home-bg-preview"
                  src={content.hero.backgroundImage}
                  alt="Homepage background preview"
                />
              )}
            </div>

            <div className="z-home-field-grid">
              <Field
                label="Eyebrow"
                value={content.hero.eyebrow}
                onChange={(value) =>
                  updateHero({ eyebrow: value })
                }
              />
              <Field
                label="Heading line one"
                value={content.hero.headingLineOne}
                onChange={(value) =>
                  updateHero({
                    headingLineOne: value,
                  })
                }
              />
              <Field
                label="Heading line two"
                value={content.hero.headingLineTwo}
                onChange={(value) =>
                  updateHero({
                    headingLineTwo: value,
                  })
                }
              />
              <Field
                label="Primary button"
                value={content.hero.primaryButton}
                onChange={(value) =>
                  updateHero({
                    primaryButton: value,
                  })
                }
              />
              <Field
                label="Secondary button"
                value={content.hero.secondaryButton}
                onChange={(value) =>
                  updateHero({
                    secondaryButton: value,
                  })
                }
              />
            </div>

            <label>Description</label>
            <textarea
              value={content.hero.description}
              onChange={(event) =>
                updateHero({
                  description: event.target.value,
                })
              }
              rows={4}
            />
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>04</span>
              <div>
                <h2>Shop by Collection</h2>
                <p>Edit the cards, links and images shown in the homepage collection loop.</p>
              </div>
            </div>
            <strong>{content.collections.length} items</strong>
          </div>

          <div className="z-home-collection-list">
            {content.collections.map((item) => (
              <div className="z-home-collection-item" key={item.id}>
                <div className="z-home-collection-preview">
                  {item.image ? <img src={item.image} alt={item.title} /> : <span>IMAGE</span>}
                </div>
                <div className="z-home-field-grid">
                  <Field label="Title" value={item.title} onChange={(value) => updateCollection(item.id, { title: value })} />
                  <Field label="Subtitle" value={item.subtitle} onChange={(value) => updateCollection(item.id, { subtitle: value })} />
                  <Field label="Image URL" value={item.image} onChange={(value) => updateCollection(item.id, { image: value })} />
                  <Field label="Shop link" value={item.link} onChange={(value) => updateCollection(item.id, { link: value })} />
                </div>
                <button type="button" className="z-home-danger-button" onClick={() => removeCollection(item.id)}>REMOVE</button>
              </div>
            ))}
          </div>

          <button type="button" className="z-home-secondary-button" onClick={addCollection}>+ ADD COLLECTION</button>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div><span>05</span><div><h2>Offers</h2><p>Create the dedicated offers customers see on the Offers page.</p></div></div>
            <strong>{content.offers.filter((offer) => offer.visible).length} active</strong>
          </div>

          <div className="z-home-offer-admin-list">
            {content.offers.map((offer) => (
              <div className="z-home-offer-admin-item" key={offer.id}>
                <div className="z-home-collection-preview">{offer.image ? <img src={offer.image} alt={offer.title} /> : <span>IMAGE</span>}</div>
                <div className="z-home-field-grid">
                  <Field label="Title" value={offer.title} onChange={(value) => updateOffer(offer.id, { title: value })} />
                  <Field label="Tag (e.g. DIWALI SALE)" value={offer.tag} onChange={(value) => updateOffer(offer.id, { tag: value })} />
                  <label>Offer type<select value={offer.kind} onChange={(event) => updateOffer(offer.id, { kind: event.target.value as HomepageOffer["kind"] })}><option value="standard">Standard offer</option><option value="buyXGetY">Buy X Get Y</option></select></label>
                  {offer.kind === "buyXGetY" ? <><label>Buy X<input type="number" min={1} value={offer.buyQuantity} onChange={(event) => updateOffer(offer.id, { buyQuantity: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Get Y<input type="number" min={1} value={offer.getQuantity} onChange={(event) => updateOffer(offer.id, { getQuantity: Math.max(1, Number(event.target.value) || 1) })} /></label></> : null}
                  <Field label="Why this offer" value={offer.reason} onChange={(value) => updateOffer(offer.id, { reason: value })} />
                  <Field label="Price / CTA text" value={offer.priceText} onChange={(value) => updateOffer(offer.id, { priceText: value })} />
                  <Field label="Image URL" value={offer.image} onChange={(value) => updateOffer(offer.id, { image: value })} />
                  <Field label="Click link" value={offer.link} onChange={(value) => updateOffer(offer.id, { link: value })} />
                  <label className="z-home-full-field">Description<textarea value={offer.description} onChange={(event) => updateOffer(offer.id, { description: event.target.value })} rows={3} /></label>
                </div>
                <div className="z-home-inline-actions"><button type="button" onClick={() => updateOffer(offer.id, { visible: !offer.visible })}>{offer.visible ? "Hide" : "Show"}</button><button type="button" className="danger" onClick={() => removeOffer(offer.id)}>Remove</button></div>
              </div>
            ))}
          </div>

          <div className="z-home-add-box">
            <h3>Add Offer</h3>
            <div className="z-home-field-grid">
              <Field label="Title" value={newOffer.title} onChange={(value) => setNewOffer((current) => ({ ...current, title: value }))} />
              <Field label="Tag" value={newOffer.tag} onChange={(value) => setNewOffer((current) => ({ ...current, tag: value }))} />
              <label>Offer type<select value={newOffer.kind} onChange={(event) => setNewOffer((current) => ({ ...current, kind: event.target.value as HomepageOffer["kind"] }))}><option value="standard">Standard offer</option><option value="buyXGetY">Buy X Get Y</option></select></label>
              {newOffer.kind === "buyXGetY" ? <><label>Buy X<input type="number" min={1} value={newOffer.buyQuantity} onChange={(event) => setNewOffer((current) => ({ ...current, buyQuantity: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Get Y<input type="number" min={1} value={newOffer.getQuantity} onChange={(event) => setNewOffer((current) => ({ ...current, getQuantity: Math.max(1, Number(event.target.value) || 1) }))} /></label></> : null}
              <Field label="Why this offer" value={newOffer.reason} onChange={(value) => setNewOffer((current) => ({ ...current, reason: value }))} />
              <Field label="Price / CTA text" value={newOffer.priceText} onChange={(value) => setNewOffer((current) => ({ ...current, priceText: value }))} />
              <Field label="Image URL" value={newOffer.image} onChange={(value) => setNewOffer((current) => ({ ...current, image: value }))} />
              <Field label="Click link" value={newOffer.link} onChange={(value) => setNewOffer((current) => ({ ...current, link: value }))} />
            </div>
            <label>Description<textarea value={newOffer.description} onChange={(event) => setNewOffer((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
            <button type="button" className="z-home-secondary-button" onClick={addOffer}>+ ADD OFFER</button>
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div><span>06</span><div><h2>Combos</h2><p>Create fixed poster sets or customer-choice combos. Customers see the first slide as a wall mockup.</p></div></div>
            <strong>{content.combos.filter((combo) => combo.visible).length} active</strong>
          </div>

          <div className="z-home-combo-admin-list">
            {content.combos.map((combo) => (
              <div className="z-home-combo-admin-item" key={combo.id}>
                <div className="z-home-field-grid">
                  <Field label="Combo title" value={combo.title} onChange={(value) => updateCombo(combo.id, { title: value })} />
                  <Field label="Tag" value={combo.tag} onChange={(value) => updateCombo(combo.id, { tag: value })} />
                  <label>Type<select value={combo.mode} onChange={(event) => updateCombo(combo.id, { mode: event.target.value as HomepageCombo["mode"] })}><option value="choice">Customer chooses posters</option><option value="fixed">Fixed combo</option></select></label>
                  <label>Posters in combo<input type="number" min={1} max={12} value={combo.posterCount} onChange={(event) => updateCombo(combo.id, { posterCount: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })} /></label>
                  <label>Combo price<input type="number" min={1} value={combo.price} onChange={(event) => updateCombo(combo.id, { price: Math.max(1, Number(event.target.value) || 1) })} /></label>
                  <label>Category<select value={combo.category} onChange={(event) => updateCombo(combo.id, { category: event.target.value })}><option>All</option>{[...new Set(products.map((product) => product.category_name).filter(Boolean) as string[])].map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="z-home-full-field">Description<textarea value={combo.description} onChange={(event) => updateCombo(combo.id, { description: event.target.value })} rows={3} /></label>
                </div>

                <div className="z-home-combo-picker-head"><strong>{combo.mode === "fixed" ? "Choose the exact posters in this combo" : "Optional: choose the posters customers may pick from"}</strong><span>{combo.productIds.length} selected</span></div>
                <div className="z-home-product-grid">
                  {productOptions.map((product) => {
                    const selected = !!product.productId && combo.productIds.includes(product.productId);
                    const fixedLimit = combo.mode === "fixed" && !selected && combo.productIds.length >= combo.posterCount;
                    return <button type="button" key={product.id} className={`z-home-product ${selected ? "selected" : ""}`} disabled={fixedLimit} onClick={() => product.productId && toggleComboProduct(combo.id, product.productId)}><img src={product.image} alt={product.title}/><span>{selected ? "SELECTED" : fixedLimit ? "LIMIT" : "ADD"}</span><strong>{product.title}</strong><small>{product.category}</small></button>;
                  })}
                </div>
                <div className="z-home-inline-actions"><button type="button" onClick={() => updateCombo(combo.id, { visible: !combo.visible })}>{combo.visible ? "Hide" : "Show"}</button><button type="button" className="danger" onClick={() => removeCombo(combo.id)}>Remove</button></div>
              </div>
            ))}
          </div>

          <div className="z-home-add-box">
            <h3>Add Combo</h3>
            <div className="z-home-field-grid">
              <Field label="Combo title" value={newCombo.title} onChange={(value) => setNewCombo((current) => ({ ...current, title: value }))} />
              <Field label="Tag" value={newCombo.tag} onChange={(value) => setNewCombo((current) => ({ ...current, tag: value }))} />
              <label>Type<select value={newCombo.mode} onChange={(event) => setNewCombo((current) => ({ ...current, mode: event.target.value as HomepageCombo["mode"] }))}><option value="choice">Customer chooses posters</option><option value="fixed">Fixed combo</option></select></label>
              <label>Posters in combo<input type="number" min={1} max={12} value={newCombo.posterCount} onChange={(event) => setNewCombo((current) => ({ ...current, posterCount: Math.min(12, Math.max(1, Number(event.target.value) || 1)) }))} /></label>
              <label>Combo price<input type="number" min={1} value={newCombo.price} onChange={(event) => setNewCombo((current) => ({ ...current, price: Math.max(1, Number(event.target.value) || 1) }))} /></label>
              <label>Category<select value={newCombo.category} onChange={(event) => setNewCombo((current) => ({ ...current, category: event.target.value }))}><option>All</option>{[...new Set(products.map((product) => product.category_name).filter(Boolean) as string[])].map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            <label>Description<textarea value={newCombo.description} onChange={(event) => setNewCombo((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
            <p className="z-home-helper">After adding the combo, select its posters from the shop catalog above. Fixed combos require the exact number selected; customer-choice combos can use any selected pool or the whole category.</p>
            <button type="button" className="z-home-secondary-button" onClick={addCombo}>+ ADD COMBO</button>
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>07</span>
              <div>
                <h2>Trending Posters</h2>
                <p>
                  Choose the products that appear in the
                  animated trending section.
                </p>
              </div>
            </div>
            <strong>
              {content.trendingPosters.length}/30
            </strong>
          </div>

          <SelectedPosters
            posters={content.trendingPosters}
            onRemove={removeTrendingPoster}
          />

          <ProductPicker
            products={productOptions}
            selected={content.trendingPosters}
            onAdd={addTrendingPoster}
            limit={30}
          />
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>05</span>
              <div>
                <h2>Customer Reviews</h2>
                <p>
                  Add, edit, hide or remove the reviews shown
                  on the homepage.
                </p>
              </div>
            </div>
            <strong>
              {content.reviews.filter(
                (review) => review.visible,
              ).length}{" "}
              visible
            </strong>
          </div>

          <div className="z-home-review-list">
            {content.reviews.map((review) => (
              <div
                className={`z-home-review ${
                  review.visible ? "" : "muted"
                }`}
                key={review.id}
              >
                <div className="z-home-review-top">
                  <div>
                    <strong>{review.name}</strong>
                    <span>
                      {"★".repeat(review.rating)}{" "}
                      • {review.product}
                    </span>
                  </div>

                  <div className="z-home-inline-actions">
                    <button
                      type="button"
                      onClick={() =>
                        updateReview(
                          review.id,
                          {
                            visible:
                              !review.visible,
                          },
                        )
                      }
                    >
                      {review.visible
                        ? "Hide"
                        : "Show"}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        removeReview(review.id)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <textarea
                  value={review.text}
                  onChange={(event) =>
                    updateReview(
                      review.id,
                      {
                        text: event.target.value,
                      },
                    )
                  }
                  rows={3}
                />

                <div className="z-home-field-grid">
                  <Field
                    label="Customer name"
                    value={review.name}
                    onChange={(value) =>
                      updateReview(
                        review.id,
                        { name: value },
                      )
                    }
                  />

                  <Field
                    label="Product label"
                    value={review.product}
                    onChange={(value) =>
                      updateReview(
                        review.id,
                        { product: value },
                      )
                    }
                  />

                  <label>
                    Rating
                    <select
                      value={review.rating}
                      onChange={(event) =>
                        updateReview(
                          review.id,
                          {
                            rating: Number(
                              event.target.value,
                            ),
                          },
                        )
                      }
                    >
                      {[1, 2, 3, 4, 5].map(
                        (rating) => (
                          <option
                            key={rating}
                            value={rating}
                          >
                            {rating} / 5
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="z-home-add-box">
            <h3>Add Homepage Review</h3>

            <div className="z-home-field-grid">
              <Field
                label="Customer name"
                value={newReview.name}
                onChange={(value) =>
                  setNewReview((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <Field
                label="Product label"
                value={newReview.product}
                onChange={(value) =>
                  setNewReview((current) => ({
                    ...current,
                    product: value,
                  }))
                }
              />

              <label>
                Rating
                <select
                  value={newReview.rating}
                  onChange={(event) =>
                    setNewReview((current) => ({
                      ...current,
                      rating: Number(
                        event.target.value,
                      ),
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5].map(
                    (rating) => (
                      <option
                        key={rating}
                        value={rating}
                      >
                        {rating} / 5
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <label>
              Review
              <textarea
                value={newReview.text}
                onChange={(event) =>
                  setNewReview((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Write the customer review..."
              />
            </label>

            <button
              type="button"
              className="z-home-secondary-button"
              onClick={addReview}
            >
              + ADD REVIEW
            </button>
          </div>
        </section>

        <section className="z-home-card">
          <div className="z-home-card-head">
            <div>
              <span>06</span>
              <div>
                <h2>Customer Media</h2>
                <p>
                  Control the customer/fan media strip.
                </p>
              </div>
            </div>
          </div>

          <div className="z-home-media-list">
            {content.fanMedia.map((item) => (
              <div
                className={`z-home-media-item ${
                  item.visible ? "" : "muted"
                }`}
                key={item.id}
              >
                <img
                  src={item.src}
                  alt={item.label}
                />

                <div>
                  <Field
                    label="Label"
                    value={item.label}
                    onChange={(value) =>
                      updateMedia(
                        item.id,
                        { label: value },
                      )
                    }
                  />
                  <Field
                    label="Media URL"
                    value={item.src}
                    onChange={(value) =>
                      updateMedia(
                        item.id,
                        { src: value },
                      )
                    }
                  />
                </div>

                <div className="z-home-inline-actions">
                  <button
                    type="button"
                    onClick={() =>
                      updateMedia(item.id, {
                        visible: !item.visible,
                      })
                    }
                  >
                    {item.visible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      removeMedia(item.id)
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="z-home-add-box">
            <h3>Add Customer Media</h3>

            <div className="z-home-field-grid">
              <Field
                label="Media URL"
                value={newMedia.src}
                onChange={(value) =>
                  setNewMedia((current) => ({
                    ...current,
                    src: value,
                  }))
                }
              />
              <Field
                label="Label"
                value={newMedia.label}
                onChange={(value) =>
                  setNewMedia((current) => ({
                    ...current,
                    label: value,
                  }))
                }
              />
            </div>

            <button
              type="button"
              className="z-home-secondary-button"
              onClick={addMedia}
            >
              + ADD MEDIA
            </button>
          </div>
        </section>

        <div className="z-home-bottom-actions">
          <button
            type="button"
            onClick={() => navigate("/")}
          >
            VIEW HOMEPAGE
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving
              ? "SAVING..."
              : "SAVE HOMEPAGE"}
          </button>
        </div>
      </div>
    </main>
  );
}

function DisplayControl({
  label,
  count,
  speed,
  max,
  onCount,
  onSpeed,
}: {
  label: string;
  count: number;
  speed: number;
  max: number;
  onCount: (value: number) => void;
  onSpeed: (value: number) => void;
}) {
  return (
    <div className="z-home-display-control">
      <strong>{label}</strong>
      <div className="z-home-display-fields">
        <label>
          Count
          <input
            type="number"
            min={1}
            max={max}
            value={count}
            onChange={(event) => onCount(Math.min(max, Math.max(1, Number(event.target.value) || 1)))}
          />
        </label>
        <label>
          Speed (seconds)
          <input
            type="number"
            min={8}
            max={180}
            value={speed}
            onChange={(event) => onSpeed(Math.min(180, Math.max(8, Number(event.target.value) || 8)))}
          />
        </label>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
}

function SelectedPosters({
  posters,
  onRemove,
}: {
  posters: HomepagePoster[];
  onRemove: (id: string) => void;
}) {
  if (posters.length === 0) {
    return (
      <div className="z-home-empty">
        No posters selected yet.
      </div>
    );
  }

  return (
    <div className="z-home-selected-grid">
      {posters.map((poster, index) => (
        <div
          className="z-home-selected-poster"
          key={poster.id}
        >
          <img
            src={poster.image}
            alt={poster.title}
          />
          <span>#{index + 1}</span>
          <div>
            <strong>{poster.title}</strong>
            <button
              type="button"
              onClick={() =>
                onRemove(poster.id)
              }
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductPicker({
  products,
  selected,
  onAdd,
  limit,
}: {
  products: HomepagePoster[];
  selected: HomepagePoster[];
  onAdd: (poster: HomepagePoster) => void;
  limit: number;
}) {
  const selectedIds = new Set(
    selected.map((poster) => poster.productId),
  );

  return (
    <div className="z-home-picker">
      <div className="z-home-picker-head">
        <strong>Choose from published posters</strong>
        <span>
          {selected.length}/{limit} selected
        </span>
      </div>

      {products.length === 0 ? (
        <div className="z-home-empty">
          No published posters available.
        </div>
      ) : (
        <div className="z-home-product-grid">
          {products.map((product) => {
            const selectedAlready =
              !!product.productId &&
              selectedIds.has(product.productId);

            const reachedLimit =
              selected.length >= limit;

            return (
              <button
                type="button"
                key={product.id}
                className={`z-home-product ${
                  selectedAlready ? "selected" : ""
                }`}
                onClick={() =>
                  !selectedAlready &&
                  !reachedLimit &&
                  onAdd(product)
                }
                disabled={
                  selectedAlready ||
                  reachedLimit
                }
              >
                <img
                  src={product.image}
                  alt={product.title}
                />
                <span>
                  {selectedAlready
                    ? "SELECTED"
                    : reachedLimit
                      ? "LIMIT REACHED"
                      : "ADD"}
                </span>
                <strong>{product.title}</strong>
                <small>
                  {product.category}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = `
.z-home-display-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:8px}
.z-home-display-control{padding:14px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background)}
.z-home-display-control>strong{display:block;margin-bottom:10px;font-size:12px}
.z-home-display-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.z-home-display-fields label{display:block;font-size:10px;color:var(--color-text-muted)}
.z-home-display-fields input{width:100%;margin-top:5px}
.z-home-collection-list{display:grid;gap:12px;margin-bottom:12px}
.z-home-collection-item{display:grid;grid-template-columns:90px 1fr auto;gap:12px;align-items:start;padding:12px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background)}
.z-home-collection-preview{width:90px;height:120px;border-radius:8px;overflow:hidden;background:var(--color-surface);display:grid;place-items:center;color:var(--color-text-muted);font-size:9px;font-weight:800}
.z-home-collection-preview img{width:100%;height:100%;object-fit:cover}
.z-home-danger-button{border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.08);color:#ef4444;border-radius:9px;padding:9px 10px;font-weight:800;cursor:pointer}
@media(max-width:700px){.z-home-offer-admin-item{grid-template-columns:70px 1fr}.z-home-offer-admin-item>.z-home-inline-actions{grid-column:1/-1}.z-home-display-grid{grid-template-columns:1fr}.z-home-display-fields{grid-template-columns:1fr 1fr}.z-home-collection-item{grid-template-columns:70px 1fr}.z-home-collection-preview{width:70px;height:95px}.z-home-collection-item>.z-home-danger-button{grid-column:1/-1;width:100%}}
.z-home-offer-admin-list,.z-home-combo-admin-list{display:grid;gap:14px}.z-home-offer-admin-item,.z-home-combo-admin-item{padding:14px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background)}.z-home-offer-admin-item{display:grid;grid-template-columns:90px 1fr auto;gap:12px;align-items:start}.z-home-combo-picker-head{display:flex;justify-content:space-between;gap:10px;margin:16px 0 10px;font-size:11px}.z-home-combo-picker-head span{color:#8b5cf6;font-weight:900}.z-home-full-field{grid-column:1/-1}.z-home-helper{font-size:11px;color:var(--color-text-muted);line-height:1.5}.z-home-admin-page {
  min-height: 100vh;
  padding: 22px 14px 70px;
  background:
    radial-gradient(circle at 5% 0%, rgba(124,58,237,.12), transparent 30%),
    var(--color-background);
  color: var(--color-text-primary);
}
.z-home-admin-wrap { width:100%; max-width:1280px; margin:0 auto; }
.z-home-admin-header {
  display:flex; justify-content:space-between; align-items:flex-end;
  gap:18px; margin-bottom:18px;
}
.z-home-admin-header h1 { margin:4px 0 7px; font-size:clamp(30px,6vw,46px); letter-spacing:-.045em; }
.z-home-admin-header p { margin:0; color:var(--color-text-secondary); font-size:13px; max-width:720px; }
.z-home-back {
  border:0; background:transparent; padding:0; color:#8b5cf6;
  font-weight:800; cursor:pointer;
}
.z-home-eyebrow { margin-top:14px !important; color:#a855f7 !important; font-size:10px !important; font-weight:900 !important; letter-spacing:.2em; }
.z-home-save, .z-home-bottom-actions .primary {
  min-height:46px; padding:0 18px; border:0; border-radius:11px;
  background:#7c3aed; color:white; font-weight:900; cursor:pointer;
}
.z-home-save:disabled { opacity:.55; cursor:not-allowed; }
.z-home-message { margin:0 0 15px; padding:12px 14px; border-radius:11px; font-size:12px; font-weight:800; }
.z-home-message.error { background:rgba(239,68,68,.1); color:#ef4444; border:1px solid rgba(239,68,68,.25); }
.z-home-message.success { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.25); }
.z-home-card {
  margin-bottom:16px; padding:18px; border:1px solid var(--color-border);
  border-radius:18px; background:var(--color-surface);
}
.z-home-card-head {
  display:flex; justify-content:space-between; gap:15px; align-items:flex-start;
  padding-bottom:15px; margin-bottom:15px; border-bottom:1px solid var(--color-border);
}
.z-home-card-head > div { display:flex; gap:12px; }
.z-home-card-head > div > span { color:#8b5cf6; font-weight:900; font-size:11px; }
.z-home-card-head h2 { margin:0; font-size:17px; }
.z-home-card-head p { margin:4px 0 0; color:var(--color-text-muted); font-size:11px; }
.z-home-card-head > strong { color:#8b5cf6; }
.z-home-switch-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.z-home-switch {
  min-height:45px; display:flex; align-items:center; gap:9px; text-align:left;
  border:1px solid var(--color-border); border-radius:10px; background:var(--color-background);
  color:var(--color-text-primary); padding:9px; font-weight:800; cursor:pointer;
}
.z-home-switch span {
  width:24px; height:24px; display:grid; place-items:center; border-radius:7px;
  background:rgba(239,68,68,.1); color:#ef4444;
}
.z-home-switch.on { border-color:rgba(124,58,237,.35); }
.z-home-switch.on span { background:rgba(124,58,237,.13); color:#8b5cf6; }
.z-home-hero-editor { display:grid; gap:14px; }
.z-home-field-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.z-home-card label, .z-home-add-box label { display:grid; gap:6px; color:var(--color-text-secondary); font-size:10px; font-weight:850; }
.z-home-card input, .z-home-card textarea, .z-home-card select {
  width:100%; box-sizing:border-box; min-height:42px; padding:10px 11px;
  border:1px solid var(--color-border); border-radius:9px; background:var(--color-background);
  color:var(--color-text-primary); font:inherit; outline:none;
}
.z-home-card textarea { min-height:90px; resize:vertical; }
.z-home-bg-preview { width:100%; max-height:240px; object-fit:cover; margin-top:8px; border-radius:12px; border:1px solid var(--color-border); }
.z-home-selected-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:15px; }
.z-home-selected-poster { position:relative; overflow:hidden; border:1px solid var(--color-border); border-radius:11px; background:var(--color-background); }
.z-home-selected-poster img { display:block; width:100%; aspect-ratio:4/5; object-fit:cover; }
.z-home-selected-poster > span { position:absolute; top:7px; left:7px; padding:3px 6px; border-radius:6px; background:#7c3aed; color:#fff; font-size:9px; font-weight:900; }
.z-home-selected-poster > div { padding:8px; display:grid; gap:5px; }
.z-home-selected-poster strong { font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.z-home-selected-poster button, .z-home-inline-actions button {
  border:1px solid var(--color-border); border-radius:7px; background:transparent;
  color:var(--color-text-primary); padding:6px 8px; font-size:9px; font-weight:850; cursor:pointer;
}
.z-home-inline-actions { display:flex; gap:6px; flex-wrap:wrap; }
.z-home-inline-actions .danger, .z-home-selected-poster button { color:#ef4444; }
.z-home-picker { border-top:1px solid var(--color-border); padding-top:14px; }
.z-home-picker-head { display:flex; justify-content:space-between; margin-bottom:10px; font-size:11px; }
.z-home-picker-head span { color:var(--color-text-muted); }
.z-home-product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; }
.z-home-product {
  overflow:hidden; padding:0 0 9px; border:1px solid var(--color-border); border-radius:10px;
  background:var(--color-background); color:var(--color-text-primary); text-align:left; cursor:pointer;
}
.z-home-product.selected { border-color:#7c3aed; opacity:.7; }
.z-home-product:disabled { cursor:not-allowed; }
.z-home-product img { display:block; width:100%; aspect-ratio:4/5; object-fit:cover; }
.z-home-product span { display:inline-block; margin:7px 8px 3px; color:#8b5cf6; font-size:8px; font-weight:900; }
.z-home-product strong, .z-home-product small { display:block; padding:0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.z-home-product strong { font-size:10px; }
.z-home-product small { margin-top:3px; color:var(--color-text-muted); font-size:9px; }
.z-home-empty { padding:20px; border:1px dashed var(--color-border); border-radius:10px; text-align:center; color:var(--color-text-muted); font-size:11px; }
.z-home-review-list, .z-home-media-list { display:grid; gap:12px; }
.z-home-review, .z-home-media-item, .z-home-add-box {
  padding:13px; border:1px solid var(--color-border); border-radius:12px; background:var(--color-background);
}
.z-home-review.muted, .z-home-media-item.muted { opacity:.6; }
.z-home-review-top { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; }
.z-home-review-top > div:first-child { display:grid; gap:3px; }
.z-home-review-top span { color:#fbbf24; font-size:10px; }
.z-home-review-top strong { font-size:12px; }
.z-home-add-box { margin-top:14px; }
.z-home-add-box h3 { margin:0 0 12px; font-size:13px; }
.z-home-secondary-button {
  min-height:40px; margin-top:11px; padding:0 13px; border:1px solid rgba(124,58,237,.4);
  border-radius:9px; background:rgba(124,58,237,.08); color:#8b5cf6; font-weight:900; cursor:pointer;
}
.z-home-media-item { display:grid; grid-template-columns:110px minmax(0,1fr) auto; gap:12px; align-items:start; }
.z-home-media-item > img { width:110px; aspect-ratio:1; object-fit:cover; border-radius:9px; }
.z-home-media-item > div:nth-child(2) { display:grid; gap:10px; }
.z-home-bottom-actions { display:flex; justify-content:flex-end; gap:9px; }
.z-home-bottom-actions button { min-height:44px; padding:0 15px; border:1px solid var(--color-border); border-radius:10px; background:var(--color-surface); color:var(--color-text-primary); font-weight:850; cursor:pointer; }
.z-home-admin-loading { min-height:70vh; display:grid; place-items:center; color:var(--color-text-muted); }
@media (min-width:760px) {
  .z-home-admin-page { padding:30px 22px 80px; }
  .z-home-switch-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width:620px) {
  .z-home-admin-header { align-items:stretch; flex-direction:column; }
  .z-home-save { width:100%; }
  .z-home-field-grid { grid-template-columns:1fr; }
  .z-home-selected-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .z-home-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .z-home-media-item { grid-template-columns:1fr; }
  .z-home-media-item > img { width:100%; max-width:180px; }
}
`;
