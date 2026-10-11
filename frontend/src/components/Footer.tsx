import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="zavyro-footer">
      <div className="z-container">
        <div className="footer-main">

          {/* BRAND */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Zavyro Posters Home">
              <span className="footer-logo-mark">Z</span>

              <span className="footer-logo-text">
                <strong>ZAVYRO</strong>
                <small>POSTERS</small>
              </span>
            </Link>

            <p>
              Premium posters for your walls, your space and your story.
              Discover art, culture and designs made to stand out.
            </p>

            <div className="footer-socials">
              <a
                href="https://www.instagram.com/zavyro_ces"
                target="_blank"
                rel="noreferrer"
                aria-label="Zavyro Instagram"
              >
                IG
              </a>

              <a
                href="mailto:zavyroces@gmail.com"
                aria-label="Email Zavyro"
              >
                @
              </a>
            </div>
          </div>

          {/* SHOP */}
          <div className="footer-column">
            <h3>SHOP</h3>

            <Link to="/shop">All Posters</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/random">Random</Link>
            <Link to="/offers">Offers</Link>
            <Link to="/combos">Combos</Link>
            <Link to="/customize">Custom Posters</Link>
          </div>

          {/* CUSTOMER */}
          <div className="footer-column">
            <h3>CUSTOMER</h3>

            <Link to="/cart">Cart</Link>
            <Link to="/account">My Account</Link>
            <Link to="/checkout">Checkout</Link>
            <Link to="/contact">Contact Us</Link>
          </div>

          {/* SUPPORT */}
          <div className="footer-column">
            <h3>SUPPORT</h3>

            <Link to="/shipping">Shipping</Link>
            <Link to="/returns">Returns & Refunds</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </div>
        </div>

        {/* NEWSLETTER */}
        <div className="footer-newsletter">
          <div className="footer-newsletter-copy">
            <span>STAY IN THE LOOP</span>
            <h2>Get the latest from <em>Zavyro.</em></h2>
            <p>
              New drops, exclusive offers and fresh poster collections.
            </p>
          </div>

          <form
            className="footer-newsletter-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>

            <input
              id="footer-email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
            />

            <button type="submit">
              SUBSCRIBE
              <span>↗</span>
            </button>
          </form>
        </div>

        {/* TRUST */}
        <div className="footer-trust">
          <div className="footer-trust-item">
            <span>✓</span>
            <div>
              <strong>Secure Payments</strong>
              <small>Safe & encrypted checkout</small>
            </div>
          </div>

          <div className="footer-trust-item">
            <span>✓</span>
            <div>
              <strong>Premium Prints</strong>
              <small>Quality-focused printing</small>
            </div>
          </div>

          <div className="footer-trust-item">
            <span>✓</span>
            <div>
              <strong>Multiple Sizes</strong>
              <small>A3 · A4 · A5 · A6</small>
            </div>
          </div>

          <div className="footer-trust-item">
            <span>✓</span>
            <div>
              <strong>Made for You</strong>
              <small>Custom poster options</small>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © {year} Zavyro Posters. All rights reserved.
          </div>

          <div className="footer-bottom-center">
            ART <span>•</span> DESIGN <span>•</span> CULTURE
          </div>

          <div className="footer-made">
            Made with <span>✦</span> by Zavyro
          </div>
        </div>
      </div>
    </footer>
  );
}