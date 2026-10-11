import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./CustomizeCTA.css";

const posterImages = [
  "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=700&q=90",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=90",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=90",
];

export default function CustomizeCTA() {
  return (
    <section className="customize-cta">
      <div className="z-container">
        <div className="customize-cta-layout">

          {/* =====================================================
              LEFT / TOP CONTENT
          ===================================================== */}

          <motion.div
            className="customize-cta-content"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65 }}
          >
            <div className="customize-cta-eyebrow">
              <span />
              MAKE IT YOURS
              <span />
            </div>

            <h2>
              CREATE
              <br />
              <strong>YOUR MOMENT.</strong>
            </h2>

            <p>
              Turn your favourite photo into a premium Zavyro poster.
              Upload, adjust and create something made completely for you.
            </p>

            <div className="customize-cta-features">
              <div className="customize-cta-feature">
                <b>✓</b>
                <span>Easy Upload</span>
              </div>

              <div className="customize-cta-feature">
                <b>✓</b>
                <span>A3 — A6</span>
              </div>

              <div className="customize-cta-feature">
                <b>✓</b>
                <span>Free Adjustment</span>
              </div>
            </div>

            <div className="customize-cta-actions">
              <Link
                to="/customize"
                className="customize-cta-primary"
              >
                CREATE YOUR POSTER
                <span>↗</span>
              </Link>

              <Link
                to="/shop"
                className="customize-cta-secondary"
              >
                SHOP POSTERS
              </Link>
            </div>
          </motion.div>

          {/* =====================================================
              RIGHT / POSTER VISUAL
          ===================================================== */}

          <motion.div
            className="customize-cta-visual"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
          >
            <div className="customize-cta-orbit customize-cta-orbit-one" />
            <div className="customize-cta-orbit customize-cta-orbit-two" />

            <div className="customize-cta-poster customize-cta-poster-left">
              <img
                src={posterImages[0]}
                alt=""
                draggable={false}
              />
            </div>

            <div className="customize-cta-poster customize-cta-poster-center">
              <img
                src={posterImages[1]}
                alt="Custom Zavyro poster"
                draggable={false}
              />

              <div className="customize-cta-poster-label">
                <span>Z</span>
                <div>
                  <strong>ZAVYRO</strong>
                  <small>YOUR STORY</small>
                </div>
              </div>
            </div>

            <div className="customize-cta-poster customize-cta-poster-right">
              <img
                src={posterImages[2]}
                alt=""
                draggable={false}
              />
            </div>

            <div className="customize-cta-floating customize-cta-floating-top">
              <span>✦</span>
              <div>
                <strong>Your photo</strong>
                <small>Made personal</small>
              </div>
            </div>

            <div className="customize-cta-floating customize-cta-floating-bottom">
              <span>↗</span>
              <div>
                <strong>Ready to print</strong>
                <small>A3 · A4 · A5 · A6</small>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}