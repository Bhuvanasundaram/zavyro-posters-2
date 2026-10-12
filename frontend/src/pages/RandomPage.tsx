import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./RandomPage.css";

type ProductSize = {
  size_code?: string;
  offer_price?: number | string;
  price?: number | string;
  is_available?: boolean;
};

type ProductImage = {
  image_url: string;
  image_type?: string;
  is_primary?: boolean;
  sort_order?: number;
};

type RandomProduct = {
  id: string;
  name: string;
  slug?: string;
  category_name?: string | null;
  subcategory_name?: string | null;
  main_image?: string | null;
  images?: ProductImage[];
  sizes?: ProductSize[];
};

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";
const FALLBACK_CATEGORIES = ["All", "Anime", "Movies", "Music", "Sports", "Cars", "Aesthetic", "Devotional"];
const MIN_POSTERS = 1;
const MAX_POSTERS = 8;

function getImage(product: RandomProduct) {
  if (product.main_image) return product.main_image;
  const primary = (product.images ?? []).find((image) => image.is_primary);
  return primary?.image_url || product.images?.[0]?.image_url || "";
}

function getStartingPrice(product: RandomProduct) {
  const prices = (product.sizes ?? [])
    .filter((size) => size.is_available !== false)
    .map((size) => Number(size.offer_price ?? size.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length ? Math.min(...prices) : 0;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export default function RandomPage() {
  const [products, setProducts] = useState<RandomProduct[]>([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [category, setCategory] = useState("All");
  const [count, setCount] = useState(3);
  const [selected, setSelected] = useState<RandomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/shop/products`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load posters.");
        }

        const nextProducts = Array.isArray(result.products) ? result.products : [];

        if (!cancelled) {
          setProducts(nextProducts);
          const nextCategories: string[] = Array.from(
            new Set<string>(
              nextProducts
                .map((product: RandomProduct) => product.category_name)
                .filter((value: string | null | undefined): value is string => Boolean(value)),
            ),
          ).sort();
          setCategories(["All", ...nextCategories]);
        }
      } catch (loadError) {
        console.error("Random poster loading error:", loadError);
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load posters.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const eligibleProducts = useMemo(() => {
    if (category === "All") return products;
    return products.filter((product) => product.category_name === category);
  }, [category, products]);

  const generateRandomPosters = () => {
    if (!eligibleProducts.length) return;

    setGenerating(true);
    window.setTimeout(() => {
      const next = shuffle(eligibleProducts).slice(0, Math.min(count, eligibleProducts.length));
      setSelected(next);
      setGenerating(false);
      window.scrollTo({ top: 520, behavior: "smooth" });
    }, 300);
  };

  useEffect(() => {
    if (!loading && eligibleProducts.length) {
      generateRandomPosters();
    }
    // Intentionally only generate when the catalog/category becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, category]);

  const toggleSelected = (product: RandomProduct) => {
    setSelected((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current.filter((item) => item.id !== product.id);
      if (current.length >= count) return current;
      return [...current, product];
    });
  };

  return (
    <main className="random-page">
      <section className="random-hero">
        <div className="random-hero-glow random-hero-glow-one" />
        <div className="random-hero-glow random-hero-glow-two" />
        <div className="z-container random-hero-inner">
          <span className="random-eyebrow">NO IDEA WHAT TO BUY?</span>
          <h1>Let <span>Random</span> choose your wall.</h1>
          <p>
            Pick how many posters you want, choose a category or explore everything,
            and we&apos;ll create a random wall collection for you to discover.
          </p>
        </div>
      </section>

      <section className="random-controls-section">
        <div className="z-container">
          <div className="random-controls-card">
            <div className="random-control-block">
              <label className="random-control-label" htmlFor="random-count">HOW MANY POSTERS DO YOU WANT?</label>
              <div className="random-count-input-wrap">
                <button
                  type="button"
                  className="random-step-button"
                  onClick={() => setCount((value) => Math.max(MIN_POSTERS, value - 1))}
                  aria-label="Decrease poster count"
                >
                  −
                </button>
                <input
                  id="random-count"
                  type="number"
                  min={MIN_POSTERS}
                  max={MAX_POSTERS}
                  value={count}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    setCount(Math.min(MAX_POSTERS, Math.max(MIN_POSTERS, value)));
                  }}
                />
                <button
                  type="button"
                  className="random-step-button"
                  onClick={() => setCount((value) => Math.min(MAX_POSTERS, value + 1))}
                  aria-label="Increase poster count"
                >
                  +
                </button>
                <span className="random-count-hint">1–8 posters</span>
              </div>
            </div>

            <div className="random-control-block random-category-block">
              <label className="random-control-label" htmlFor="random-category">
                WHAT KIND OF POSTERS?
              </label>
              <select
                id="random-category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSelected([]);
                }}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "Everything / All Categories" : item}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="random-generate-button"
              onClick={generateRandomPosters}
              disabled={loading || generating || !eligibleProducts.length}
            >
              {generating ? "MIXING..." : "GENERATE RANDOM WALL ↗"}
            </button>
          </div>

          <div className="random-control-note">
            <span>✦</span>
            {eligibleProducts.length
              ? `We’ll randomly pick ${Math.min(count, eligibleProducts.length)} poster${Math.min(count, eligibleProducts.length) === 1 ? "" : "s"} from ${category === "All" ? "our full collection" : category}.`
              : "No posters are available for this selection"}
          </div>
        </div>
      </section>

      <section className="random-results-section">
        <div className="z-container">
          <div className="random-results-heading">
            <div>
              <span>YOUR RANDOM WALL</span>
              <h2>See it before you <strong>choose it.</strong></h2>
            </div>
            <button type="button" className="random-shuffle-link" onClick={generateRandomPosters} disabled={!eligibleProducts.length || generating}>
              SHUFFLE AGAIN ↻
            </button>
          </div>

          {error && <div className="random-state random-error">{error}</div>}

          {loading ? (
            <div className="random-state">Loading your poster collection...</div>
          ) : selected.length ? (
            <div className="random-wall-layout">
              <div className={`random-room random-room-count-${selected.length}`}>
                <div className="random-room-window" aria-hidden="true"><span /></div>
                <div className="random-room-wall">
                  <div className="random-room-light" />
                  <div className="random-room-art-row">
                    {selected.map((product, index) => (
                      <motion.div
                        key={`${product.id}-${index}`}
                        className="random-room-frame"
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.45, delay: index * 0.08 }}
                      >
                        <img src={getImage(product)} alt={product.name} />
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="random-room-floor" />
                <div className="random-room-console">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="random-room-plant" aria-hidden="true">
                  <i /><i /><i /><b />
                </div>
                <div className="random-room-caption">
                  <span>WALL PREVIEW</span>
                  <strong>Your random {selected.length}-poster setup</strong>
                </div>
              </div>

              <div className="random-selection-panel">
                <div className="random-selection-header">
                  <span>YOUR RANDOM SET</span>
                  <strong>{selected.length}/{count}</strong>
                </div>

                <div className="random-selection-list">
                  {selected.map((product) => {
                    const price = getStartingPrice(product);
                    return (
                      <div className="random-selection-item" key={product.id}>
                        <img src={getImage(product)} alt="" />
                        <div>
                          <span>{product.category_name || "Poster"}</span>
                          <h3>{product.name}</h3>
                          {price > 0 && <strong>From ₹{price}</strong>}
                        </div>
                        <button type="button" onClick={() => toggleSelected(product)} aria-label={`Remove ${product.name}`}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="random-selection-actions">
                  <p>Select the posters you like, then open them to choose size and order.</p>
                  {selected.length > 0 && (
                    <Link to={`/product/${selected[0].id}`} className="random-primary-action">
                      VIEW A POSTER ↗
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="random-empty-preview">
              <div className="random-empty-wall">
                <span /><span /><span />
              </div>
              <h3>Your wall preview will appear here</h3>
              <p>Choose the number of posters and a category, then click <strong>Generate Random Wall</strong>.</p>
            </div>
          )}

          {selected.length > 0 && (
            <div className="random-product-grid">
              {selected.map((product) => (
                <Link to={`/product/${product.id}`} className="random-product-card" key={product.id}>
                  <div className="random-product-image">
                    <img src={getImage(product)} alt={product.name} loading="lazy" />
                    <span>VIEW POSTER ↗</span>
                  </div>
                  <div className="random-product-copy">
                    <span>{product.category_name || "Poster"}</span>
                    <h3>{product.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="random-bottom-cta">
        <div className="z-container">
          <span>STILL CAN&apos;T DECIDE?</span>
          <h2>Randomize again. Your wall might be waiting.</h2>
          <button type="button" onClick={generateRandomPosters}>TRY ANOTHER RANDOM WALL ↻</button>
        </div>
      </section>
    </main>
  );
}
