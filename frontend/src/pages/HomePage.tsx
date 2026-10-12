import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import TrendingPosters from "../components/TrendingPosters";
import CustomerWall from "../components/CustomerWall";
import CustomizeCTA from "../components/CustomizeCTA";
import FinalCTA from "../components/FinalCTA";

import {
  collectionContent,
  defaultHomepageSettings,
  loadHomepageSettings,
  offerContent,
  type HomepageSettings,
} from "../services/homepageContent";

import "./HomePage.css";
import "./HomeSpecialLinks.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function resolveHomepageImage(image?: string | null): string {
  const value = (image || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  if (value.startsWith("/")) return `${API_URL}${value}`;
  return value;
}

/* =========================================================
   MOVING COLLECTION STRIP
========================================================= */

function CollectionMarquee({
  items,
  count,
  speed,
}: {
  items: typeof collectionContent;
  count: number;
  speed: number;
}) {
  const visibleItems = items.slice(0, Math.max(1, count));

  return (
    <section className="collection-marquee-section">
      <div className="collection-marquee-heading">
        <div>
          <span>EXPLORE THE WORLD</span>
          <h2>
            SHOP BY <strong>COLLECTION.</strong>
          </h2>
        </div>
        <Link to="/shop" className="collection-view-all">
          VIEW ALL <span>↗</span>
        </Link>
      </div>

      <div className="collection-marquee" aria-label="Zavyro poster collections">
        <div
          className="collection-marquee-track"
          style={{ "--collection-speed": `${speed}s` } as React.CSSProperties}
        >
          {[0, 1].map((group) => (
            <div
              className="collection-marquee-group"
              key={group}
              aria-hidden={group === 1}
            >
              {visibleItems.map((item) => (
                <Link
                  to={item.link}
                  className="collection-marquee-card"
                  key={`${group}-${item.id}`}
                  draggable={false}
                >
                  <div className="collection-marquee-image">
                    <img src={resolveHomepageImage(item.image)} alt={item.title} loading="lazy" draggable={false} />
                    <div className="collection-marquee-overlay" />
                    <div className="collection-marquee-content">
                      <span>{item.subtitle}</span>
                      <h3>{item.title}</h3>
                      <strong>EXPLORE ↗</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   OFFER TICKER
========================================================= */

function OfferTicker({
  count,
  speed,
  items,
}: {
  count: number;
  speed: number;
  items: HomepageSettings["offers"];
}) {
  const visibleOffers = items.length
    ? items.filter((offer) => offer.visible).slice(0, Math.max(1, count)).map((offer) => offer.tag)
    : offerContent.slice(0, Math.max(1, count));
  const offers = [...visibleOffers, ...visibleOffers];

  return (
    <div className="home-offer-ticker">
      <div
        className="home-offer-track"
        style={{ "--offer-speed": `${speed}s` } as React.CSSProperties}
      >
        {offers.map((offer, index) => (
          <span key={`${offer}-${index}`}>
            {offer}<b>✦</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   HOMEPAGE
========================================================= */

export default function HomePage() {
  const [content, setContent] =
    useState<HomepageSettings>(defaultHomepageSettings);

  useEffect(() => {
    let active = true;

    void loadHomepageSettings().then((next) => {
      if (active) {
        setContent(next);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const heroContent = content.hero;

  return (
    <main className="home-page">
      {/* ===================================================
          HERO
      =================================================== */}

      <section className="home-hero">
        <div
          className="home-hero-wall"
          style={{
            backgroundImage: `url("${resolveHomepageImage(heroContent.backgroundImage)}")`,
          }}
        />

        <div className="home-hero-dark" />
        <div className="home-hero-purple" />
        <div className="home-hero-vignette" />

        <div className="z-container home-hero-container">
          <motion.div
            className="home-hero-copy"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="home-hero-eyebrow">
              {heroContent.eyebrow}
            </span>

            <h1>
              {heroContent.headingLineOne}
              <br />
              <span>{heroContent.headingLineTwo}</span>
            </h1>

            <p>{heroContent.description}</p>

            <div className="home-hero-actions">
              <Link to="/shop" className="home-hero-primary">
                {heroContent.primaryButton}
                <span>↗</span>
              </Link>

              <Link to="/customize" className="home-hero-secondary">
                {heroContent.secondaryButton}
              </Link>
            </div>

            <div className="home-hero-meta">
              <span>ART</span>
              <i />
              <span>DESIGN</span>
              <i />
              <span>CULTURE</span>
            </div>
          </motion.div>
        </div>

        <div className="home-hero-scroll">
          <span>SCROLL TO EXPLORE</span>
          <div />
        </div>
      </section>

      {/* ===================================================
          MOVING COLLECTION STRIP
      =================================================== */}

      {content.sections.collections && (
        <CollectionMarquee
          items={content.collections}
          count={content.display.collections.count}
          speed={content.display.collections.speed}
        />
      )}

      {/* ===================================================
          OFFER BAR
      =================================================== */}

      {content.sections.offers && (
        <>
          <OfferTicker
            count={content.display.offers.count}
            speed={content.display.offers.speed}
            items={content.offers}
          />
          <section className="home-special-links" aria-label="Offers and combos">
            <div className="home-special-links-inner">
              <div>
                <span>DEALS & WALL SETS</span>
                <strong>Shop smarter.</strong>
              </div>
              <div className="home-special-link-list">
                <Link to="/offers">Offers <b>↗</b></Link>
                <Link to="/combos">Combos <b>↗</b></Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===================================================
          TRENDING
      =================================================== */}

      {content.sections.trending && (
        <TrendingPosters
          posters={content.trendingPosters}
          count={content.display.trending.count}
          speed={content.display.trending.speed}
        />
      )}

      {/* ===================================================
          CUSTOMER REVIEWS
      =================================================== */}

      {content.sections.reviews || content.sections.fanMedia ? (
        <CustomerWall
          reviews={content.reviews}
          fanMedia={content.fanMedia}
          showReviews={content.sections.reviews}
          showFanMedia={content.sections.fanMedia}
          reviewCount={content.display.reviews.count}
          reviewSpeed={content.display.reviews.speed}
          mediaCount={content.display.fanMedia.count}
          mediaSpeed={content.display.fanMedia.speed}
        />
      ) : null}

      {/* ===================================================
          CUSTOM POSTER CTA
      =================================================== */}

      {content.sections.customizeCta && <CustomizeCTA />}

      {/* ===================================================
          FINAL CTA
      =================================================== */}

      {content.sections.finalCta && <FinalCTA />}
    </main>
  );
}