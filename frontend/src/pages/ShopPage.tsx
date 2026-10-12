// ============================================================
// ZAVYRO POSTERS 2.0
// SHOP PAGE
//
// PostgreSQL connected storefront
// Mobile-first
// Dark / Light / System
// Desktop: 8 posters per row
// Admin-uploaded images + hover images
// Purple hover / click glow
//
// CATEGORY SYSTEM
// Desktop:
//   Category dropdown
//   Subcategory dropdown
//
// Mobile:
//   Category buttons
//   Subcategory buttons
// ============================================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

import { useTheme } from "../context/ThemeContext";

import "./ShopPage.css";

type Format = "poster" | "panel";
type PosterSize = "A6" | "A5" | "A4" | "A3";
type PanelSize = "A5" | "A4";

type ProductSize = {
  id?: string;
  size_code?: string;
  width_mm?: number;
  height_mm?: number;
  original_price?: number | string;
  offer_price?: number | string;
  price?: number | string;
  is_available?: boolean;
};

type ProductImage = {
  id?: string;
  image_url: string;
  alt_text?: string | null;
  image_type?: string;
  sort_order?: number;
  is_primary?: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  description?: string | null;

  category_name?: string | null;
  subcategory_name?: string | null;

  is_active?: boolean;
  is_featured?: boolean;
  search_keywords?: string | null;

  panel_split_count?: number;

  sizes?: ProductSize[];
  images?: ProductImage[];

  main_image?: string | null;
  hover_image?: string | null;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const POSTER_SIZES: PosterSize[] = [
  "A6",
  "A5",
  "A4",
  "A3",
];

const QUICK_CATEGORIES = [
  "All",
  "Anime",
  "Movies",
  "Music",
  "Sports",
  "Cars",
  "Aesthetic",
  "Devotional",
];

function numberValue(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getOfferPrice(
  size: ProductSize,
): number {
  const offer = numberValue(
    size.offer_price,
  );

  if (offer > 0) {
    return offer;
  }

  return numberValue(size.price);
}

function getOriginalPrice(
  size: ProductSize,
): number {
  const original = numberValue(
    size.original_price,
  );

  if (original > 0) {
    return original;
  }

  return numberValue(size.price);
}

function getNormalSizes(
  product: ApiProduct,
): ProductSize[] {
  return (product.sizes ?? []).filter(
    (size) =>
      POSTER_SIZES.includes(
        size.size_code as PosterSize,
      ),
  );
}

function getAvailableSizes(
  product: ApiProduct,
): PosterSize[] {
  return getNormalSizes(product)
    .filter(
      (size) =>
        size.is_available !== false,
    )
    .map(
      (size) =>
        size.size_code as PosterSize,
    );
}

function getPanelSizeProduct(
  product: ApiProduct,
  panelSize: PanelSize,
): ProductSize | undefined {
  const code =
    panelSize === "A5"
      ? "A5_PANEL"
      : "A4_PANEL";

  return (product.sizes ?? []).find(
    (size) =>
      size.size_code === code &&
      size.is_available !== false,
  );
}

function getNormalStartingSize(
  product: ApiProduct,
): ProductSize | undefined {
  const available =
    getNormalSizes(product).filter(
      (size) =>
        size.is_available !== false,
    );

  if (available.length === 0) {
    return undefined;
  }

  return available.reduce(
    (lowest, current) => {
      return getOfferPrice(current) <
        getOfferPrice(lowest)
        ? current
        : lowest;
    },
  );
}

function getStartingPrice(
  product: ApiProduct,
  format: Format,
  panelSize: PanelSize,
): number {
  if (format === "panel") {
    const panel =
      getPanelSizeProduct(
        product,
        panelSize,
      );

    if (panel) {
      return getOfferPrice(panel);
    }

    const normal = (
      product.sizes ?? []
    ).find(
      (size) =>
        size.size_code === panelSize &&
        size.is_available !== false,
    );

    if (!normal) {
      return 0;
    }

    const splitCount = Number(product.panel_split_count ?? 0) || 0;
    if (splitCount < 2) return 0;

    return Number(
      (
        getOfferPrice(normal) *
        splitCount
      ).toFixed(2),
    );
  }

  const normal =
    getNormalStartingSize(product);

  return normal
    ? getOfferPrice(normal)
    : 0;
}

function getStartingOriginalPrice(
  product: ApiProduct,
  format: Format,
  panelSize: PanelSize,
): number {
  if (format === "panel") {
    const panel =
      getPanelSizeProduct(
        product,
        panelSize,
      );

    if (panel) {
      return getOriginalPrice(panel);
    }

    const normal = (
      product.sizes ?? []
    ).find(
      (size) =>
        size.size_code === panelSize &&
        size.is_available !== false,
    );

    if (!normal) {
      return 0;
    }

    const splitCount = Number(product.panel_split_count ?? 0) || 0;
    if (splitCount < 2) return 0;

    return Number(
      (
        getOriginalPrice(normal) *
        splitCount
      ).toFixed(2),
    );
  }

  const normal =
    getNormalStartingSize(product);

  return normal
    ? getOriginalPrice(normal)
    : 0;
}

function getDiscount(
  original: number,
  offer: number,
): number {
  if (
    original <= 0 ||
    offer <= 0 ||
    offer >= original
  ) {
    return 0;
  }

  return Math.round(
    ((original - offer) /
      original) *
      100,
  );
}

function getImageUrl(
  imageUrl:
    | string
    | null
    | undefined,
): string {
  if (!imageUrl) {
    return "";
  }

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }

  return imageUrl;
}

function PanelPreview({
  image,
  title,
}: {
  image: string;
  title: string;
}) {
  return (
    <div
      className="shop-panel-preview"
      aria-label={`${title} three-piece panel`}
    >
      {[0, 1, 2].map(
        (index) => (
          <div
            className="shop-panel-piece"
            key={index}
          >
            <img
              src={image}
              alt=""
              draggable={false}
              style={{
                width: "300%",
                maxWidth: "none",
                transform: `translateX(-${
                  index *
                  33.333333
                }%)`,
              }}
            />
          </div>
        ),
      )}
    </div>
  );
}

function ProductImage({
  product,
  format,
}: {
  product: ApiProduct;
  format: Format;
}) {
  const mainImage =
    getImageUrl(
      product.main_image,
    );

  const hoverImage =
    getImageUrl(
      product.hover_image,
    );

  const panelAvailable =
    (product.sizes ?? []).some(
      (size) =>
        (
          size.size_code ===
            "A5_PANEL" ||
          size.size_code ===
            "A4_PANEL"
        ) &&
        size.is_available !== false,
    );

  return (
    <div className="shop-product-image">
      {product.is_featured && (
        <span className="shop-product-badge">
          FEATURED
        </span>
      )}

      {format === "panel" &&
      panelAvailable &&
      mainImage ? (
        <PanelPreview
          image={mainImage}
          title={product.name}
        />
      ) : (
        <div className="shop-normal-poster">
          {mainImage ? (
            <img
              className={
                hoverImage
                  ? "shop-main-image has-hover"
                  : "shop-main-image"
              }
              src={mainImage}
              alt={product.name}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="shop-image-placeholder">
              Z
            </div>
          )}

          {hoverImage && (
            <img
              className="shop-hover-image"
              src={hoverImage}
              alt=""
              loading="lazy"
              draggable={false}
            />
          )}
        </div>
      )}

      <div className="shop-image-gradient" />

      <div className="shop-image-view">
        <span>
          VIEW →
        </span>
      </div>

      {panelAvailable && (
        <span className="shop-panel-badge">
          3 PIECE
        </span>
      )}
    </div>
  );
}

export default function ShopPage() {
  const { resolvedTheme } =
    useTheme();

  const [
    products,
    setProducts,
  ] = useState<ApiProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category")?.trim() ?? "";
  const [category, setCategory] = useState(() =>
    requestedCategory && requestedCategory.toLowerCase() !== "all"
      ? requestedCategory
      : "All",
  );

  const [
    subcategory,
    setSubcategory,
  ] = useState("All");

  const [size, setSize] =
    useState("All");

  const [sort, setSort] =
    useState("featured");

  const [search, setSearch] =
    useState("");

  const [format, setFormat] =
    useState<Format>("poster");

  const [
    panelSize,
    setPanelSize,
  ] = useState<PanelSize>("A4");

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<string | null>(
    null,
  );

  /*
   * Responsive category UI
   *
   * Mobile:
   *   buttons
   *
   * Desktop:
   *   dropdowns
   */
  const [isMobile, setIsMobile] =
    useState(false);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(max-width: 767px)",
      );

    const updateMobileState =
      () => {
        setIsMobile(
          mediaQuery.matches,
        );
      };

    updateMobileState();

    mediaQuery.addEventListener(
      "change",
      updateMobileState,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMobileState,
      );
    };
  }, []);

  useEffect(() => {
    const requested = searchParams.get("category")?.trim() ?? "";
    const nextCategory = requested && requested.toLowerCase() !== "all"
      ? requested
      : "All";
    setCategory((current) => current === nextCategory ? current : nextCategory);
    setSubcategory("All");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${API_URL}/api/shop/products`,
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load posters.",
          );
        }

        if (!cancelled) {
          setProducts(
            Array.isArray(
              result.products,
            )
              ? result.products
              : [],
          );
        }
      } catch (err) {
        console.error(
          "Shop product loading error:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load posters.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Categories come directly from
   * PostgreSQL products.
   */
  const categories =
    useMemo(() => {
      const names =
        products
          .map(
            (product) =>
              product.category_name,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

      return Array.from(
        new Set(names),
      ).sort();
    }, [products]);

  /*
   * Keep the existing preferred
   * category ordering.
   *
   * Any new database category that
   * isn't in the preferred list is
   * added automatically.
   */
  const categoryButtons =
    useMemo(() => {
      const preferred =
        QUICK_CATEGORIES.filter(
          (item) =>
            item === "All" ||
            categories.includes(
              item,
            ),
        );

      const additional =
        categories.filter(
          (item) =>
            !QUICK_CATEGORIES.includes(
              item,
            ),
        );

      return [
        ...preferred,
        ...additional,
      ];
    }, [categories]);

  /*
   * Subcategories depend on
   * currently selected category.
   */
  const currentSubcategories =
    useMemo(() => {
      if (category === "All") {
        return [];
      }

      const names =
        products
          .filter(
            (product) =>
              product.category_name?.trim().toLowerCase() ===
              category.trim().toLowerCase(),
          )
          .map(
            (product) =>
              product.subcategory_name,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

      return Array.from(
        new Set(names),
      ).sort();
    }, [
      products,
      category,
    ]);

  const filteredProducts =
    useMemo(() => {
      let result = [
        ...products,
      ];

      if (category !== "All") {
        result =
          result.filter(
            (product) =>
              product.category_name?.trim().toLowerCase() ===
              category.trim().toLowerCase(),
          );
      }

      if (
        subcategory !==
        "All"
      ) {
        result =
          result.filter(
            (product) =>
              product.subcategory_name ===
              subcategory,
          );
      }

      if (
        size !== "All" &&
        format === "poster"
      ) {
        result =
          result.filter(
            (product) =>
              getAvailableSizes(
                product,
              ).includes(
                size as PosterSize,
              ),
          );
      }

      if (
        format === "panel"
      ) {
        const code =
          panelSize === "A5"
            ? "A5_PANEL"
            : "A4_PANEL";

        result =
          result.filter(
            (product) =>
              (
                product.sizes ??
                []
              ).some(
                (item) =>
                  item.size_code ===
                    code &&
                  item.is_available !==
                    false,
              ),
          );
      }

      const query =
        search
          .trim()
          .toLowerCase();

      if (query) {
        result =
          result.filter(
            (product) => {
              const searchable =
                [
                  product.name,
                  product.description ??
                    "",
                  product.category_name ??
                    "",
                  product.subcategory_name ??
                    "",
                  product.search_keywords ??
                    "",
                  product.slug ?? "",
                  product.sku ?? "",
                ]
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                query,
              );
            },
          );
      }

      if (sort === "low") {
        result.sort(
          (a, b) =>
            getStartingPrice(
              a,
              format,
              panelSize,
            ) -
            getStartingPrice(
              b,
              format,
              panelSize,
            ),
        );
      }

      if (sort === "high") {
        result.sort(
          (a, b) =>
            getStartingPrice(
              b,
              format,
              panelSize,
            ) -
            getStartingPrice(
              a,
              format,
              panelSize,
            ),
        );
      }

      if (sort === "az") {
        result.sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        );
      }

      if (sort === "featured") {
        result.sort(
          (a, b) =>
            Number(
              Boolean(
                b.is_featured,
              ),
            ) -
            Number(
              Boolean(
                a.is_featured,
              ),
            ),
        );
      }

      return result;
    }, [
      products,
      category,
      subcategory,
      size,
      sort,
      search,
      format,
      panelSize,
    ]);

  function resetFilters() {
    setCategory("All");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    setSearchParams(nextParams, { replace: true });
    setSubcategory("All");
    setSize("All");
    setSort("featured");
    setSearch("");
    setFormat("poster");
    setPanelSize("A4");
  }

  function handleCategoryChange(
    value: string,
  ) {
    setCategory(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === "All") nextParams.delete("category");
    else nextParams.set("category", value);
    setSearchParams(nextParams, { replace: true });

    /*
     * Whenever the category changes,
     * always reset subcategory.
     *
     * This prevents:
     *
     * Sports + Cricket
     *
     * accidentally becoming:
     *
     * Music + Cricket
     */
    setSubcategory("All");
  }

  function handleSubcategoryChange(
    value: string,
  ) {
    setSubcategory(value);
  }

  return (
    <div
      className={`shop-page shop-theme-${resolvedTheme}`}
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="shop-header">
        <div className="shop-header-inner">
          <Link
            to="/"
            className="shop-brand"
          >
            <span className="shop-brand-mark">
              Z
            </span>

            <span className="shop-brand-name">
              <strong>
                ZAVYRO
              </strong>

              <small>
                POSTERS
              </small>
            </span>
          </Link>

          <nav className="shop-navigation">
            <Link to="/">
              Home
            </Link>

            <Link
              to="/shop"
              className="active"
            >
              Shop
            </Link>

            <a href="#shop-categories">
              Categories
            </a>

            <Link to="/customize">
              Customize
            </Link>

            <Link to="/surprise-me">
              Surprise Me
            </Link>

            <Link to="/cart">
              Cart
            </Link>
          </nav>

          <Link
            to="/cart"
            className="shop-mobile-cart"
          >
            CART
          </Link>
        </div>
      </header>

      {/* ======================================================
          HERO
          ====================================================== */}

      <section className="shop-hero">
        <div className="shop-container">
          <p className="shop-eyebrow">
            ZAVYRO COLLECTION
          </p>

          <h1>
            FIND YOUR
            <span>
              {" "}
              POSTER.
            </span>
          </h1>

          <p className="shop-hero-description">
            Anime, movies, music,
            sports, cars, aesthetic
            and devotional art —
            made to transform your
            walls.
          </p>
        </div>
      </section>

      {/* ======================================================
          CONTROLS
          ====================================================== */}

      <section className="shop-controls">
        <div className="shop-container">

          {/* FORMAT */}

          <div className="shop-format-row">
            <button
              type="button"
              className={
                format === "poster"
                  ? "shop-format-button active"
                  : "shop-format-button"
              }
              onClick={() =>
                setFormat("poster")
              }
            >
              SINGLE POSTER
            </button>

            <button
              type="button"
              className={
                format === "panel"
                  ? "shop-format-button active"
                  : "shop-format-button"
              }
              onClick={() =>
                setFormat("panel")
              }
            >
              3-PIECE PANEL
            </button>

            {format ===
              "panel" && (
              <div className="shop-panel-selector">
                <span>
                  PANEL SIZE
                </span>

                <button
                  type="button"
                  className={
                    panelSize === "A5"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPanelSize(
                      "A5",
                    )
                  }
                >
                  A5
                </button>

                <button
                  type="button"
                  className={
                    panelSize === "A4"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPanelSize(
                      "A4",
                    )
                  }
                >
                  A4
                </button>
              </div>
            )}
          </div>

          {/* ==================================================
              DESKTOP FILTERS
              ================================================== */}

          {!isMobile && (
            <div className="shop-filter-box">
              <div className="shop-filter-grid">

                {/* CATEGORY */}

                <div className="shop-filter-field">
                  <select
                    value={category}
                    onChange={(
                      event,
                    ) =>
                      handleCategoryChange(
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="All">
                      All Categories
                    </option>

                    {categories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* SUBCATEGORY */}

                <div className="shop-filter-field">
                  <select
                    value={
                      subcategory
                    }
                    disabled={
                      category ===
                        "All" ||
                      currentSubcategories.length ===
                        0
                    }
                    onChange={(
                      event,
                    ) =>
                      handleSubcategoryChange(
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="All">
                      {category ===
                      "All"
                        ? "All Subcategories"
                        : currentSubcategories.length ===
                            0
                          ? "No Subcategories"
                          : "All Subcategories"}
                    </option>

                    {currentSubcategories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* SIZE */}

                <div className="shop-filter-field">
                  <select
                    value={size}
                    disabled={
                      format ===
                      "panel"
                    }
                    onChange={(
                      event,
                    ) =>
                      setSize(
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="All">
                      All Sizes
                    </option>

                    {POSTER_SIZES.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* SORT */}

                <div className="shop-filter-field">
                  <select
                    value={sort}
                    onChange={(
                      event,
                    ) =>
                      setSort(
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="featured">
                      Featured
                    </option>

                    <option value="low">
                      Price Low → High
                    </option>

                    <option value="high">
                      Price High → Low
                    </option>

                    <option value="az">
                      Name A → Z
                    </option>
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* ==================================================
              MOBILE CATEGORY BUTTONS
              ================================================== */}

          {isMobile && (
            <div
              id="shop-categories"
              className="shop-quick-categories"
            >
              {categoryButtons.map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      category ===
                      item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      handleCategoryChange(
                        item,
                      )
                    }
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          )}

          {/* ==================================================
              MOBILE SUBCATEGORY BUTTONS
              ================================================== */}

          {isMobile &&
            category !==
              "All" &&
            currentSubcategories.length >
              0 && (
              <div className="shop-quick-categories shop-mobile-subcategories">
                {[
                  "All",
                  ...currentSubcategories,
                ].map(
                  (item) => (
                    <button
                      type="button"
                      key={item}
                      className={
                        subcategory ===
                        item
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        handleSubcategoryChange(
                          item,
                        )
                      }
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            )}

          {/* ==================================================
              SEARCH
              ================================================== */}

          <div className="shop-search-row">
            <div className="shop-search">
              <span>
                ⌕
              </span>

              <input
                type="search"
                value={search}
                placeholder="Search posters..."
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="shop-results-number">
              <strong>
                {
                  filteredProducts.length
                }
              </strong>

              <span>
                POSTERS
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================
          PRODUCTS
          ====================================================== */}

      <section className="shop-products-section">
        <div className="shop-container">

          <div className="shop-results-header">
            <div>
              <p className="shop-results-label">
                ZAVYRO STORE
              </p>

              <h2>
                {format ===
                "panel"
                  ? "3-PIECE PANELS"
                  : "ALL POSTERS"}
              </h2>
            </div>

            <span className="shop-result-count">
              {
                filteredProducts.length
              }{" "}
              {filteredProducts.length ===
              1
                ? "POSTER"
                : "POSTERS"}
            </span>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="shop-empty-state">
              <div className="shop-empty-icon">
                Z
              </div>

              <h3>
                Loading posters...
              </h3>

              <p>
                Connecting to the
                Zavyro collection.
              </p>
            </div>

          ) : error ? (

            /* ERROR */

            <div className="shop-empty-state">
              <div className="shop-empty-icon">
                !
              </div>

              <h3>
                Unable to load posters
              </h3>

              <p>
                Make sure the Zavyro
                backend is running.
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                RETRY
              </button>
            </div>

          ) : filteredProducts.length >
            0 ? (

            /* PRODUCTS */

            <div className="shop-grid">
              {filteredProducts.map(
                (
                  product,
                  index,
                ) => {
                  const startingPrice =
                    getStartingPrice(
                      product,
                      format,
                      panelSize,
                    );

                  const originalPrice =
                    getStartingOriginalPrice(
                      product,
                      format,
                      panelSize,
                    );

                  const discount =
                    getDiscount(
                      originalPrice,
                      startingPrice,
                    );

                  const availableSizes =
                    getAvailableSizes(
                      product,
                    );

                  const selected =
                    selectedProduct ===
                    product.id;

                  return (
                    <motion.article
                      key={
                        product.id
                      }
                      className={`shop-product-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      initial={{
                        opacity: 0,
                        y: 18,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(
                          index *
                            0.025,
                          0.22,
                        ),
                      }}
                      onClick={() =>
                        setSelectedProduct(
                          product.id,
                        )
                      }
                    >
                      <Link
                        to={`/product/${product.id}`}
                        className="shop-product-link"
                        aria-label={`View ${product.name}`}
                      >
                        <ProductImage
                          product={
                            product
                          }
                          format={
                            format
                          }
                        />

                        <div className="shop-product-details">

                          <div className="shop-product-top">
                            <span className="shop-product-category">
                              {product.category_name ||
                                "ZAVYRO"}
                            </span>

                            <span className="shop-product-from">
                              FROM ₹
                              {startingPrice.toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          {product.subcategory_name && (
                            <p className="shop-product-subcategory">
                              {
                                product.subcategory_name
                              }
                            </p>
                          )}

                          <div className="shop-rating">
                            <span>
                              ☆ ☆ ☆ ☆ ☆
                            </span>

                            <small>
                              No reviews yet
                            </small>
                          </div>

                        <div className="shop-price-row">
  {discount > 0 &&
    originalPrice > startingPrice && (
      <span className="shop-original-price">
        ₹
        {originalPrice.toLocaleString(
          "en-IN",
        )}
      </span>
    )}

  <strong className="shop-offer-price">
    ₹
    {startingPrice.toLocaleString(
      "en-IN",
    )}
  </strong>

  {discount > 0 && (
    <em className="shop-discount">
      -{discount}%
    </em>
  )}
</div>

                          {format ===
                            "poster" &&
                            availableSizes.length >
                              0 && (
                              <div className="shop-available-sizes">
                                {POSTER_SIZES.map(
                                  (
                                    item,
                                  ) => {
                                    const available =
                                      availableSizes.includes(
                                        item,
                                      );

                                    return (
                                      <span
                                        key={
                                          item
                                        }
                                        className={
                                          available
                                            ? "available"
                                            : ""
                                        }
                                      >
                                        {
                                          item
                                        }
                                      </span>
                                    );
                                  },
                                )}
                              </div>
                            )}

                          {format ===
                            "panel" && (
                            <div className="shop-panel-availability">
                              <span>
                                {product.panel_split_count ??
                                  3}
                                -piece
                                continuous
                                artwork
                              </span>

                              <strong>
                                {
                                  panelSize
                                }
                              </strong>
                            </div>
                          )}

                        </div>
                      </Link>
                    </motion.article>
                  );
                },
              )}
            </div>

          ) : (

            /* EMPTY */

            <div className="shop-empty-state">
              <div className="shop-empty-icon">
                Z
              </div>

              <h3>
                No posters found
              </h3>

              <p>
                Try another category,
                size or search term.
              </p>

              <button
                type="button"
                onClick={
                  resetFilters
                }
              >
                RESET FILTERS
              </button>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}