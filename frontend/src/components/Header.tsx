import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const { itemCount } = useCart();
  const { user } = useAuth();

  const closeMenu = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest(".mobile-menu")) {
      active.blur();
    }
    setMenuOpen(false);
  };

  const closeTheme = () => {
    setThemeOpen(false);
  };

  const selectTheme = (nextTheme: "dark" | "light" | "system") => {
    setTheme(nextTheme);
    setThemeOpen(false);
  };

  return (
    <>
      <header className="site-header">
        <div className="z-container site-header-inner">

          {/* MOBILE MENU */}
          <button
            type="button"
            className={`mobile-menu-button ${menuOpen ? "is-open" : ""}`}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          {/* BRAND */}
          <Link
            to="/"
            className="brand"
            onClick={() => {
              closeMenu();
              closeTheme();
            }}
            aria-label="Zavyro Posters Home"
          >
            <span className="brand-mark">Z</span>

            <span className="brand-text">
              <strong>ZAVYRO</strong>
              <small>POSTERS</small>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav
            className="site-nav"
            aria-label="Main navigation"
          >
            <NavItem to="/" label="Home" end />

            <NavItem
              to="/shop"
              label="Shop"
            />

            <NavItem
              to="/customize"
              label="Customize"
            />

            <NavItem
              to="/random"
              label="Random"
            />

            <NavItem
              to="/offers"
              label="Offers"
            />

            <NavItem
              to="/combos"
              label="Combos"
            />

            <NavItem
              to="/track-order"
              label="Track Order"
            />
          </nav>

          {/* HEADER ACTIONS */}
          <div className="site-header-actions">

            {/* THEME SWITCHER */}
            <div className="theme-switcher">
              <button
                type="button"
                className="theme-trigger"
                aria-label="Change theme"
                aria-haspopup="menu"
                aria-expanded={themeOpen}
                onClick={() =>
                  setThemeOpen((current) => !current)
                }
              >
                <ThemeIcon theme={theme} />

                <span className="theme-trigger-label">
                  {theme === "dark"
                    ? "Dark"
                    : theme === "light"
                      ? "Light"
                      : "System"}
                </span>

                <ChevronIcon />
              </button>

              {themeOpen && (
                <>
                  <button
                    type="button"
                    className="theme-backdrop"
                    aria-label="Close theme menu"
                    onClick={closeTheme}
                  />

                  <div
                    className="theme-menu"
                    role="menu"
                    aria-label="Choose appearance"
                  >
                    <div className="theme-menu-heading">
                      <span>APPEARANCE</span>
                      <small>
                        Choose your Zavyro look
                      </small>
                    </div>

                    <ThemeOption
                      value="dark"
                      label="Dark"
                      description="Zavyro signature"
                      active={theme === "dark"}
                      icon={<MoonIcon />}
                      onClick={() =>
                        selectTheme("dark")
                      }
                    />

                    <ThemeOption
                      value="light"
                      label="Light"
                      description="Bright & clean"
                      active={theme === "light"}
                      icon={<SunIcon />}
                      onClick={() =>
                        selectTheme("light")
                      }
                    />

                    <ThemeOption
                      value="system"
                      label="System"
                      description="Follow your device"
                      active={theme === "system"}
                      icon={<SystemIcon />}
                      onClick={() =>
                        selectTheme("system")
                      }
                    />
                  </div>
                </>
              )}
            </div>

            {/* ACCOUNT */}
            <Link
              to={user ? (user.role === "customer" ? "/account" : "/admin") : "/login"}
              className="header-account"
              aria-label="My Account"
              onClick={closeTheme}
            >
              <UserIcon />
              <span>{user ? "Account" : "Sign In"}</span>
            </Link>

            {/* CART */}
            <Link
              to="/cart"
              className="header-cart"
              aria-label={
                itemCount > 0
                  ? `Shopping cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`
                  : "Shopping cart"
              }
              onClick={closeTheme}
            >
              <CartIcon />

              <span className="header-cart-label">
                Cart
              </span>

              {itemCount > 0 && (
                <span className="header-cart-count">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div
        className={`mobile-menu-overlay ${
          menuOpen ? "is-visible" : ""
        }`}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />

      {/* MOBILE DRAWER */}
      <aside
        className={`mobile-menu ${
          menuOpen ? "is-open" : ""
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-header">
          <span>MENU</span>

          <button
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <nav className="mobile-nav">

          <MobileNavItem
            to="/"
            label="Home"
            onClick={closeMenu}
            end
          />

          <MobileNavItem
            to="/shop"
            label="Shop"
            onClick={closeMenu}
          />

          <MobileNavItem
            to="/customize"
            label="Customize Your Poster"
            onClick={closeMenu}
          />

          <MobileNavItem
            to="/random"
            label="Random"
            onClick={closeMenu}
          />

          <MobileNavItem
            to="/offers"
            label="Offers"
            onClick={closeMenu}
          />

          <MobileNavItem
            to="/combos"
            label="Combos"
            onClick={closeMenu}
          />

          <div className="mobile-nav-divider" />

          <MobileNavItem
            to="/account"
            label="My Account"
            onClick={closeMenu}
          />

          <MobileNavItem
            to="/cart"
            label={
              itemCount > 0
                ? `Shopping Cart (${itemCount})`
                : "Shopping Cart"
            }
            onClick={closeMenu}
          />
        </nav>

        {/* MOBILE THEME */}
        <div className="mobile-theme-section">
          <div className="mobile-theme-heading">
            <span>APPEARANCE</span>
            <small>Choose theme</small>
          </div>

          <div className="mobile-theme-options">
            <MobileThemeButton
              active={theme === "dark"}
              label="Dark"
              icon={<MoonIcon />}
              onClick={() =>
                selectTheme("dark")
              }
            />

            <MobileThemeButton
              active={theme === "light"}
              label="Light"
              icon={<SunIcon />}
              onClick={() =>
                selectTheme("light")
              }
            />

            <MobileThemeButton
              active={theme === "system"}
              label="System"
              icon={<SystemIcon />}
              onClick={() =>
                selectTheme("system")
              }
            />
          </div>
        </div>

        <div className="mobile-menu-footer">
          <span>ART • DESIGN • CULTURE</span>
          <small>ZAVYRO POSTERS</small>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   DESKTOP NAV ITEM
   ========================================================= */

function NavItem({
  to,
  label,
  end = false,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `site-nav-link ${isActive ? "active" : ""}`
      }
    >
      {label}
    </NavLink>
  );
}

/* =========================================================
   MOBILE NAV ITEM
   ========================================================= */

function MobileNavItem({
  to,
  label,
  onClick,
  end = false,
}: {
  to: string;
  label: string;
  onClick: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `mobile-nav-link ${isActive ? "active" : ""}`
      }
    >
      <span>{label}</span>

      <span className="mobile-nav-arrow">
        →
      </span>
    </NavLink>
  );
}

/* =========================================================
   THEME OPTION
   ========================================================= */

function ThemeOption({
  value,
  label,
  description,
  active,
  icon,
  onClick,
}: {
  value: "dark" | "light" | "system";
  label: string;
  description: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      data-theme-value={value}
      className={`theme-option ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <span className="theme-option-icon">
        {icon}
      </span>

      <span className="theme-option-text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>

      <span className="theme-option-check">
        {active ? "✓" : ""}
      </span>
    </button>
  );
}

/* =========================================================
   MOBILE THEME BUTTON
   ========================================================= */

function MobileThemeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mobile-theme-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* =========================================================
   THEME ICON
   ========================================================= */

function ThemeIcon({
  theme,
}: {
  theme: "dark" | "light" | "system";
}) {
  if (theme === "light") {
    return <SunIcon />;
  }

  if (theme === "system") {
    return <SystemIcon />;
  }

  return <MoonIcon />;
}

/* =========================================================
   MOON ICON
   ========================================================= */

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="theme-icon"
    >
      <path d="M20.5 15.2A8.6 8.6 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z" />
    </svg>
  );
}

/* =========================================================
   SUN ICON
   ========================================================= */

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="theme-icon"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  );
}

/* =========================================================
   SYSTEM ICON
   ========================================================= */

function SystemIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="theme-icon"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
      />

      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

/* =========================================================
   CHEVRON
   ========================================================= */

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="theme-chevron"
    >
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

/* =========================================================
   USER ICON
   ========================================================= */

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="header-icon"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
      />

      <path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2" />
    </svg>
  );
}

/* =========================================================
   CART ICON
   ========================================================= */

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="header-icon"
    >
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />

      <circle
        cx="10"
        cy="20"
        r="1.2"
      />

      <circle
        cx="18"
        cy="20"
        r="1.2"
      />
    </svg>
  );
}