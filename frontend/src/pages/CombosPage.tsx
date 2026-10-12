import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
  defaultHomepageSettings,
  loadHomepageSettings,
  type HomepageCombo,
} from "../services/homepageContent";
import "./CombosPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";

type ShopProduct = {
  id: string;
  name: string;
  category_name?: string | null;
  main_image?: string | null;
  images?: Array<{ image_url: string; is_primary?: boolean }>;
};

function productImage(product: ShopProduct) {
  return (
    product.main_image ||
    product.images?.find((image) => image.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    ""
  );
}

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function fixedComboProducts(combo: HomepageCombo, products: ShopProduct[]) {
  return products
    .filter((product) => combo.productIds.includes(product.id))
    .slice(0, combo.posterCount);
}

function WallPreview({
  products,
  posterCount,
  large = false,
  empty = false,
}: {
  products: ShopProduct[];
  posterCount: number;
  large?: boolean;
  empty?: boolean;
}) {
  const count = Math.max(1, Math.min(6, posterCount));
  const slots = Array.from({ length: count }, (_, index) => products[index] || null);

  return (
    <div className={`combo-wall ${large ? "combo-wall-large" : ""}`}>
      <div className="combo-wall-ceiling" />
      <div className="combo-wall-glow" />
      <div className="combo-wall-surface" />
      <div className="combo-wall-floor" />

      <div className="combo-wall-scene-label">WALL MOCKUP</div>

      <div className={`combo-wall-posters count-${count}`}>
        {slots.map((product, index) => (
          <div
            className={`combo-wall-slot ${product ? "filled" : "empty"}`}
            key={`${product?.id || "empty"}-${index}`}
          >
            <div className="combo-wall-frame">
              {product ? (
                <img src={productImage(product)} alt={product.name} />
              ) : (
                <span className="combo-wall-placeholder">
                  POSTER {index + 1}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {empty && (
        <div className="combo-wall-empty-note">Choose posters below</div>
      )}
    </div>
  );
}

function CustomerChoicePicker({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  selectedIds,
  posterCount,
  onToggle,
}: {
  products: ShopProduct[];
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  selectedIds: string[];
  posterCount: number;
  onToggle: (id: string) => void;
}) {
  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter(
          (product) =>
            (product.category_name || "").toLowerCase() ===
            activeCategory.toLowerCase(),
        );

  const limitReached = selectedIds.length >= posterCount;

  return (
    <section className="combo-choice-picker">
      <div className="combo-choice-picker-head">
        <div>
          <strong>Select your posters</strong>
          <span>Tap a poster to fill an empty space on the wall.</span>
        </div>
        <b>{selectedIds.length}/{posterCount}</b>
      </div>

      <div className="combo-choice-categories" aria-label="Poster categories">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={activeCategory === category ? "active" : ""}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="combo-choice-products">
        {filteredProducts.map((product) => {
          const selected = selectedIds.includes(product.id);
          const disabled = !selected && limitReached;

          return (
            <button
              type="button"
              key={product.id}
              className={`combo-choice-product ${selected ? "selected" : ""} ${
                disabled ? "disabled" : ""
              }`}
              disabled={disabled}
              onClick={() => onToggle(product.id)}
              aria-pressed={selected}
              aria-label={`${selected ? "Remove" : "Select"} ${product.name}`}
            >
              <span className="combo-choice-product-image">
                <img src={productImage(product)} alt={product.name} />
                {selected && <span className="combo-choice-check">✓</span>}
              </span>
              <span className="combo-choice-product-name" title={product.name}>
                {product.name}
              </span>
            </button>
          );
        })}

        {!filteredProducts.length && (
          <div className="combo-choice-empty">No posters found in this category.</div>
        )}
      </div>
    </section>
  );
}

function ComboViewer({
  combo,
  products,
  fixedSelection,
  selectedIds,
  categories,
  activeCategory,
  setActiveCategory,
  onToggleProduct,
  onAddCombo,
  message,
  onClose,
}: {
  combo: HomepageCombo;
  products: ShopProduct[];
  fixedSelection: ShopProduct[];
  selectedIds: string[];
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onToggleProduct: (id: string) => void;
  onAddCombo: () => void;
  message: string;
  onClose: () => void;
}) {
  const isChoice = combo.mode === "choice";
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const wallProducts = isChoice ? selectedProducts : fixedSelection;
  const viewerProducts = isChoice ? selectedProducts : fixedSelection;

  const slides = [
    { type: "wall" as const, id: "wall" },
    ...viewerProducts.map((product) => ({
      type: "poster" as const,
      id: product.id,
      product,
    })),
  ];

  const [current, setCurrent] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setCurrent(0);
  }, [selectedIds.join(",")]);

  const goPrevious = () => setCurrent((value) => Math.max(0, value - 1));
  const goNext = () => setCurrent((value) => Math.min(slides.length - 1, value + 1));

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 45) {
      if (distance < 0) goNext();
      else goPrevious();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const slide = slides[current];
  const currentProduct = slide.type === "poster" ? slide.product : null;
  const complete = !isChoice || selectedProducts.length === combo.posterCount;

  return (
    <div
      className="combo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${combo.title} preview`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="combo-viewer">
        <button type="button" className="combo-viewer-close" onClick={onClose} aria-label="Close preview">
          ×
        </button>

        <div
          className="combo-viewer-stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slide.type === "wall" ? (
            <div className="combo-viewer-wall-wrap">
              <WallPreview
                products={wallProducts}
                posterCount={combo.posterCount}
                large
                empty={isChoice && selectedProducts.length === 0}
              />
              {isChoice && (
                <div className="combo-swipe-hint">
                  {selectedProducts.length
                    ? "Swipe to preview your selected posters"
                    : "Swipe to preview · Select posters below"}
                </div>
              )}
            </div>
          ) : currentProduct ? (
            <div className="combo-viewer-poster">
              <img src={productImage(currentProduct)} alt={currentProduct.name} />
              <div className="combo-viewer-poster-name">{currentProduct.name}</div>
            </div>
          ) : null}
        </div>

        <div className="combo-viewer-navigation">
          <button type="button" className="combo-viewer-arrow" onClick={goPrevious} disabled={current === 0} aria-label="Previous slide">
            ←
          </button>
          <div className="combo-viewer-dots">
            {slides.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={index === current ? "active" : ""}
                onClick={() => setCurrent(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          <span className="combo-viewer-counter">{current + 1} / {slides.length}</span>
          <button type="button" className="combo-viewer-arrow" onClick={goNext} disabled={current === slides.length - 1} aria-label="Next slide">
            →
          </button>
        </div>

        <div className="combo-viewer-info">
          <div className="combo-viewer-info-text">
            <strong>{combo.title}</strong>
            <span>
              {isChoice
                ? `${selectedIds.length}/${combo.posterCount} selected`
                : current === 0
                  ? "Wall mockup"
                  : currentProduct?.name}
            </span>
          </div>
          <span className="combo-viewer-price">{money(combo.price)}</span>
        </div>

        {isChoice && (
          <CustomerChoicePicker
            products={products}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            selectedIds={selectedIds}
            posterCount={combo.posterCount}
            onToggle={onToggleProduct}
          />
        )}

        <div className="combo-viewer-action">
          <button
            type="button"
            className="combo-viewer-add-button"
            onClick={onAddCombo}
            disabled={!complete}
          >
            {isChoice
              ? complete
                ? "ADD SELECTED COMBO TO CART"
                : `SELECT ${combo.posterCount - selectedIds.length} MORE POSTER${combo.posterCount - selectedIds.length === 1 ? "" : "S"}`
              : "ADD COMBO TO CART"}
            <span>→</span>
          </button>
          {message && <div className="combo-message">{message}</div>}
        </div>
      </div>
    </div>
  );
}

function ComboCard({ combo, products }: { combo: HomepageCombo; products: ShopProduct[] }) {
  const { addComboToCart } = useCart();
  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category_name?.trim())
      .filter((value): value is string => Boolean(value));
    return ["All", ...Array.from(new Set(values))];
  }, [products]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const fixedSelection = useMemo(
    () => fixedComboProducts(combo, products),
    [combo, products],
  );

  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));

  function toggleProduct(id: string) {
    setMessage("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= combo.posterCount) return current;
      return [...current, id];
    });
  }

  function addCombo() {
    const chosen = combo.mode === "fixed" ? fixedSelection : selectedProducts;
    if (chosen.length !== combo.posterCount) {
      setMessage(`Select exactly ${combo.posterCount} posters.`);
      return;
    }

    addComboToCart({
      comboId: combo.id,
      title: combo.title,
      price: combo.price,
      image: productImage(chosen[0]),
      products: chosen.map((product) => ({
        id: product.id,
        title: product.name,
        image: productImage(product),
      })),
    });
    setMessage("Combo added to your cart.");
  }

  const cardPreview = combo.mode === "fixed" ? fixedSelection : selectedProducts;

  return (
    <>
      <article className="combo-card" id={combo.id}>
        <button type="button" className="combo-card-preview-button" onClick={() => { setMessage(""); setViewerOpen(true); }} aria-label={`Open ${combo.title} preview`}>
          <div className="combo-card-preview">
            <WallPreview
              products={cardPreview}
              posterCount={combo.posterCount}
              empty={combo.mode === "choice" && selectedProducts.length === 0}
            />
            <span className="combo-open-preview">VIEW COMBO</span>
            <span className="combo-preview-count">
              {combo.mode === "choice" ? `${selectedIds.length}/${combo.posterCount}` : "READY"}
            </span>
          </div>
        </button>

        <div className="combo-details">
          <span className="combo-tag">{combo.tag}</span>
          <h2>{combo.title}</h2>
          <p>{combo.description}</p>
          <div className="combo-price">{money(combo.price)}</div>
          <small>
            {combo.mode === "choice"
              ? `Choose any ${combo.posterCount} posters`
              : `${combo.posterCount} posters selected by Zavyro`}
          </small>
          <button type="button" className="combo-add-button" onClick={combo.mode === "choice" ? () => { setMessage(""); setViewerOpen(true); } : addCombo}>
            {combo.mode === "choice" ? "VIEW & CHOOSE" : "ADD COMBO TO CART"}
            <span>→</span>
          </button>
          {message && <div className="combo-message">{message}</div>}
        </div>

        <div className="combo-card-footer">
          <span>{combo.posterCount} posters</span>
          <Link to={`/shop?combo=${combo.id}`}>VIEW IN SHOP ↗</Link>
        </div>
      </article>

      {viewerOpen && (
        <ComboViewer
          combo={combo}
          products={products}
          fixedSelection={fixedSelection}
          selectedIds={selectedIds}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onToggleProduct={toggleProduct}
          onAddCombo={addCombo}
          message={message}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

export default function CombosPage() {
  const [settings, setSettings] = useState(defaultHomepageSettings);
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadHomepageSettings(),
      fetch(`${API_URL}/api/shop/products?status=published`).then((response) => response.json()),
    ])
      .then(([homepage, payload]) => {
        if (!active) return;
        setSettings(homepage);
        setProducts(Array.isArray(payload?.products) ? payload.products : []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const combos = settings.combos.filter((combo) => combo.visible);

  return (
    <main className="combos-page">
      <section className="combos-hero">
        <div className="combos-shell">
          <span>CURATED WALL SETS</span>
          <h1>Build your wall <em>together.</em></h1>
          <p>Choose a ready-made set or pick your own posters. Build the wall before you add it to your cart.</p>
          <div className="combos-hero-links">
            <Link to="/offers">Offers</Link>
            <Link className="active" to="/combos">Combos</Link>
          </div>
        </div>
      </section>

      <section className="combos-shell combos-section">
        <div className="combos-section-head">
          <div>
            <span>01 · COMBOS</span>
            <h2>Find your set.</h2>
          </div>
          <Link to="/shop">SHOP ALL ↗</Link>
        </div>

        <div className="combo-list">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} products={products} />
          ))}
          {!combos.length && <div className="combo-empty">No active combos right now.</div>}
        </div>
      </section>
    </main>
  );
}
