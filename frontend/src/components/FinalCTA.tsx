import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./FinalCTA.css";

export default function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="final-cta-noise" />
      <div className="final-cta-glow final-cta-glow-one" />
      <div className="final-cta-glow final-cta-glow-two" />

      <div className="z-container final-cta-container">
        <motion.div
          className="final-cta-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="final-cta-eyebrow">
            ZAVYRO POSTERS
          </span>

          <h2>
            MAKE YOUR
            <br />
            WALL <span>YOURS.</span>
          </h2>

          <p>
            Discover posters made for your world — or create
            something completely personal.
          </p>

          <div className="final-cta-actions">
            <Link
              to="/shop"
              className="final-cta-primary"
            >
              SHOP POSTERS
              <span>↗</span>
            </Link>

            <Link
              to="/surprise-me"
              className="final-cta-secondary"
            >
              SURPRISE ME
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="final-cta-mark"
          initial={{ opacity: 0, scale: 0.75, rotate: -12 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 0.9,
            delay: 0.12,
            ease: "easeOut",
          }}
        >
          <div className="final-cta-ring final-ring-one" />
          <div className="final-cta-ring final-ring-two" />

          <div className="final-cta-z">
            Z
          </div>

          <span className="final-cta-label">
            ART • DESIGN • CULTURE
          </span>
        </motion.div>
      </div>
    </section>
  );
}