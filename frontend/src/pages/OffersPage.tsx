import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  defaultHomepageSettings,
  loadHomepageSettings,
  type HomepageOffer,
} from "../services/homepageContent";
import "./OffersPage.css";

export default function OffersPage() {
  const [offers, setOffers] = useState<HomepageOffer[]>(defaultHomepageSettings.offers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadHomepageSettings().then((settings) => {
      if (!active) return;
      setOffers(settings.offers.filter((offer) => offer.visible));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="offers-page">
      <section className="offers-hero">
        <div className="offers-shell">
          <span className="offers-eyebrow">ZAVYRO SPECIALS</span>
          <h1>Offers made for your <span>wall.</span></h1>
          <p>Festival sales, limited deals and Buy X Get Y offers — all in one place.</p>
          <div className="offers-hero-links">
            <Link className="offers-hero-link active" to="/offers">Offers</Link>
            <Link className="offers-hero-link" to="/combos">Combos</Link>
          </div>
        </div>
      </section>

      <section className="offers-shell offers-section">
        <div className="offers-section-head">
          <div>
            <span>01 · OFFERS</span>
            <h2>Pick a deal.</h2>
            <p>Each offer is controlled by Zavyro from the admin panel.</p>
          </div>
          <Link to="/shop">SHOP ALL ↗</Link>
        </div>

        {loading ? (
          <div className="offers-empty">Loading offers...</div>
        ) : (
          <div className="offers-grid">
            {offers.map((offer) => (
              <Link className="offer-card" to={offer.link || "/shop"} key={offer.id}>
                <div className="offer-card-media">
                  <img src={offer.image} alt={offer.title} />
                </div>
                <div className="offer-card-overlay" />
                <div className="offer-card-copy">
                  <span>{offer.tag}</span>
                  <h3>{offer.title}</h3>
                  {offer.kind === "buyXGetY" ? (
                    <strong className="offer-buy-get">BUY {offer.buyQuantity} GET {offer.getQuantity}</strong>
                  ) : (
                    <strong>{offer.priceText}</strong>
                  )}
                  <p>{offer.description}</p>
                  <small>WHY THIS OFFER: {offer.reason}</small>
                </div>
              </Link>
            ))}
            {!offers.length && <div className="offers-empty">No active offers right now.</div>}
          </div>
        )}
      </section>

      <section className="offers-shell offers-bottom-cta">
        <div>
          <span>LOOKING FOR A SET?</span>
          <h2>Build your wall with a combo.</h2>
        </div>
        <Link to="/combos">VIEW COMBOS →</Link>
      </section>
    </main>
  );
}
