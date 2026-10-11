import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartPage.css";

const DELIVERY_CHARGE = 50;
const FREE_DELIVERY_THRESHOLD = 500;

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const delivery =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

  const total = subtotal + delivery;

  const originalTotal = items.reduce(
    (sum, item) =>
      sum + item.originalUnitPrice * item.quantity,
    0,
  );

  const savings = Math.max(0, originalTotal - subtotal);

  if (!items.length) {
    return (
      <section className="old-cart-page">
        <div className="old-cart-shell">
          <div className="old-cart-empty">
            <div className="old-cart-empty-logo">Z</div>

            <span className="old-cart-kicker">
              ZAVYRO CART
            </span>

            <h1>Your cart is empty</h1>

            <p>
              Looks like you haven't added any posters yet.
              Discover something you love and make it yours.
            </p>

            <Link
              to="/shop"
              className="old-cart-primary-button"
            >
              SHOP POSTERS
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="old-cart-page">
      <div className="old-cart-shell">

        <header className="old-cart-header">
          <div>
            <span className="old-cart-kicker">
              ZAVYRO CART
            </span>

            <h1>Your Cart</h1>

            <p>
              {itemCount}{" "}
              {itemCount === 1 ? "item" : "items"} in your
              collection.
            </p>
          </div>

          <Link
            to="/shop"
            className="old-cart-back-shop"
          >
            ← Continue Shopping
          </Link>
        </header>

        <div className="old-cart-layout">

          <div className="old-cart-items">

            {items.map((item) => {
              const lineTotal =
                item.unitPrice * item.quantity;

              const lineOriginal =
                item.originalUnitPrice * item.quantity;

              const lineSaving = Math.max(
                0,
                lineOriginal - lineTotal,
              );

              return (
                <article
                  className="old-cart-item"
                  key={item.id}
                >
                  <div className="old-cart-product-image">

                    <img
                      src={item.image}
                      alt={item.title}
                    />

                  </div>

                  <div className="old-cart-product-info">

                    <div className="old-cart-product-heading">

                      <div>
                        <span className="old-cart-category">
                          {item.category}
                          {item.subcategory
                            ? ` • ${item.subcategory}`
                            : ""}
                        </span>

                        <Link
                          to={`/product/${item.productId}`}
                          className="old-cart-product-title"
                        >
                          {item.title}
                        </Link>
                      </div>

                      <button
                        type="button"
                        className="old-cart-remove"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                      >
                        Remove
                      </button>

                    </div>

                    <div className="old-cart-product-meta">

                      <span>
                        Size: <strong>{item.size}</strong>
                      </span>

                      <span>
                        {item.format === "panel"
                          ? "3-Piece Panel"
                          : "Poster"}
                      </span>

                    </div>

                    <div className="old-cart-price-line">

                      {item.originalUnitPrice >
                        item.unitPrice && (
                        <span className="old-cart-mrp">
                          {money(
                            item.originalUnitPrice,
                          )}
                        </span>
                      )}

                      <span className="old-cart-offer-price">
                        {money(item.unitPrice)}
                      </span>

                    </div>

                    {lineSaving > 0 && (
                      <div className="old-cart-save">
                        Save {money(lineSaving)}
                      </div>
                    )}

                    <div className="old-cart-bottom">

                      <div className="old-cart-quantity">

                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <span>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(item.id)
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </button>

                      </div>

                      <strong className="old-cart-line-total">
                        {money(lineTotal)}
                      </strong>

                    </div>

                  </div>
                </article>
              );
            })}

          </div>

          <aside className="old-cart-summary">

            <div className="old-cart-summary-card">

              <span className="old-cart-summary-kicker">
                ORDER SUMMARY
              </span>

              <h2>Your Collection</h2>

              <div className="old-cart-summary-row">
                <span>Items</span>
                <strong>{itemCount}</strong>
              </div>

              <div className="old-cart-summary-row">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>

              {savings > 0 && (
                <div className="old-cart-summary-row old-cart-saving-row">
                  <span>You save</span>
                  <strong>
                    − {money(savings)}
                  </strong>
                </div>
              )}

              <div className="old-cart-summary-row">
                <span>Delivery</span>

                <strong>
                  {delivery === 0
                    ? "FREE"
                    : money(delivery)}
                </strong>
              </div>

              {delivery > 0 && (
                <div className="old-cart-free-message">
                  Add {money(
                    FREE_DELIVERY_THRESHOLD - subtotal,
                  )}{" "}
                  more for FREE delivery.
                </div>
              )}

              <div className="old-cart-summary-divider" />

              <div className="old-cart-total-row">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>

              <Link
                to="/checkout"
                className="old-cart-checkout-button"
              >
                PROCEED TO CHECKOUT
                <span>→</span>
              </Link>

              <div className="old-cart-secure">
                <span>🔒</span>
                Secure checkout
              </div>

            </div>

          </aside>

        </div>
      </div>
    </section>
  );
}