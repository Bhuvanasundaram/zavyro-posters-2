// ============================================================
// ZAVYRO POSTERS 2.0
// PRODUCT PAGE
// Mobile-first
// Single Poster + Continuous 3-Piece Panel
// ============================================================

import { motion } from "framer-motion";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import PosterDisplay from "../components/PosterDisplay";

import type {
  PanelSize,
  PosterSize,
  Product,
  ProductCategory,
} from "../services/shopContent";

import { useCart } from "../context/CartContext";

import "./ProductPage.css";

export default function ProductPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();

  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [imageIsLandscape, setImageIsLandscape] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoadingProduct(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com"}/api/shop/products`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load product.");
        }

        const apiProduct = (result.products ?? []).find(
          (item: { id?: string }) => item.id === productId,
        );

        if (!apiProduct) {
          if (!cancelled) setProduct(undefined);
          return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";
        const resolveImage = (value: string | null | undefined) => {
          if (!value) return "";
          if (/^https?:\/\//i.test(value)) return value;
          return `${apiUrl}${value.startsWith("/") ? "" : "/"}${value}`;
        };

        const normalSizes = (apiProduct.sizes ?? [])
          .filter((item: { size_code?: string }) =>
            ["A3", "A4", "A5", "A6"].includes(item.size_code ?? ""),
          )
          .map((item: {
            size_code: PosterSize;
            original_price?: number | string;
            offer_price?: number | string;
            price?: number | string;
            is_available?: boolean;
          }) => ({
            size: item.size_code,
            price: Number(item.original_price ?? item.price ?? 0),
            offerPrice: Number(item.offer_price ?? item.price ?? 0),
            available: item.is_available !== false,
          }));

        const panelSizes = (apiProduct.sizes ?? [])
          .filter((item: { size_code?: string }) =>
            ["A5_PANEL", "A4_PANEL"].includes(item.size_code ?? ""),
          )
          .map((item: { size_code: string; is_available?: boolean }) => ({
            size: item.size_code === "A5_PANEL" ? "A5" as PanelSize : "A4" as PanelSize,
            available: item.is_available !== false,
          }));

        const mapped: Product = {
          id: apiProduct.id,
          title: apiProduct.name,
          category: (apiProduct.category_name || "Aesthetic") as ProductCategory,
          subcategory: apiProduct.subcategory_name || undefined,
          image: resolveImage(apiProduct.main_image),
          description: apiProduct.description || "",
          featured: Boolean(apiProduct.is_featured),
          tags: String(apiProduct.search_keywords || "")
            .split(",")
            .map((tag: string) => tag.trim())
            .filter(Boolean),
          sizes: normalSizes,
          panelSupported:
            Number(apiProduct.panel_split_count ?? 0) >= 2 &&
            panelSizes.length > 0,
          panelSizes,
        };

        if (!cancelled) setProduct(mapped);
      } catch {
        if (!cancelled) setProduct(undefined);
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const initialPanel =
    searchParams.get("format") === "panel";

  useEffect(() => {
    if (!product?.image) {
      setImageIsLandscape(false);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setImageIsLandscape(
          image.naturalWidth > image.naturalHeight,
        );
      }
    };
    image.onerror = () => {
      if (!cancelled) setImageIsLandscape(false);
    };
    image.src = product.image;

    return () => {
      cancelled = true;
    };
  }, [product?.image]);

  /*
   * ----------------------------------------------------------
   * AVAILABLE NORMAL SIZES
   * ----------------------------------------------------------
   */

  const availablePosterSizes = useMemo(() => {
    if (!product) {
      return [];
    }

    return product.sizes.filter(
      (item) => item.available,
    );
  }, [product]);

  /*
   * ----------------------------------------------------------
   * AVAILABLE PANEL SIZES
   * ----------------------------------------------------------
   */

  const availablePanelSizes = useMemo(() => {
    if (!product?.panelSizes) {
      return [];
    }

    return product.panelSizes.filter(
      (item) => item.available,
    );
  }, [product]);

  /*
   * ----------------------------------------------------------
   * DEFAULT SIZE
   * ----------------------------------------------------------
   */

  const defaultPosterSize: PosterSize =
    availablePosterSizes[0]?.size ?? "A4";

  const defaultPanelSize: PanelSize =
    availablePanelSizes[0]?.size ?? "A4";

  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  const [mode, setMode] = useState<
    "poster" | "panel"
  >(
    "poster",
  );

  const panelAvailable =
    Boolean(
      product?.panelSupported &&
      imageIsLandscape &&
      availablePanelSizes.length > 0,
    );

  useEffect(() => {
    if (!panelAvailable) {
      setMode("poster");
      return;
    }

    if (initialPanel) {
      setMode("panel");
    }
  }, [initialPanel, panelAvailable]);

  const [posterSize, setPosterSize] =
    useState<PosterSize>(
      defaultPosterSize,
    );

  const [panelSize, setPanelSize] =
    useState<PanelSize>(
      defaultPanelSize,
    );

  const [quantity, setQuantity] =
    useState(1);

  const [addedMessage, setAddedMessage] =
    useState(false);

  /*
   * ----------------------------------------------------------
   * PRICES
   * ----------------------------------------------------------
   */

  const normalPrice = product?.sizes.find(
    (item) => item.size === posterSize,
  );

  const panelPrice = panelAvailable
    ? (() => {
        const normal = product?.sizes.find(
          (item) => item.size === panelSize,
        );

        if (!normal) return undefined;

        return {
          originalPrice: normal.price * 3,
          offerPrice: normal.offerPrice * 3,
        };
      })()
    : undefined;

  const activePrice =
    mode === "panel"
      ? panelPrice
        ? {
            originalPrice:
              panelPrice.originalPrice,
            offerPrice:
              panelPrice.offerPrice,
          }
        : null
      : normalPrice
        ? {
            originalPrice:
              normalPrice.price,
            offerPrice:
              normalPrice.offerPrice,
          }
        : null;

  /*
   * ----------------------------------------------------------
   * DISCOUNT
   * ----------------------------------------------------------
   */

  const discount =
    activePrice &&
    activePrice.originalPrice >
      activePrice.offerPrice
      ? Math.round(
          ((activePrice.originalPrice -
            activePrice.offerPrice) /
            activePrice.originalPrice) *
            100,
        )
      : 0;

  /*
   * ----------------------------------------------------------
   * ADD TO CART
   * ----------------------------------------------------------
   */

  const handleAddToCart = () => {
    if (!product || !activePrice) {
      return;
    }

    addToCart({
      product,
      size:
        mode === "panel"
          ? panelSize
          : posterSize,
      format:
        mode === "panel"
          ? "panel"
          : "single",
      quantity,
    });

    setAddedMessage(true);

    window.setTimeout(() => {
      setAddedMessage(false);
    }, 2200);
  };

  /*
   * ----------------------------------------------------------
   * NOT FOUND
   * ----------------------------------------------------------
   */

  if (loadingProduct) {
    return (
      <div className="product-not-found">
        <div className="product-not-found-inner">
          <span>Z</span>
          <h1>Loading poster...</h1>
          <p>Please wait while we load this poster.</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <div className="product-not-found-inner">
          <span>Z</span>

          <h1>
            Poster not found
          </h1>

          <p>
            The poster you're looking for
            doesn't exist.
          </p>

          <Link to="/shop">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * PRODUCT PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="product-page">
      <div className="z-container">
        {/* ==================================================
            BREADCRUMBS
        ================================================== */}

        <div className="product-breadcrumbs">
          <Link to="/">
            Home
          </Link>

          <span>/</span>

          <Link to="/shop">
            Shop
          </Link>

          <span>/</span>

          <span className="product-breadcrumb-current">
            {product.title}
          </span>
        </div>

        {/* ==================================================
            PRODUCT
        ================================================== */}

        <section className="product-main">
          {/* =================================================
              VISUAL
          ================================================= */}

          <motion.div
            className="product-visual-column"
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.45,
            }}
          >
            <div className="product-visual">
              {mode === "poster" ? (
                <img
                  className="product-main-image"
                  src={product.image}
                  alt={product.title}
                  loading="eager"
                  draggable={false}
                />
              ) : (
                <PosterDisplay
                  image={product.image}
                  title={product.title}
                  mode={mode}
                  posterSize={posterSize}
                  panelSize={panelSize}
                  priority
                  interactive
                />
              )}
            </div>

            {mode === "panel" && (
              <div className="product-panel-note">
                <div className="product-panel-note-icon">
                  <span>3</span>
                </div>

                <div>
                  <strong>
                    One artwork. Three pieces.
                  </strong>

                  <p>
                    The same artwork continues
                    naturally across all three
                    panels with a small gap
                    between each piece.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* =================================================
              DETAILS
          ================================================= */}

          <motion.div
            className="product-details"
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.45,
              delay: 0.05,
            }}
          >
            {/* CATEGORY */}

            <div className="product-category">
              <span>
                {product.category}
              </span>

              {product.subcategory && (
                <>
                  <b>•</b>

                  <span>
                    {product.subcategory}
                  </span>
                </>
              )}
            </div>

            {/* TITLE */}

            <h1>
              {product.title}
            </h1>

            {/* RATING */}

            {typeof product.rating ===
              "number" && (
              <div className="product-rating">
                <span className="product-rating-star">
                  ★
                </span>

                <strong>
                  {product.rating.toFixed(1)}
                </strong>

                <span>
                  {product.reviews ?? 0} reviews
                </span>
              </div>
            )}

            {/* DESCRIPTION */}

            <p className="product-description">
              {product.description}
            </p>

            <div className="product-divider" />

            {/* =================================================
                FORMAT
            ================================================= */}

            <div className="product-format-block">
              <div className="product-section-label">
                FORMAT
              </div>

              <div className="product-format-buttons">
                <button
                  type="button"
                  className={
                    mode === "poster"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setMode("poster");
                    setAddedMessage(false);
                  }}
                >
                  <span className="product-format-radio">
                    {mode === "poster" && (
                      <i />
                    )}
                  </span>

                  <span className="product-format-copy">
                    <strong>
                      Single Poster
                    </strong>

                    <small>
                      One physical poster
                    </small>
                  </span>
                </button>

                {panelAvailable && (
                    <button
                      type="button"
                      className={
                        mode === "panel"
                          ? "active"
                          : ""
                      }
                      onClick={() => {
                        if (!panelAvailable) return;
                        setMode("panel");
                        setAddedMessage(false);
                      }}
                    >
                      <span className="product-format-radio">
                        {mode === "panel" && (
                          <i />
                        )}
                      </span>

                      <span className="product-format-copy">
                        <strong>
                          3-Piece Panel
                        </strong>

                        <small>
                          One artwork • 3 pieces
                        </small>
                      </span>

                      <em>
                        SPECIAL
                      </em>
                    </button>
                  )}
              </div>
            </div>

            {/* =================================================
                NORMAL SIZE
            ================================================= */}

            {mode === "poster" && (
              <div className="product-option-block">
                <div className="product-option-heading">
                  <div>
                    <span>
                      POSTER SIZE
                    </span>

                    <small>
                      Choose your print size
                    </small>
                  </div>

                  <strong>
                    {posterSize}
                  </strong>
                </div>

                <div className="product-size-options">
                  {availablePosterSizes.map(
                    (item) => (
                      <button
                        key={item.size}
                        type="button"
                        className={
                          posterSize ===
                          item.size
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setPosterSize(
                            item.size,
                          );
                          setAddedMessage(false);
                        }}
                      >
                        <strong>
                          {item.size}
                        </strong>

                        <span>
                          ₹{item.offerPrice}
                        </span>

                        {posterSize ===
                          item.size && (
                          <i className="product-selected-mark">
                            ✓
                          </i>
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                PANEL SIZE
            ================================================= */}

            {mode === "panel" && (
              <div className="product-option-block">
                <div className="product-option-heading">
                  <div>
                    <span>
                      PANEL SIZE
                    </span>

                    <small>
                      Three equal physical panels
                    </small>
                  </div>

                  <strong>
                    3 × {panelSize}
                  </strong>
                </div>

                <div className="product-size-options product-panel-size-options">
                  {availablePanelSizes.map(
                    (item) => {
                      const baseSize =
                        product.sizes.find(
                          (size) =>
                            size.size === item.size,
                        );

                      const prices = baseSize
                        ? {
                            originalPrice:
                              baseSize.price * 3,
                            offerPrice:
                              baseSize.offerPrice * 3,
                          }
                        : undefined;

                      if (!prices) {
                        return null;
                      }

                      return (
                        <button
                          key={item.size}
                          type="button"
                          className={
                            panelSize ===
                            item.size
                              ? "active"
                              : ""
                          }
                          onClick={() => {
                            setPanelSize(
                              item.size,
                            );
                            setAddedMessage(false);
                          }}
                        >
                          <strong>
                            3 × {item.size}
                          </strong>

                          <span>
                            ₹
                            {
                              prices.offerPrice
                            }
                          </span>

                          {panelSize ===
                            item.size && (
                            <i className="product-selected-mark">
                              ✓
                            </i>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="product-panel-price-explain">
                  Panel price =
                  <strong>
                    {" "}
                    3 × individual poster price
                  </strong>
                </div>
              </div>
            )}

            {/* =================================================
                PRICE
            ================================================= */}

            {activePrice && (
              <div className="product-price-box">
                <div className="product-price-main">
                  <span>
                    ₹{activePrice.offerPrice}
                  </span>

                  {activePrice.originalPrice >
                    activePrice.offerPrice && (
                    <del>
                      ₹
                      {
                        activePrice.originalPrice
                      }
                    </del>
                  )}

                  {discount > 0 && (
                    <b>
                      {discount}% OFF
                    </b>
                  )}
                </div>

                <small>
                  Inclusive of poster printing
                </small>
              </div>
            )}

            {/* =================================================
                PURCHASE
            ================================================= */}

            <div className="product-purchase-row">
              <div className="product-quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity(
                      Math.max(
                        1,
                        quantity - 1,
                      ),
                    )
                  }
                >
                  −
                </button>

                <span>
                  {quantity}
                </span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity(
                      quantity + 1,
                    )
                  }
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={
                  addedMessage
                    ? "product-add-cart added"
                    : "product-add-cart"
                }
                onClick={
                  handleAddToCart
                }
                disabled={!activePrice}
              >
                <span>
                  {addedMessage
                    ? "Added to Cart"
                    : "Add to Cart"}
                </span>

                <b>
                  {addedMessage
                    ? "✓"
                    : "→"}
                </b>
              </button>
            </div>

            {/* =================================================
                MOBILE CART ACTION
            ================================================= */}

            {addedMessage && (
              <Link
                to="/cart"
                className="product-view-cart"
              >
                View Cart
                <span>→</span>
              </Link>
            )}

            {/* =================================================
                BENEFITS
            ================================================= */}

            <div className="product-benefits">
              <div>
                <span>✓</span>

                <div>
                  <strong>
                    Premium print
                  </strong>

                  <small>
                    Designed for wall display
                  </small>
                </div>
              </div>

              <div>
                <span>✓</span>

                <div>
                  <strong>
                    Carefully packed
                  </strong>

                  <small>
                    Protected during delivery
                  </small>
                </div>
              </div>

              {mode === "panel" && (
                <div>
                  <span>✓</span>

                  <div>
                    <strong>
                      Continuous artwork
                    </strong>

                    <small>
                      One image across 3 pieces
                    </small>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ====================================================
            DESCRIPTION
        ==================================================== */}

        <section className="product-description-section">
          <div>
            <span>
              ABOUT THIS DESIGN
            </span>

            <h2>
              Made for your wall.
            </h2>
          </div>

          <p>
            {product.description} Zavyro Posters
            focuses on clean artwork presentation,
            premium visual composition and a display
            that feels like a real piece of wall art
            rather than a flat product thumbnail.
          </p>
        </section>
      </div>
    </div>
  );
}